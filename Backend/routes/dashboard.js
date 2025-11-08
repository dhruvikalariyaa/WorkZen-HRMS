import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

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
    const today = new Date().toISOString().split('T')[0];
    let attendanceQuery = `
      SELECT 
        COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'Leave' THEN 1 END) as leave
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = $1
    `;
    const attendanceParams = [today];
    
    if (req.user.role === 'Employee' && params.length > 0) {
      attendanceQuery += ' AND e.id = $2';
      attendanceParams.push(params[0]);
    }

    const todayAttendance = await pool.query(attendanceQuery, attendanceParams);

    // Pending leave requests (Admin, HR Officer, Payroll Officer only)
    let pendingLeaves = { count: 0 };
    if (['Admin', 'HR Officer', 'Payroll Officer'].includes(req.user.role)) {
      const leavesResult = await pool.query(
        'SELECT COUNT(*) as count FROM leaves WHERE status = $1',
        ['Pending']
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
          [employeeResult.rows[0].id, 'Pending']
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
          COUNT(CASE WHEN status = 'Processed' THEN 1 END) as processed,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending
         FROM payroll
         WHERE month = $1 AND year = $2`,
        [currentMonth, currentYear]
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
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

