import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate Login ID based on format: Company initials + Employee name initials + Year + Serial
const generateLoginId = async (firstName, lastName, hireDate) => {
  try {
    // Get company name
    const companyResult = await pool.query('SELECT company_name FROM company_info LIMIT 1');
    if (companyResult.rows.length === 0) {
      throw new Error('Company not registered. Please register company first.');
    }
    
    const companyName = companyResult.rows[0].company_name || 'WORKZEN';
    
    // Get company initials (first 2 letters, uppercase)
    const companyInitials = companyName.substring(0, 2).toUpperCase();
    
    // Get employee name initials (first 2 letters of first name + first 2 letters of last name)
    const firstNameInitials = (firstName || '').substring(0, 2).toUpperCase();
    const lastNameInitials = (lastName || '').substring(0, 2).toUpperCase();
    const nameInitials = firstNameInitials + lastNameInitials;
    
    // Get year from hire date
    const year = hireDate ? new Date(hireDate).getFullYear() : new Date().getFullYear();
    
    // Get serial number for this year
    const serialResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE login_id LIKE $1`,
      [`${companyInitials}${nameInitials}${year}%`]
    );
    const serialNumber = parseInt(serialResult.rows[0].count) + 1;
    
    // Format: OIJODO20220001
    const loginId = `${companyInitials}${nameInitials}${year}${String(serialNumber).padStart(4, '0')}`;
    
    return loginId;
  } catch (error) {
    console.error('Generate Login ID error:', error);
    throw error;
  }
};

// Generate random password
const generatePassword = () => {
  const length = 8;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Company + Admin Registration (Public - First Time Setup Only)
router.post('/register', [
  body('companyName').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('email').isEmail(),
  body('phone').optional(),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
    const hashedPassword = await bcrypt.hash(password, 10);

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
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Server error during registration' });
  }
});

// Create User/Employee (Admin, HR Officer only) - Auto-generates Login ID and Password
router.post('/create-user', authenticate, authorize('Admin', 'HR Officer'), [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail(),
  body('phone').optional(),
  body('hireDate').optional(),
  body('role').isIn(['Admin', 'HR Officer', 'Manager', 'Employee']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
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
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

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
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
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
      return res.status(400).json({ errors: errors.array() });
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
    const isValidPassword = await bcrypt.compare(password, user.password);
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
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
      return res.status(400).json({ errors: errors.array() });
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
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

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
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
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
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

