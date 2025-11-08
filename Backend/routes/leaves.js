import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get leave requests
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT l.*, e.employee_id, e.first_name, e.last_name, e.department
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    // Employees can only see their own leaves
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0) {
        return res.json([]);
      }
      conditions.push(`l.employee_id = $${params.length + 1}`);
      params.push(employeeResult.rows[0].id);
    }

    // Filter by status
    if (req.query.status) {
      conditions.push(`l.status = $${params.length + 1}`);
      params.push(req.query.status);
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

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply for leave (Employee only)
router.post('/', authenticate, authorize('Employee'), [
  body('leaveType').notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('reason').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Check for overlapping leaves
    const overlapping = await pool.query(
      `SELECT id FROM leaves 
       WHERE employee_id = $1 
       AND status = 'Approved'
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [employeeId, startDate, endDate]
    );

    if (overlapping.rows.length > 0) {
      return res.status(400).json({ error: 'Leave request overlaps with approved leave' });
    }

    const result = await pool.query(
      `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')
       RETURNING *`,
      [employeeId, leaveType, startDate, endDate, reason || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve/Reject leave (Admin, HR Officer, Manager, Payroll Officer)
router.put('/:id/status', authenticate, authorize('Admin', 'HR Officer', 'Manager', 'Payroll Officer'), [
  body('status').isIn(['Approved', 'Rejected']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE leaves 
       SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // If approved, mark attendance as Leave for those dates
    if (status === 'Approved') {
      const leave = result.rows[0];
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE id = $1',
        [leave.employee_id]
      );

      if (employeeResult.rows.length > 0) {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
             VALUES ($1, $2, 'Leave')
             ON CONFLICT (employee_id, date) 
             DO UPDATE SET status = 'Leave'`,
            [leave.employee_id, dateStr]
          );
        }
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave types
router.get('/types', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leave_types ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

