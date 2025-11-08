import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateLoginId, generatePassword, hashPassword, comparePassword } from '../utils/helpers.js';
import { handleError, handleValidationError } from '../utils/errorHandler.js';
import { PASSWORD_CONSTANTS } from '../utils/constants.js';

const router = express.Router();

// Company + Admin Registration (Public - First Time Setup Only)
router.post('/register', [
  body('companyName').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('email').isEmail(),
  body('phone').optional(),
  body('password').isLength({ min: PASSWORD_CONSTANTS.MIN_LENGTH }),
  body('confirmPassword').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { companyName, name, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check if company already exists
    const existingCompany = await pool.query('SELECT id FROM company_info LIMIT 1');
    if (existingCompany.rows.length > 0) {
      return res.status(400).json({ error: 'Company already registered. Only Admin/HR can create users.' });
    }

    // Check if email exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create company
    const companyResult = await pool.query(
      `INSERT INTO company_info (company_name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [companyName, email, phone || null]
    );

    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate Login ID
    const loginId = await generateLoginId(firstName, lastName, new Date());

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create Admin user
    const userResult = await pool.query(
      `INSERT INTO users (login_id, email, password, role, is_password_changed)
       VALUES ($1, $2, $3, 'Admin', TRUE)
       RETURNING id, login_id, email, role`,
      [loginId, email, hashedPassword]
    );

    const user = userResult.rows[0];

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Company and Admin registered successfully',
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        role: user.role
      },
      company: companyResult.rows[0]
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Registration');
    res.status(500).json(errorResponse);
  }
});

// Create User/Employee (Admin, HR Officer only) - Auto-generates Login ID and Password
router.post('/create-user', authenticate, authorize('Admin', 'HR Officer'), [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail(),
  body('phone').optional(),
  body('hireDate').optional(),
  body('role').isIn(['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { firstName, lastName, email, phone, hireDate, role } = req.body;

    // Check if email exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate Login ID
    const loginId = await generateLoginId(firstName, lastName, hireDate || new Date());

    // Generate random password
    const generatedPassword = generatePassword();

    // Hash password
    const hashedPassword = await hashPassword(generatedPassword);

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (login_id, email, password, role, is_password_changed)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, login_id, email, role`,
      [loginId, email, hashedPassword, role]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        role: user.role
      },
      password: generatedPassword, // Return password so Admin/HR can share it
      note: 'User must change password on first login'
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Create user');
    res.status(500).json(errorResponse);
  }
});

// Login - Supports Login ID or Email
router.post('/login', [
  body('loginIdOrEmail').notEmpty().trim(),
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { loginIdOrEmail, password } = req.body;

    // Get user by login_id or email
    const userResult = await pool.query(
      'SELECT id, login_id, email, password, role, is_password_changed FROM users WHERE login_id = $1 OR email = $1',
      [loginIdOrEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get employee info if exists
    const employeeResult = await pool.query(
      'SELECT employee_id, first_name, last_name, email FROM employees WHERE user_id = $1',
      [user.id]
    );

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        role: user.role,
        isPasswordChanged: user.is_password_changed,
        employee: employeeResult.rows[0] || null
      },
      requiresPasswordChange: !user.is_password_changed
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Login');
    res.status(500).json(errorResponse);
  }
});

// Change Password (for first-time login or regular password change)
router.post('/change-password', authenticate, [
  body('oldPassword').optional(),
  body('newPassword').isLength({ min: 6 }),
  body('confirmPassword').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, password, is_password_changed FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify old password (skip if first-time login)
    if (user.is_password_changed) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isValidPassword = await comparePassword(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, is_password_changed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({
      message: 'Password changed successfully',
      requiresPasswordChange: false
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Change password');
    res.status(500).json(errorResponse);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, login_id, email, role, is_password_changed FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get employee info if exists
    const employeeResult = await pool.query(
      `SELECT e.* 
       FROM employees e 
       WHERE e.user_id = $1`,
      [req.user.id]
    );

    res.json({
      user: {
        ...user,
        employee: employeeResult.rows[0] || null
      }
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get current user');
    res.status(500).json(errorResponse);
  }
});

// Get all users with employee info (Admin only)
router.get('/users', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.login_id,
        u.email,
        u.role,
        u.created_at,
        e.first_name,
        e.last_name,
        e.employee_id
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get users');
    res.status(500).json(errorResponse);
  }
});

// Update user role (Admin only)
router.put('/users/:userId/role', authenticate, authorize('Admin'), [
  body('role').isIn(['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { userId } = req.params;
    const { role } = req.body;

    // Prevent changing own role
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update role
    const result = await pool.query(
      `UPDATE users 
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, login_id, email, role`,
      [role, userId]
    );

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Update user role');
    res.status(500).json(errorResponse);
  }
});

export default router;

