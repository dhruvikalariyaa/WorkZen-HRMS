import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendEmployeeCredentials } from '../config/email.js';
import { generateEmployeeId, generateLoginId, generatePassword, hashPassword } from '../utils/helpers.js';
import { handleError, handleValidationError } from '../utils/errorHandler.js';
import { PAYROLL_CONSTANTS } from '../utils/constants.js';

const router = express.Router();

// Get all employees (with role-based filtering)
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT e.*, u.login_id, u.email, u.role
      FROM employees e
      LEFT JOIN users u ON e.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    // Employees can view all employees (read-only directory access)
    // Manager can view all employees (read-only)
    // Admin and HR Officer can view all employees (with edit/delete)

    // Search functionality
    if (req.query.search) {
      conditions.push(`(
        e.first_name ILIKE $${params.length + 1} OR
        e.last_name ILIKE $${params.length + 1} OR
        e.employee_id ILIKE $${params.length + 1} OR
        e.email ILIKE $${params.length + 1} OR
        u.login_id ILIKE $${params.length + 1} OR
        u.email ILIKE $${params.length + 1}
      )`);
      params.push(`%${req.query.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get employees');
    res.status(500).json(errorResponse);
  }
});

// Get employees with today's status (for dashboard)
router.get('/with-status', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.profile_image_url,
        e.department,
        e.position,
        a.status as attendance_status,
        a.check_in,
        a.check_out,
        CASE 
          WHEN l.id IS NOT NULL AND l.status = 'Approved' AND CAST($1 AS DATE) BETWEEN l.start_date AND l.end_date THEN 'on_leave'
          WHEN a.status = 'Present' AND a.check_in IS NOT NULL THEN 'present'
          WHEN a.status = 'Absent' OR (a.id IS NULL AND l.id IS NULL) THEN 'absent'
          ELSE 'unknown'
        END as current_status
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = CAST($1 AS DATE)
      LEFT JOIN leaves l ON e.id = l.employee_id 
        AND l.status = 'Approved' 
        AND CAST($1 AS DATE) BETWEEN l.start_date AND l.end_date
    `;
    const params = [today];
    const conditions = [];

    // Employees can only see their own data
    if (req.user.role === 'Employee') {
      conditions.push(`e.user_id = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.first_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get employees with status');
    res.status(500).json(errorResponse);
  }
});

// Get single employee
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Employees can view all employee records (read-only directory access)
    // No restriction - all authenticated users can view employee details

    const result = await pool.query(
      `SELECT e.*, u.username, u.role, u.id as user_id
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Get employee');
    res.status(500).json(errorResponse);
  }
});

// Create employee (Admin, HR Officer only)
router.post('/', authenticate, authorize('Admin', 'HR Officer'), [
  // Sanitize request body - remove employeeId completely (it's auto-generated)
  (req, res, next) => {
    // Always remove employeeId - it's auto-generated
    delete req.body.employeeId;
    // Remove empty email strings
    if (req.body.email === '' || req.body.email === null || req.body.email === undefined) {
      delete req.body.email;
    }
    next();
  },
  // Explicitly allow employeeId to be optional (will be auto-generated)
  body('employeeId').optional().custom(() => true),
  // Explicitly allow email to be optional
  body('email').optional({ checkFalsy: true }).custom((value) => {
    if (!value || value.trim() === '') return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || Promise.reject('Invalid email format');
  }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const {
      employeeId, firstName, lastName, email, phoneNumber, dateOfBirth,
      gender, address, department, position, hireDate, salary
    } = req.body;

    // Auto-generate Employee ID (always generate, ignore if provided)
    const finalEmployeeId = await generateEmployeeId();

    // Check if employee ID already exists
    const existingEmployee = await pool.query(
      'SELECT id FROM employees WHERE employee_id = $1',
      [finalEmployeeId]
    );

    if (existingEmployee.rows.length > 0) {
      // If auto-generated ID exists, generate a new one
      finalEmployeeId = await generateEmployeeId();
      
      // Double-check the new ID
      const checkAgain = await pool.query(
        'SELECT id FROM employees WHERE employee_id = $1',
        [finalEmployeeId]
      );
      
      if (checkAgain.rows.length > 0) {
        return res.status(500).json({ error: 'Failed to generate unique Employee ID' });
      }
    }

    // Handle email - use placeholder if empty
    const finalEmail = email && email.trim() !== '' ? email.trim() : null;
    
    // Check if email exists in employees table (only if email is provided)
    if (finalEmail) {
      const existingEmail = await pool.query(
        'SELECT id FROM employees WHERE email = $1',
        [finalEmail]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Calculate basic salary (80% of total salary)
    const basicSalary = salary ? salary * PAYROLL_CONSTANTS.BASIC_SALARY_PERCENTAGE : 0;

    // Generate Login ID and Password for user account
    const loginId = await generateLoginId(firstName, lastName, hireDate || new Date());
    const generatedPassword = generatePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Get role from request body, default to 'Employee' if not provided
    const userRole = req.body.role || 'Employee';
    
    // Validate role
    const allowedRoles = ['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({ error: 'Invalid role. Allowed roles: Admin, HR Officer, Payroll Officer, Manager, Employee' });
    }

    // Create user account with auto-generated Login ID and password
    // Use loginId as email if email is not provided (for unique constraint)
    const userEmail = finalEmail || `${loginId}@workzen.local`;
    const userResult = await pool.query(
      `INSERT INTO users (login_id, email, password, role, is_password_changed)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, login_id, email, role`,
      [loginId, userEmail, hashedPassword, userRole]
    );

    const userId = userResult.rows[0].id;

    // Create employee linked to user account
    const employeeResult = await pool.query(
      `INSERT INTO employees (
        user_id, employee_id, first_name, last_name, email, phone_number,
        date_of_birth, gender, address, department, position,
        hire_date, salary, basic_salary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId, finalEmployeeId, firstName, lastName, finalEmail, phoneNumber,
        dateOfBirth, gender, address, department, position,
        hireDate, salary, basicSalary
      ]
    );

    res.status(201).json({
      ...employeeResult.rows[0],
      loginId: userResult.rows[0].login_id,
      password: generatedPassword,
      note: 'User account created. Login ID and password generated. User must change password on first login.'
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Create employee');
    res.status(500).json(errorResponse);
  }
});

// Update employee (Admin, HR Officer only - Employees cannot modify)
router.put('/:id', authenticate, authorize('Admin', 'HR Officer'), [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { id } = req.params;

    // Permissions are handled by authorize middleware - only Admin and HR Officer can update

    const {
      firstName, lastName, phoneNumber, dateOfBirth, gender, address,
      department, position, hireDate, salary
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (phoneNumber !== undefined) {
      updateFields.push(`phone_number = $${paramCount++}`);
      values.push(phoneNumber);
    }
    if (dateOfBirth) {
      updateFields.push(`date_of_birth = $${paramCount++}`);
      values.push(dateOfBirth);
    }
    if (gender) {
      updateFields.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (department !== undefined && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`department = $${paramCount++}`);
      values.push(department);
    }
    if (position !== undefined && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`position = $${paramCount++}`);
      values.push(position);
    }
    if (hireDate && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`hire_date = $${paramCount++}`);
      values.push(hireDate);
    }
    if (salary && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`salary = $${paramCount++}`);
      values.push(salary);
      updateFields.push(`basic_salary = $${paramCount++}`);
      values.push(salary * PAYROLL_CONSTANTS.BASIC_SALARY_PERCENTAGE);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Update employee');
    res.status(500).json(errorResponse);
  }
});

// Delete employee (Admin, HR Officer only)
router.delete('/:id', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING user_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete associated user
    await pool.query('DELETE FROM users WHERE id = $1', [result.rows[0].user_id]);

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    const errorResponse = handleError(error, 'Delete employee');
    res.status(500).json(errorResponse);
  }
});

// Send credentials email to employee (Admin, HR Officer only)
router.post('/:id/send-credentials', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get employee and user information
    const employeeResult = await pool.query(
      `SELECT e.*, u.login_id, u.email as user_email
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];
    const loginId = employee.login_id;
    const employeeEmail = employee.email || employee.user_email;

    if (!employeeEmail) {
      return res.status(400).json({ error: 'Employee email not found. Cannot send credentials.' });
    }

    // Get the original password - we need to check if we stored it or generate a new one
    // Since passwords are hashed, we'll need to reset it and send new credentials
    const generatedPassword = generatePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1, is_password_changed = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, employee.user_id]
    );

    // Send email with credentials
    const emailResult = await sendEmployeeCredentials(
      employeeEmail,
      loginId,
      generatedPassword,
      `${employee.first_name} ${employee.last_name}`
    );

    if (emailResult.success) {
      res.json({
        message: 'Credentials email sent successfully',
        emailSent: true,
        loginId: loginId,
        note: 'New password has been generated and sent to employee email. Employee must change password on first login.'
      });
    } else {
      res.status(500).json({
        error: 'Failed to send email',
        details: emailResult.error,
        loginId: loginId,
        password: generatedPassword,
        note: 'Email could not be sent. Please share these credentials manually with the employee.'
      });
    }
  } catch (error) {
    const errorResponse = handleError(error, 'Send credentials');
    res.status(500).json(errorResponse);
  }
});

export default router;

