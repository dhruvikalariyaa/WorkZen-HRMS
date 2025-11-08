import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get leave requests
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT l.*, e.employee_id, e.first_name, e.last_name, e.department, l.attachment_url
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

    // Filter by leave type
    if (req.query.leaveType) {
      conditions.push(`l.leave_type = $${params.length + 1}`);
      params.push(req.query.leaveType);
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

// Helper function to calculate days between dates
const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  return diffDays;
};

// Helper function to get available days for an employee and leave type
const getAvailableDays = async (employeeId, leaveType) => {
  // Get allocation for this employee and leave type
  const allocationResult = await pool.query(
    `SELECT allocation_days, validity_start_date, validity_end_date 
     FROM leave_allocations 
     WHERE employee_id = $1 AND leave_type = $2`,
    [employeeId, leaveType]
  );

  let allocatedDays = 0;
  if (allocationResult.rows.length > 0) {
    allocatedDays = parseFloat(allocationResult.rows[0].allocation_days) || 0;
  } else {
    // If no allocation, check default max_days from leave_types
    const typeResult = await pool.query(
      'SELECT max_days FROM leave_types WHERE name = $1',
      [leaveType]
    );
    if (typeResult.rows.length > 0) {
      allocatedDays = typeResult.rows[0].max_days || 0;
    }
  }

  // Calculate used days (only approved leaves)
  const usedResult = await pool.query(
    `SELECT SUM(
      CASE 
        WHEN end_date >= start_date THEN 
          (end_date - start_date)::integer + 1
        ELSE 1
      END
    ) as used_days
     FROM leaves 
     WHERE employee_id = $1 
     AND leave_type = $2 
     AND status = 'Approved'`,
    [employeeId, leaveType]
  );

  const usedDays = parseFloat(usedResult.rows[0]?.used_days || 0);
  const availableDays = Math.max(0, allocatedDays - usedDays);

  return availableDays;
};

// Apply for leave (Employee only)
router.post('/', authenticate, authorize('Employee'), [
  body('leaveType').notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('reason').optional(),
  body('attachmentUrl').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { leaveType, startDate, endDate, reason, attachmentUrl } = req.body;

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

    // Check available days (only for paid leave types, not unpaid)
    if (leaveType !== 'Unpaid Leaves') {
      const availableDays = await getAvailableDays(employeeId, leaveType);
      const requestedDays = calculateDays(startDate, endDate);
      
      if (requestedDays > availableDays) {
        return res.status(400).json({ 
          error: `Insufficient leave balance. Available: ${availableDays.toFixed(2)} days, Requested: ${requestedDays} days` 
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, attachment_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending')
       RETURNING *`,
      [employeeId, leaveType, startDate, endDate, reason || null, attachmentUrl || null]
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
        // Parse dates directly from strings to avoid timezone issues
        // Handle both Date objects and strings from database
        let startDateStr = leave.start_date;
        let endDateStr = leave.end_date;
        
        // Convert Date objects to YYYY-MM-DD string format
        if (startDateStr instanceof Date) {
          const year = startDateStr.getFullYear();
          const month = String(startDateStr.getMonth() + 1).padStart(2, '0');
          const day = String(startDateStr.getDate()).padStart(2, '0');
          startDateStr = `${year}-${month}-${day}`;
        } else if (typeof startDateStr === 'string' && startDateStr.includes('T')) {
          // If it's an ISO string, extract just the date part
          startDateStr = startDateStr.split('T')[0];
        }
        
        if (endDateStr instanceof Date) {
          const year = endDateStr.getFullYear();
          const month = String(endDateStr.getMonth() + 1).padStart(2, '0');
          const day = String(endDateStr.getDate()).padStart(2, '0');
          endDateStr = `${year}-${month}-${day}`;
        } else if (typeof endDateStr === 'string' && endDateStr.includes('T')) {
          // If it's an ISO string, extract just the date part
          endDateStr = endDateStr.split('T')[0];
        }
        
        // Parse dates without timezone conversion
        const startParts = startDateStr.split('-');
        const endParts = endDateStr.split('-');
        const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
        const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
        
        // Iterate through dates and mark as Leave
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          // Format date as YYYY-MM-DD without timezone conversion
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
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

// Get available days for current user or specific employee
router.get('/available-days', authenticate, async (req, res) => {
  try {
    let employeeId;

    if (req.query.employeeId && ['Admin', 'HR Officer', 'Payroll Officer'].includes(req.user.role)) {
      // Admin/HR can check any employee
      employeeId = parseInt(req.query.employeeId);
    } else {
      // Employees can only check their own
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0) {
        return res.json({});
      }
      employeeId = employeeResult.rows[0].id;
    }

    const leaveType = req.query.leaveType;
    
    if (leaveType) {
      // Get available days for specific leave type
      const availableDays = await getAvailableDays(employeeId, leaveType);
      res.json({ [leaveType]: availableDays });
    } else {
      // Get available days for all leave types
      const leaveTypesResult = await pool.query('SELECT name FROM leave_types ORDER BY name');
      const availableDaysMap = {};
      
      for (const type of leaveTypesResult.rows) {
        availableDaysMap[type.name] = await getAvailableDays(employeeId, type.name);
      }
      
      res.json(availableDaysMap);
    }
  } catch (error) {
    console.error('Get available days error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leave allocations (Admin, HR Officer only)
router.get('/allocations', authenticate, authorize('Admin', 'HR Officer'), async (req, res) => {
  try {
    let query = `
      SELECT la.*, e.employee_id, e.first_name, e.last_name
      FROM leave_allocations la
      JOIN employees e ON la.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    if (req.query.employeeId) {
      conditions.push(`la.employee_id = $${params.length + 1}`);
      params.push(req.query.employeeId);
    }

    if (req.query.leaveType) {
      conditions.push(`la.leave_type = $${params.length + 1}`);
      params.push(req.query.leaveType);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY e.first_name, la.leave_type';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave allocations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update leave allocation (Admin, HR Officer only)
router.post('/allocations', authenticate, authorize('Admin', 'HR Officer'), [
  body('employeeId').isInt(),
  body('leaveType').notEmpty(),
  body('allocationDays').isFloat({ min: 0 }),
  body('validityStartDate').optional().isISO8601(),
  body('validityEndDate').optional().isISO8601(),
  body('notes').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, leaveType, allocationDays, validityStartDate, validityEndDate, notes } = req.body;

    // Check if employee exists
    const employeeResult = await pool.query('SELECT id FROM employees WHERE id = $1', [employeeId]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if allocation exists
    const existingResult = await pool.query(
      'SELECT id FROM leave_allocations WHERE employee_id = $1 AND leave_type = $2',
      [employeeId, leaveType]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE leave_allocations 
         SET allocation_days = $1, validity_start_date = $2, validity_end_date = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [allocationDays, validityStartDate || null, validityEndDate || null, notes || null, existingResult.rows[0].id]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO leave_allocations (employee_id, leave_type, allocation_days, validity_start_date, validity_end_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [employeeId, leaveType, allocationDays, validityStartDate || null, validityEndDate || null, notes || null]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create/update leave allocation error:', error);
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

