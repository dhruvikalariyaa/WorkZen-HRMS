import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { getTodayDate, getEmployeeIdByUserId } from '../utils/helpers.js';
import { PAYROLL_CONSTANTS, ATTENDANCE_STATUS } from '../utils/constants.js';

const router = express.Router();

// Get today's check-in status for employee (must be before / route)
router.get('/today-status', authenticate, authorize('Employee'), async (req, res) => {
  try {
    const today = getTodayDate();
    
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    const result = await pool.query(
      'SELECT check_in, check_out FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      return res.json({ checkedIn: false, checkedOut: false, checkIn: null, checkOut: null });
    }

    const record = result.rows[0];
    res.json({
      checkedIn: !!record.check_in,
      checkedOut: !!record.check_out,
      checkIn: record.check_in,
      checkOut: record.check_out
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get today status');
    res.status(500).json(errorResponse);
  }
});

// Get attendance summary for employee (for monthly view) - must be before / route
router.get('/summary', authenticate, authorize('Employee'), async (req, res) => {
  try {
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Get attendance records for the month
    const attendanceResult = await pool.query(
      `SELECT status, date FROM attendance 
       WHERE employee_id = $1 AND date BETWEEN $2 AND $3`,
      [employeeId, startDate, endDate]
    );

    // Get approved leaves for the month
    const leavesResult = await pool.query(
      `SELECT COUNT(*) as count FROM leaves 
       WHERE employee_id = $1 
       AND status = 'Approved' 
       AND start_date <= $3 
       AND end_date >= $2`,
      [employeeId, startDate, endDate]
    );

    const presentCount = attendanceResult.rows.filter(r => r.status === 'Present').length;
    const leaveCount = parseInt(leavesResult.rows[0].count);
    
    // Calculate total working days (excluding weekends - simplified)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalWorkingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
        totalWorkingDays++;
      }
    }

    res.json({
      presentDays: presentCount,
      leaveDays: leaveCount,
      totalWorkingDays: totalWorkingDays
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get attendance summary');
    res.status(500).json(errorResponse);
  }
});

// Get attendance records
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT a.*, e.employee_id, e.first_name, e.last_name, e.profile_image_url
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

    // For Admin/HR/Payroll: default to today's date if no date specified
    if (['Admin', 'HR Officer', 'Payroll Officer'].includes(req.user.role) && !req.query.date && !req.query.startDate) {
      const today = getTodayDate();
      conditions.push(`a.date = $${params.length + 1}`);
      params.push(today);
    }

    // For Employees: default to current month if no date range specified
    if (req.user.role === 'Employee' && !req.query.startDate && !req.query.date) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      conditions.push(`a.date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(firstDay, lastDay);
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

    // Order by date (ascending for employees to show chronological order, descending for admins)
    if (req.user.role === 'Employee') {
      query += ' ORDER BY a.date ASC';
    } else {
      query += ' ORDER BY e.first_name ASC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get attendance');
    res.status(500).json(errorResponse);
  }
});

// Mark attendance (Employee only)
router.post('/', authenticate, authorize('Employee'), [
  body('date').isISO8601(),
  body('status').isIn([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.LEAVE]),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
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

    // Calculate total hours and extra hours (assuming 8 hours standard work day)
    let totalHours = null;
    let extraHours = 0;
    const STANDARD_WORK_HOURS = PAYROLL_CONSTANTS.STANDARD_WORK_HOURS;

    if (checkIn && checkOut) {
      const checkInTime = new Date(`2000-01-01T${checkIn}`);
      const checkOutTime = new Date(`2000-01-01T${checkOut}`);
      totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (totalHours < 0) totalHours += 24; // Handle overnight shifts
      
      // Calculate extra hours (hours worked beyond standard 8 hours)
      if (totalHours > STANDARD_WORK_HOURS) {
        extraHours = totalHours - STANDARD_WORK_HOURS;
      }
    }

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE attendance 
         SET status = $1, check_in = $2, check_out = $3, total_hours = $4, extra_hours = $5
         WHERE id = $6
         RETURNING *`,
        [status, checkIn || null, checkOut || null, totalHours, extraHours, existing.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours, extra_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [employeeId, date, status, checkIn || null, checkOut || null, totalHours, extraHours]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    const errorResponse = handleError(error, 'Mark attendance');
    res.status(500).json(errorResponse);
  }
});

// Update attendance (Admin, HR Officer, Manager can view but not edit - only Admin/HR can edit)
router.put('/:id', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkIn, checkOut } = req.body;

    let totalHours = null;
    let extraHours = 0;
    const STANDARD_WORK_HOURS = PAYROLL_CONSTANTS.STANDARD_WORK_HOURS;

    if (checkIn && checkOut) {
      const checkInTime = new Date(`2000-01-01T${checkIn}`);
      const checkOutTime = new Date(`2000-01-01T${checkOut}`);
      totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (totalHours < 0) totalHours += 24;
      
      // Calculate extra hours
      if (totalHours > STANDARD_WORK_HOURS) {
        extraHours = totalHours - STANDARD_WORK_HOURS;
      }
    }

    const result = await pool.query(
      `UPDATE attendance 
       SET status = $1, check_in = $2, check_out = $3, total_hours = $4, extra_hours = $5
       WHERE id = $6
       RETURNING *`,
      [status, checkIn || null, checkOut || null, totalHours, extraHours, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Attendance record'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Update attendance');
    res.status(500).json(errorResponse);
  }
});

// Check In (Employee only)
router.post('/checkin', authenticate, authorize('Employee'), async (req, res) => {
  try {
    const today = getTodayDate();
    const now = new Date();
    const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Check if already checked in today
    const existing = await pool.query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].check_in) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    if (existing.rows.length > 0) {
      // Update existing record
      const result = await pool.query(
        `UPDATE attendance 
         SET check_in = $1, status = 'Present'
         WHERE id = $2
         RETURNING *`,
        [checkInTime, existing.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new record
      const result = await pool.query(
        `INSERT INTO attendance (employee_id, date, status, check_in)
         VALUES ($1, $2, 'Present', $3)
         RETURNING *`,
        [employeeId, today, checkInTime]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    const errorResponse = handleError(error, 'Check in');
    res.status(500).json(errorResponse);
  }
});

// Check Out (Employee only)
router.post('/checkout', authenticate, authorize('Employee'), async (req, res) => {
  try {
    const today = getTodayDate();
    const now = new Date();
    const checkOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employeeResult.rows[0].id;

    // Get today's attendance
    const existing = await pool.query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      return res.status(400).json({ error: 'Please check in first' });
    }

    if (existing.rows[0].check_out) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    const checkInTime = existing.rows[0].check_in;
    
    // Calculate total hours and extra hours
    const checkInDate = new Date(`2000-01-01T${checkInTime}`);
    const checkOutDate = new Date(`2000-01-01T${checkOutTime}`);
    let totalHours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
    if (totalHours < 0) totalHours += 24;
    
    const STANDARD_WORK_HOURS = PAYROLL_CONSTANTS.STANDARD_WORK_HOURS;
    let extraHours = 0;
    if (totalHours > STANDARD_WORK_HOURS) {
      extraHours = totalHours - STANDARD_WORK_HOURS;
    }

    const result = await pool.query(
      `UPDATE attendance 
       SET check_out = $1, total_hours = $2, extra_hours = $3
       WHERE id = $4
       RETURNING *`,
      [checkOutTime, totalHours, extraHours, existing.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Check out');
    res.status(500).json(errorResponse);
  }
});

export default router;

