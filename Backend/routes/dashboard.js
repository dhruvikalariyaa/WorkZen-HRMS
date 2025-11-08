import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { handleError } from '../utils/errorHandler.js';
import { getTodayDate, getEmployeeIdByUserId } from '../utils/helpers.js';
import { PAYROLL_STATUS, LEAVE_STATUS, ATTENDANCE_STATUS } from '../utils/constants.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    let employeeFilter = '';
    const params = [];

    // Employees can only see their own stats
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length > 0) {
        employeeFilter = 'WHERE e.id = $1';
        params.push(employeeResult.rows[0].id);
      }
    }

    // Total employees
    const totalEmployees = await pool.query(
      `SELECT COUNT(*) as count FROM employees e ${employeeFilter}`,
      params
    );

    // Today's attendance
    const today = getTodayDate();
    const dateParamIndex = params.length + 1;
    let attendanceQuery = `
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN a.check_in IS NOT NULL THEN e.id
          WHEN a.status = 'Present' THEN e.id
        END) as present,
        COUNT(DISTINCT CASE 
          WHEN a.check_in IS NULL 
            AND (a.status = 'Absent' OR a.id IS NULL)
            AND (l.id IS NULL OR l.status != 'Approved' OR CAST($${dateParamIndex} AS DATE) < l.start_date OR CAST($${dateParamIndex} AS DATE) > l.end_date)
          THEN e.id
        END) as absent,
        COUNT(DISTINCT CASE 
          WHEN a.check_in IS NULL 
            AND (
              (a.status = 'Leave')
              OR (l.id IS NOT NULL 
                  AND l.status = 'Approved' 
                  AND CAST($${dateParamIndex} AS DATE) >= l.start_date 
                  AND CAST($${dateParamIndex} AS DATE) <= l.end_date)
            )
          THEN e.id
        END) as leave
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $${dateParamIndex}
      LEFT JOIN leaves l ON e.id = l.employee_id 
        AND l.status = 'Approved' 
        AND CAST($${dateParamIndex} AS DATE) >= l.start_date 
        AND CAST($${dateParamIndex} AS DATE) <= l.end_date
      ${employeeFilter}
    `;
    const attendanceParams = [...params, today];

    const todayAttendance = await pool.query(attendanceQuery, attendanceParams);

    // Pending leave requests (Admin, HR Officer, Payroll Officer only)
    let pendingLeaves = { count: 0 };
    if (['Admin', 'HR Officer', 'Payroll Officer'].includes(req.user.role)) {
      const leavesResult = await pool.query(
        'SELECT COUNT(*) as count FROM leaves WHERE status = $1',
        [LEAVE_STATUS.PENDING]
      );
      pendingLeaves = leavesResult.rows[0];
    } else if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length > 0) {
        const leavesResult = await pool.query(
          'SELECT COUNT(*) as count FROM leaves WHERE employee_id = $1 AND status = $2',
          [employeeResult.rows[0].id, LEAVE_STATUS.PENDING]
        );
        pendingLeaves = leavesResult.rows[0];
      }
    }

    // Monthly payroll stats (Admin, Payroll Officer only)
    let payrollStats = { processed: 0, pending: 0 };
    if (['Admin', 'Payroll Officer'].includes(req.user.role)) {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const payrollResult = await pool.query(
        `SELECT 
          COUNT(CASE WHEN status = $1 THEN 1 END) as processed,
          COUNT(CASE WHEN status = $2 THEN 1 END) as pending
         FROM payroll
         WHERE month = $3 AND year = $4`,
        [PAYROLL_STATUS.PROCESSED, PAYROLL_STATUS.PENDING, currentMonth, currentYear]
      );
      payrollStats = payrollResult.rows[0];
    }

    res.json({
      totalEmployees: parseInt(totalEmployees.rows[0].count),
      todayAttendance: {
        present: parseInt(todayAttendance.rows[0].present),
        absent: parseInt(todayAttendance.rows[0].absent),
        leave: parseInt(todayAttendance.rows[0].leave)
      },
      pendingLeaves: parseInt(pendingLeaves.count),
      payrollStats: {
        processed: parseInt(payrollStats.processed),
        pending: parseInt(payrollStats.pending)
      }
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get dashboard stats');
    res.status(500).json(errorResponse);
  }
});

// Get employee dashboard statistics (simplified)
router.get('/employee/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Employee') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get employee ID
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE user_id = $1',
      [req.user.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.json({
        totalEmployees: 0,
        todayAttendance: { present: 0, absent: 0, leave: 0 },
        pendingLeaves: 0,
        payrollStats: { processed: 0, pending: 0 }
      });
    }

    const employeeId = employeeResult.rows[0].id;

    // Total employees (always 1 for employee)
    const totalEmployees = 1;

    // Today's attendance
    const today = getTodayDate();
    const attendanceResult = await pool.query(
      `SELECT 
        CASE 
          WHEN a.check_in IS NOT NULL OR a.status = 'Present' THEN 'present'
          WHEN l.id IS NOT NULL AND l.status = 'Approved' AND CAST($1 AS DATE) >= l.start_date AND CAST($1 AS DATE) <= l.end_date THEN 'leave'
          ELSE 'absent'
        END as status
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
      LEFT JOIN leaves l ON e.id = l.employee_id 
        AND l.status = 'Approved' 
        AND CAST($1 AS DATE) >= l.start_date 
        AND CAST($1 AS DATE) <= l.end_date
      WHERE e.id = $2`,
      [today, employeeId]
    );

    let present = 0, absent = 0, leave = 0;
    if (attendanceResult.rows.length > 0) {
      const status = attendanceResult.rows[0].status;
      if (status === 'present') present = 1;
      else if (status === 'leave') leave = 1;
      else absent = 1;
    } else {
      absent = 1;
    }

    // Pending leave requests
    const leavesResult = await pool.query(
      'SELECT COUNT(*) as count FROM leaves WHERE employee_id = $1 AND status = $2',
      [employeeId, 'Pending']
    );
    const pendingLeaves = parseInt(leavesResult.rows[0].count) || 0;

    // Get this month attendance count
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
    const monthAttendanceResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM attendance 
       WHERE employee_id = $1 
         AND date >= $2 
         AND (check_in IS NOT NULL OR status = 'Present')`,
      [employeeId, firstDay]
    );
    const thisMonthPresent = parseInt(monthAttendanceResult.rows[0].count) || 0;

    res.json({
      totalEmployees,
      todayAttendance: {
        present,
        absent,
        leave
      },
      pendingLeaves,
      thisMonthPresent,
      payrollStats: {
        processed: 0,
        pending: 0
      }
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get employee dashboard stats');
    res.status(500).json(errorResponse);
  }
});

// Get attendance trends (last 7 days)
router.get('/analytics/attendance-trends', authenticate, async (req, res) => {
  try {
    let employeeFilter = '';
    const params = [];

    // Employees can only see their own stats
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length > 0) {
        employeeFilter = 'AND e.id = $1';
        params.push(employeeResult.rows[0].id);
      }
    }

    // Get last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const trends = [];
    for (const date of dates) {
      const query = `
        SELECT 
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Present' THEN e.id
            WHEN a.check_in IS NOT NULL AND l.id IS NULL THEN e.id
          END) as present,
          COUNT(DISTINCT CASE 
            WHEN a.status = 'Absent' AND l.id IS NULL THEN e.id
            WHEN a.id IS NULL AND l.id IS NULL THEN e.id
          END) as absent,
          COUNT(DISTINCT CASE 
            WHEN l.id IS NOT NULL 
              AND l.status = 'Approved' 
              AND CAST($${params.length + 1} AS DATE) >= l.start_date 
              AND CAST($${params.length + 1} AS DATE) <= l.end_date
              AND (a.status IS NULL OR a.status != 'Present')
            THEN e.id
            WHEN a.status = 'Leave' THEN e.id
          END) as leave
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $${params.length + 1}
        LEFT JOIN leaves l ON e.id = l.employee_id 
          AND l.status = 'Approved' 
          AND CAST($${params.length + 1} AS DATE) >= l.start_date 
          AND CAST($${params.length + 1} AS DATE) <= l.end_date
        ${employeeFilter ? 'WHERE 1=1 ' + employeeFilter : ''}
      `;
      const result = await pool.query(query, [...params, date]);
      trends.push({
        date,
        present: parseInt(result.rows[0].present) || 0,
        absent: parseInt(result.rows[0].absent) || 0,
        leave: parseInt(result.rows[0].leave) || 0
      });
    }

    res.json(trends);
  } catch (error) {
    const errorResponse = handleError(error, 'Get attendance trends');
    res.status(500).json(errorResponse);
  }
});

// Get leave distribution by type
router.get('/analytics/leave-distribution', authenticate, async (req, res) => {
  try {
    let employeeFilter = '';
    const params = [];

    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length > 0) {
        employeeFilter = 'AND l.employee_id = $1';
        params.push(employeeResult.rows[0].id);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        l.leave_type,
        COUNT(*) as count
      FROM leaves l
      WHERE l.status = 'Approved'
        AND l.start_date >= $${params.length + 1}
      ${employeeFilter}
      GROUP BY l.leave_type
      ORDER BY count DESC
    `;
    params.push(dateStr);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get leave distribution');
    res.status(500).json(errorResponse);
  }
});

// Get department-wise statistics
router.get('/analytics/department-stats', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'Employee') {
      return res.json([]);
    }

    const query = `
      SELECT 
        COALESCE(e.department, 'Unassigned') as department,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_today,
        COUNT(CASE WHEN a.status = 'Absent' OR a.id IS NULL THEN 1 END) as absent_today
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = CURRENT_DATE
      GROUP BY e.department
      ORDER BY employee_count DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get department stats');
    res.status(500).json(errorResponse);
  }
});

// Get monthly payroll summary
router.get('/analytics/payroll-summary', authenticate, async (req, res) => {
  try {
    if (!['Admin', 'Payroll Officer'].includes(req.user.role)) {
      return res.json([]);
    }

    // Get last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleString('default', { month: 'short', year: 'numeric' })
      });
    }

    const summary = [];
    for (const { month, year, label } of months) {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Processed' THEN 1 END) as processed,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          SUM(gross_salary) as total_gross,
          SUM(net_salary) as total_net
        FROM payroll
        WHERE month = $1 AND year = $2
      `;
      const result = await pool.query(query, [month, year]);
      summary.push({
        month,
        year,
        label,
        total: parseInt(result.rows[0].total) || 0,
        processed: parseInt(result.rows[0].processed) || 0,
        pending: parseInt(result.rows[0].pending) || 0,
        totalGross: parseFloat(result.rows[0].total_gross) || 0,
        totalNet: parseFloat(result.rows[0].total_net) || 0
      });
    }

    res.json(summary);
  } catch (error) {
    const errorResponse = handleError(error, 'Get payroll summary');
    res.status(500).json(errorResponse);
  }
});

// Get overall HR statistics
router.get('/analytics/hr-overview', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'Employee') {
      return res.json({});
    }

    // Total employees by department
    const deptStats = await pool.query(`
      SELECT 
        COALESCE(department, 'Unassigned') as department,
        COUNT(*) as count
      FROM employees
      GROUP BY department
      ORDER BY count DESC
    `);

    // Employees by role
    const roleStats = await pool.query(`
      SELECT 
        u.role,
        COUNT(*) as count
      FROM employees e
      JOIN users u ON e.user_id = u.id
      GROUP BY u.role
      ORDER BY count DESC
    `);

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    const recentHires = await pool.query(`
      SELECT COUNT(*) as count
      FROM employees
      WHERE hire_date >= $1
    `, [dateStr]);

    // Average attendance rate this month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const attendanceRate = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.employee_id) as employees_with_attendance,
        COUNT(DISTINCT e.id) as total_employees
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id 
        AND a.date >= $1 
        AND a.status = 'Present'
    `, [firstDay]);

    const totalEmployees = parseInt(attendanceRate.rows[0].total_employees) || 0;
    const withAttendance = parseInt(attendanceRate.rows[0].employees_with_attendance) || 0;
    const avgAttendanceRate = totalEmployees > 0 ? ((withAttendance / totalEmployees) * 100).toFixed(1) : 0;

    res.json({
      departmentStats: deptStats.rows,
      roleStats: roleStats.rows,
      recentHires: parseInt(recentHires.rows[0].count) || 0,
      averageAttendanceRate: parseFloat(avgAttendanceRate)
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Get HR overview');
    res.status(500).json(errorResponse);
  }
});

export default router;

