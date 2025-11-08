import express from 'express';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get attendance report
router.get('/attendance', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;

    // Employees can only see their own attendance
    let query = `
      SELECT 
        e.employee_id,
        e.first_name || ' ' || e.last_name as name,
        e.department,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'Leave' THEN 1 END) as leave_days,
        SUM(a.total_hours) as total_hours
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'Employee') {
      const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length > 0) {
        conditions.push(`e.id = $${params.length + 1}`);
        params.push(empResult.rows[0].id);
      }
    }

    if (startDate && endDate) {
      conditions.push(`a.date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(startDate, endDate);
    }

    if (employeeId && !['Employee'].includes(req.user.role)) {
      conditions.push(`e.id = $${params.length + 1}`);
      params.push(employeeId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY e.id, e.employee_id, e.first_name, e.last_name, e.department ORDER BY e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave report
router.get('/leave', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status, employeeId } = req.query;

    // Employees can only see their own leaves
    let query = `
      SELECT 
        l.*,
        e.employee_id,
        e.first_name || ' ' || e.last_name as name,
        e.department
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'Employee') {
      const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length > 0) {
        conditions.push(`l.employee_id = $${params.length + 1}`);
        params.push(empResult.rows[0].id);
      }
    }

    if (startDate && endDate) {
      conditions.push(`(l.start_date BETWEEN $${params.length + 1} AND $${params.length + 2} OR
                       l.end_date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
      params.push(startDate, endDate);
    }

    if (status) {
      conditions.push(`l.status = $${params.length + 1}`);
      params.push(status);
    }

    if (employeeId && !['Employee'].includes(req.user.role)) {
      conditions.push(`e.id = $${params.length + 1}`);
      params.push(employeeId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payroll report
router.get('/payroll', authenticate, async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;

    // Employees can only see their own payroll
    let query = `
      SELECT 
        p.*,
        e.employee_id,
        e.first_name || ' ' || e.last_name as name,
        e.department
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role === 'Employee') {
      const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [req.user.id]);
      if (empResult.rows.length > 0) {
        conditions.push(`p.employee_id = $${params.length + 1}`);
        params.push(empResult.rows[0].id);
      }
    }

    if (month) {
      conditions.push(`p.month = $${params.length + 1}`);
      params.push(month);
    }

    if (year) {
      conditions.push(`p.year = $${params.length + 1}`);
      params.push(year);
    }

    if (employeeId && !['Employee'].includes(req.user.role)) {
      conditions.push(`e.id = $${params.length + 1}`);
      params.push(employeeId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.year DESC, p.month DESC, e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payroll report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee report
router.get('/employee', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    const { search, department, position } = req.query;

    let query = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.hire_date
      FROM employees e
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(
        e.first_name ILIKE $${params.length + 1} OR
        e.last_name ILIKE $${params.length + 1} OR
        e.employee_id ILIKE $${params.length + 1} OR
        e.email ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }

    if (department) {
      conditions.push(`e.department = $${params.length + 1}`);
      params.push(department);
    }

    if (position) {
      conditions.push(`e.position = $${params.length + 1}`);
      params.push(position);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employee report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

