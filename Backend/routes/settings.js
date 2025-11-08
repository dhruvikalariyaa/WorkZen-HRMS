import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get company info
router.get('/company', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_info LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company info
router.put('/company', authenticate, authorize('Admin'), [
  body('companyName').optional().notEmpty(),
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

    // Check if company info exists
    const existing = await pool.query('SELECT id FROM company_info LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await pool.query(
        `UPDATE company_info 
         SET company_name = $1, address = $2, phone = $3, email = $4, tax_id = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [companyName, address, phone, email, taxId, existing.rows[0].id]
      );
    } else {
      // Insert
      result = await pool.query(
        `INSERT INTO company_info (company_name, address, phone, email, tax_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [companyName, address, phone, email, taxId]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update company info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave types
router.get('/leave-types', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leave_types ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add leave type
router.post('/leave-types', authenticate, authorize('Admin'), [
  body('name').notEmpty(),
  body('maxDays').optional().isInt({ min: 0 }),
  body('description').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, maxDays = 0, description } = req.body;

    const result = await pool.query(
      `INSERT INTO leave_types (name, max_days, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, maxDays, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Leave type already exists' });
    }
    console.error('Add leave type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update leave type
router.put('/leave-types/:id', authenticate, authorize('Admin'), [
  body('name').optional().notEmpty(),
  body('maxDays').optional().isInt({ min: 0 }),
  body('description').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, maxDays, description } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (maxDays !== undefined) {
      updateFields.push(`max_days = $${paramCount++}`);
      values.push(maxDays);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE leave_types SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete leave type
router.delete('/leave-types/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM leave_types WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payroll settings
router.get('/payroll', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payroll_settings LIMIT 1');
    res.json(result.rows[0] || {
      pf_percentage: 12,
      professional_tax_amount: 200,
      hra_percentage: 40
    });
  } catch (error) {
    console.error('Get payroll settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update payroll settings
router.put('/payroll', authenticate, authorize('Admin'), [
  body('pfPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('professionalTaxAmount').optional().isFloat({ min: 0 }),
  body('hraPercentage').optional().isFloat({ min: 0, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pfPercentage, professionalTaxAmount, hraPercentage } = req.body;

    // Check if settings exist
    const existing = await pool.query('SELECT id FROM payroll_settings LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (pfPercentage !== undefined) {
        updateFields.push(`pf_percentage = $${paramCount++}`);
        values.push(pfPercentage);
      }
      if (professionalTaxAmount !== undefined) {
        updateFields.push(`professional_tax_amount = $${paramCount++}`);
        values.push(professionalTaxAmount);
      }
      if (hraPercentage !== undefined) {
        updateFields.push(`hra_percentage = $${paramCount++}`);
        values.push(hraPercentage);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(existing.rows[0].id);

      result = await pool.query(
        `UPDATE payroll_settings SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
    } else {
      result = await pool.query(
        `INSERT INTO payroll_settings (pf_percentage, professional_tax_amount, hra_percentage)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [pfPercentage || 12, professionalTaxAmount || 200, hraPercentage || 40]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update payroll settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

