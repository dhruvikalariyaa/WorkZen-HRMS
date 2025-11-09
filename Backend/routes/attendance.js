import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { getTodayDate, getEmployeeIdByUserId } from '../utils/helpers.js';
import { PAYROLL_CONSTANTS, ATTENDANCE_STATUS } from '../utils/constants.js';

const router = express.Router();

// Helper function to calculate total days in a month (30 or 31)
const getTotalDaysInMonth = (year, month) => {
  const endDate = new Date(year, month, 0);
  return endDate.getDate(); // Returns 28, 29, 30, or 31 depending on the month
};

// Helper function to calculate working days in a month
// First get total days (30 or 31), then exclude weekends (Saturday and Sunday)
const calculateWorkingDaysInMonth = (year, month) => {
  // Step 1: Get total days in month (30 or 31)
  const totalDaysInMonth = getTotalDaysInMonth(year, month);
  
  // Step 2: Calculate working days by excluding weekends
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  let workingDays = 0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      workingDays++;
    }
  }
  
  return workingDays;
};

// Get today's check-in status for employee (must be before / route)
router.get('/today-status', authenticate, authorize('Employee', 'HR Officer', 'Payroll Officer'), async (req, res) => {
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
      return res.json({ checkedIn: false, checkedOut: false, checkIn: null, checkOut: null, extraHours: 0, extraMinutes: 0 });
    }

    const record = result.rows[0];
    let extraHours = 0;
    let extraMinutes = 0;
    let totalHours = 0;

    // If checked in but not checked out, calculate hours from check-in to now
    if (record.check_in && !record.check_out) {
      const now = new Date();
      const checkInTime = record.check_in.split(':');
      const checkInDate = new Date();
      checkInDate.setHours(parseInt(checkInTime[0]), parseInt(checkInTime[1]), 0, 0);
      
      // Calculate total hours worked
      totalHours = (now - checkInDate) / (1000 * 60 * 60);
      
      // Calculate extra hours if more than 8 hours
      const STANDARD_WORK_HOURS = PAYROLL_CONSTANTS.STANDARD_WORK_HOURS;
      if (totalHours > STANDARD_WORK_HOURS) {
        const extraHoursTotal = totalHours - STANDARD_WORK_HOURS;
        extraHours = Math.floor(extraHoursTotal);
        extraMinutes = Math.floor((extraHoursTotal - extraHours) * 60);
      }
    }

    res.json({
      checkedIn: !!record.check_in,
      checkedOut: !!record.check_out,
      checkIn: record.check_in,
      checkOut: record.check_out,
      extraHours: extraHours,
      extraMinutes: extraMinutes,
      totalHours: totalHours
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get today status');
    res.status(500).json(errorResponse);
  }
});

// Get attendance summary for employee (for monthly view) - must be before / route
router.get('/summary', authenticate, authorize('Employee', 'HR Officer', 'Payroll Officer'), async (req, res) => {
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

    // Get approved leaves for the month and calculate actual leave DAYS (not leave records)
    const leavesResult = await pool.query(
      `SELECT leave_type, start_date, end_date FROM leaves 
       WHERE employee_id = $1 
       AND status = 'Approved' 
       AND start_date <= $3 
       AND end_date >= $2`,
      [employeeId, startDate, endDate]
    );

    // Count present days (excluding weekends) - same logic as payroll
    let presentCount = 0;
    attendanceResult.rows.forEach(record => {
      if (record.status === 'Present') {
        const date = new Date(record.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Only count weekdays (exclude Sunday and Saturday)
          presentCount++;
        }
      }
    });
    
    // Calculate actual leave DAYS (including all calendar days)
    // Use Set to avoid double-counting overlapping leave dates
    const leaveDatesSet = new Set();
    const dateRangeStart = new Date(startDate);
    const dateRangeEnd = new Date(endDate);
    
    leavesResult.rows.forEach(leave => {
      // Parse dates - handle both Date objects and strings
      // Convert to YYYY-MM-DD format first to avoid timezone issues
      const leaveStartStr = leave.start_date instanceof Date 
        ? leave.start_date.toISOString().split('T')[0]
        : leave.start_date.split('T')[0];
      const leaveEndStr = leave.end_date instanceof Date
        ? leave.end_date.toISOString().split('T')[0]
        : leave.end_date.split('T')[0];
      
      const leaveStart = new Date(leaveStartStr + 'T00:00:00');
      const leaveEnd = new Date(leaveEndStr + 'T00:00:00');
      
      // Normalize date range boundaries - use local time to avoid timezone issues
      const rangeStartStr = startDate.split('T')[0];
      const rangeEndStr = endDate.split('T')[0];
      const rangeStart = new Date(rangeStartStr + 'T00:00:00');
      const rangeEnd = new Date(rangeEndStr + 'T00:00:00');
      
      // Count all calendar days within the date range (including weekends)
      // Use >= and <= to include boundary dates
      const actualStart = leaveStart >= rangeStart ? leaveStart : rangeStart;
      const actualEnd = leaveEnd <= rangeEnd ? leaveEnd : rangeEnd;
      
      // Only process if there's an overlap
      if (actualStart <= actualEnd) {
        // Calculate the difference in days
        const timeDiff = actualEnd.getTime() - actualStart.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        
        // Add all days in the range
        for (let i = 0; i < daysDiff; i++) {
          const d = new Date(actualStart);
          d.setDate(d.getDate() + i);
            // Use date string as key to avoid duplicates
            const dateStr = d.toISOString().split('T')[0];
            leaveDatesSet.add(dateStr);
        }
      }
    });
    
    const leaveCount = leaveDatesSet.size;
    
    // Debug logging (can be removed in production)
    console.log('Leave calculation debug:', {
      employeeId,
      startDate,
      endDate,
      leavesFound: leavesResult.rows.length,
      leaveRecords: leavesResult.rows.map(l => ({
        start: l.start_date,
        end: l.end_date,
        type: l.leave_type
      })),
      uniqueLeaveDays: Array.from(leaveDatesSet).sort(),
      leaveCount
    });
    
    // Calculate total working days using the same logic as payroll
    // First get total days in month (30 or 31), then exclude weekends
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1;
    
    // If start and end are in the same month, use that month's working days
    let totalWorkingDays = 0;
    if (startYear === endYear && startMonth === endMonth) {
      totalWorkingDays = calculateWorkingDaysInMonth(startYear, startMonth);
    } else {
      // If date range spans multiple months, calculate for each month
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
          totalWorkingDays++;
        }
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

    // HR Officer and Payroll Officer viewing their own attendance (when startDate/endDate provided without search)
    if (['HR Officer', 'Payroll Officer'].includes(req.user.role) && req.query.startDate && req.query.endDate && !req.query.search) {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length > 0) {
        conditions.push(`a.employee_id = $${params.length + 1}`);
        params.push(employeeResult.rows[0].id);
      }
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


    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Order by date (ascending for employees/HR/Payroll viewing their own, descending for admins viewing all)
    if (req.user.role === 'Employee' || (['HR Officer', 'Payroll Officer'].includes(req.user.role) && req.query.startDate && !req.query.search)) {
      query += ' ORDER BY a.date ASC';
    } else {
      query += ' ORDER BY e.first_name ASC';
    }

    const result = await pool.query(query, params);
    
    // Calculate extra hours for records without check_out but with check_in (if 8+ hours passed)
    const STANDARD_WORK_HOURS = PAYROLL_CONSTANTS.STANDARD_WORK_HOURS;
    const today = getTodayDate();
    const now = new Date();
    
    const processedRows = result.rows.map(record => {
      // Only calculate for today's records without check_out
      if (record.check_in && !record.check_out && record.date === today) {
        const checkInTime = record.check_in.split(':');
        const checkInDate = new Date();
        checkInDate.setHours(parseInt(checkInTime[0]), parseInt(checkInTime[1]), 0, 0);
        
        // Calculate total hours worked
        let totalHours = (now - checkInDate) / (1000 * 60 * 60);
        
        // Calculate extra hours if more than 8 hours
        if (totalHours > STANDARD_WORK_HOURS) {
          const extraHours = totalHours - STANDARD_WORK_HOURS;
          record.extra_hours = parseFloat(extraHours.toFixed(2));
          record.total_hours = parseFloat(totalHours.toFixed(2));
        } else {
          record.extra_hours = record.extra_hours || 0;
        }
      }
      return record;
    });
    
    res.json(processedRows);
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

// Check In (Employee, HR Officer, Payroll Officer)
router.post('/checkin', authenticate, authorize('Employee', 'HR Officer', 'Payroll Officer'), async (req, res) => {
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

// Check Out (Employee, HR Officer, Payroll Officer)
router.post('/checkout', authenticate, authorize('Employee', 'HR Officer', 'Payroll Officer'), async (req, res) => {
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

