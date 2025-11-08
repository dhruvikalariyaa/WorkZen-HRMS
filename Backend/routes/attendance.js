import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get attendance records
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT a.*, e.employee_id, e.first_name, e.last_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    // Employees can only see their own attendance
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0) {
        return res.json([]);
      }
      conditions.push(`a.employee_id = $${params.length + 1}`);
      params.push(employeeResult.rows[0].id);
    }

    // Filter by date
    if (req.query.date) {
      conditions.push(`a.date = $${params.length + 1}`);
      params.push(req.query.date);
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      conditions.push(`a.date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(req.query.startDate, req.query.endDate);
    }

    // Search
    if (req.query.search) {
      conditions.push(`(
        e.first_name ILIKE $${params.length + 1} OR
        e.last_name ILIKE $${params.length + 1} OR
        e.employee_id ILIKE $${params.length + 1}
      )`);
      params.push(`%${req.query.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.date DESC, e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark attendance (Employee only)
router.post('/', authenticate, authorize('Employee'), [
  body('date').isISO8601(),
  body('status').isIn(['Present', 'Absent', 'Leave']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, status, checkIn, checkOut } = req.body;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Check if attendance already marked
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, date]
    );

    // Calculate total hours
    let totalHours = null;
    if (checkIn && checkOut) {
      const checkInTime = new Date(`2000-01-01T${checkIn}`);
      const checkOutTime = new Date(`2000-01-01T${checkOut}`);
      totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (totalHours < 0) totalHours += 24; // Handle overnight shifts
    }

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE attendance 
         SET status = $1, check_in = $2, check_out = $3, total_hours = $4
         WHERE id = $5
         RETURNING *`,
        [status, checkIn || null, checkOut || null, totalHours, existing.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [employeeId, date, status, checkIn || null, checkOut || null, totalHours]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update attendance (Admin, HR Officer, Manager can view but not edit - only Admin/HR can edit)
router.put('/:id', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkIn, checkOut } = req.body;

    let totalHours = null;
    if (checkIn && checkOut) {
      const checkInTime = new Date(`2000-01-01T${checkIn}`);
      const checkOutTime = new Date(`2000-01-01T${checkOut}`);
      totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (totalHours < 0) totalHours += 24;
    }

    const result = await pool.query(
      `UPDATE attendance 
       SET status = $1, check_in = $2, check_out = $3, total_hours = $4
       WHERE id = $5
       RETURNING *`,
      [status, checkIn || null, checkOut || null, totalHours, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

