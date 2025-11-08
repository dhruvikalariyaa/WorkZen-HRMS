import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';

const router = express.Router();

// Public company registration (before user registration)
router.post('/register', [
  body('companyName').notEmpty().trim(),
  body('address').optional(),
  body('phone').optional(),
  body('email').optional().isEmail(),
  body('taxId').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyName, address, phone, email, taxId } = req.body;

    // Check if company already exists
    const existing = await pool.query('SELECT id FROM company_info LIMIT 1');
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Company already registered. Please login to update company information.' });
    }

    // Create company
    const result = await pool.query(
      `INSERT INTO company_info (company_name, address, phone, email, tax_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [companyName, address || null, phone || null, email || null, taxId || null]
    );

    res.status(201).json({
      message: 'Company registered successfully',
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Company registration error:', error);
    res.status(500).json({ error: 'Server error during company registration' });
  }
});

// Check if company is registered (public endpoint)
router.get('/check', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, company_name FROM company_info LIMIT 1');
    res.json({
      registered: result.rows.length > 0,
      company: result.rows[0] || null
    });
  } catch (error) {
    console.error('Check company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

