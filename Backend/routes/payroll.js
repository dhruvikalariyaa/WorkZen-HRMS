import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleError, handleValidationError, handleNotFoundError, handleForbiddenError } from '../utils/errorHandler.js';
import { PAYROLL_CONSTANTS, PAYROLL_STATUS } from '../utils/constants.js';

const router = express.Router();

// Calculate payroll for an employee
const calculatePayroll = async (employeeId, month, year) => {
  // Get employee details
  const employeeResult = await pool.query(
    'SELECT salary, basic_salary FROM employees WHERE id = $1',
    [employeeId]
  );

  if (employeeResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const { salary, basic_salary } = employeeResult.rows[0];
  // Convert to numbers to ensure proper calculations
  const salaryNum = parseFloat(salary) || 0;
  const basicSalaryNum = parseFloat(basic_salary) || 0;
  const basicSalary = basicSalaryNum || salaryNum * PAYROLL_CONSTANTS.BASIC_SALARY_PERCENTAGE;

  // Get payroll settings
  const settingsResult = await pool.query('SELECT * FROM payroll_settings LIMIT 1');
  const settings = settingsResult.rows[0] || {
    pf_percentage: PAYROLL_CONSTANTS.DEFAULT_PF_PERCENTAGE,
    professional_tax_amount: PAYROLL_CONSTANTS.DEFAULT_PROFESSIONAL_TAX,
    hra_percentage: PAYROLL_CONSTANTS.DEFAULT_HRA_PERCENTAGE
  };

  // Convert settings to numbers
  const hraPercentage = parseFloat(settings.hra_percentage) || 40;
  const pfPercentage = parseFloat(settings.pf_percentage) || 12;
  const professionalTaxAmount = parseFloat(settings.professional_tax_amount) || 200;

  // Calculate allowances
  const hra = parseFloat((basicSalary * (hraPercentage / 100)).toFixed(2));
  const conveyance = PAYROLL_CONSTANTS.CONVEYANCE_ALLOWANCE; // Fixed
  const medicalAllowance = PAYROLL_CONSTANTS.MEDICAL_ALLOWANCE; // Fixed
  const otherAllowances = parseFloat((salaryNum - basicSalary - hra - conveyance - medicalAllowance).toFixed(2));

  // Calculate deductions
  const pf = parseFloat((basicSalary * (pfPercentage / 100)).toFixed(2));
  const professionalTax = professionalTaxAmount;
  const incomeTax = 0; // Can be calculated based on tax brackets if needed
  const loanDeduction = 0; // Can be stored per employee if needed
  const otherDeductions = 0;
  const totalDeductions = parseFloat((pf + professionalTax + incomeTax + loanDeduction + otherDeductions).toFixed(2));

  // Calculate gross and net
  const grossSalary = parseFloat((basicSalary + hra + conveyance + medicalAllowance + otherAllowances).toFixed(2));
  const netSalary = parseFloat((grossSalary - totalDeductions).toFixed(2));

  // Get attendance for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const attendanceResult = await pool.query(
    `SELECT COUNT(*) as present_days, 
            COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave_days,
            COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days
     FROM attendance
     WHERE employee_id = $1 AND date BETWEEN $2 AND $3`,
    [employeeId, startDate, endDate]
  );

  const { present_days, leave_days, absent_days } = attendanceResult.rows[0];
  const totalDays = parseInt(present_days) + parseInt(leave_days) + parseInt(absent_days);

  // Adjust salary based on attendance (if needed)
  // For now, we'll use full salary, but you can adjust based on business logic
  const workingDays = PAYROLL_CONSTANTS.DEFAULT_WORKING_DAYS_PER_MONTH;
  const actualWorkingDays = parseInt(present_days) + parseInt(leave_days);
  const adjustedNetSalary = parseFloat(((netSalary / workingDays) * actualWorkingDays).toFixed(2));

  return {
    basicSalary,
    hra,
    conveyance,
    medicalAllowance,
    otherAllowances,
    grossSalary,
    pf,
    professionalTax,
    incomeTax,
    loanDeduction,
    otherDeductions,
    totalDeductions,
    netSalary: adjustedNetSalary,
    presentDays: parseInt(present_days),
    leaveDays: parseInt(leave_days),
    absentDays: parseInt(absent_days)
  };
};

// Get payroll records
router.get('/', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    let query = `
      SELECT p.*, e.employee_id, e.first_name, e.last_name
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
    `;
    const params = [];
    const conditions = [];

    // Filter by month
    if (req.query.month) {
      conditions.push(`p.month = $${params.length + 1}`);
      params.push(req.query.month);
    }

    // Filter by year
    if (req.query.year) {
      conditions.push(`p.year = $${params.length + 1}`);
      params.push(req.query.year);
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

    query += ' ORDER BY p.year DESC, p.month DESC, e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get payroll');
    res.status(500).json(errorResponse);
  }
});

// Generate payroll for an employee
router.post('/generate', authenticate, authorize('Admin', 'Payroll Officer'), [
  body('employeeId').isInt(),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { employeeId, month, year } = req.body;

    // Check if payroll already exists
    const existing = await pool.query(
      'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
      [employeeId, month, year]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Payroll already generated for this period' });
    }

    // Calculate payroll
    const payrollData = await calculatePayroll(employeeId, month, year);

    // Insert payroll - ensure all values are numbers
    const result = await pool.query(
      `INSERT INTO payroll (
        employee_id, month, year, gross_salary, basic_salary,
        hra, conveyance, medical_allowance, other_allowances,
        pf, professional_tax, income_tax, loan_deduction, other_deductions, total_deductions, net_salary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        parseInt(employeeId), 
        parseInt(month), 
        parseInt(year), 
        parseFloat(payrollData.grossSalary), 
        parseFloat(payrollData.basicSalary),
        parseFloat(payrollData.hra), 
        parseFloat(payrollData.conveyance), 
        parseFloat(payrollData.medicalAllowance), 
        parseFloat(payrollData.otherAllowances),
        parseFloat(payrollData.pf), 
        parseFloat(payrollData.professionalTax), 
        parseFloat(payrollData.incomeTax), 
        parseFloat(payrollData.loanDeduction),
        parseFloat(payrollData.otherDeductions), 
        parseFloat(payrollData.totalDeductions), 
        parseFloat(payrollData.netSalary),
        PAYROLL_STATUS.PROCESSED
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Generate payroll');
    res.status(500).json(errorResponse);
  }
});

// Generate payslip
router.post('/payslip', authenticate, [
  body('payrollId').isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { payrollId } = req.body;

    // Get payroll details
    const payrollResult = await pool.query(
      `SELECT p.*, e.*, u.username
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE p.id = $1`,
      [payrollId]
    );

    if (payrollResult.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Payroll'));
    }

    const payroll = payrollResult.rows[0];

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0 || employeeResult.rows[0].id !== payroll.employee_id) {
        return res.status(403).json(handleForbiddenError());
      }
    } else if (!['Admin', 'Payroll Officer'].includes(req.user.role)) {
      return res.status(403).json(handleForbiddenError());
    }

    // Create payslip record
    const payslipResult = await pool.query(
      `INSERT INTO payslips (payroll_id, employee_id, month, year)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [payrollId, payroll.employee_id, payroll.month, payroll.year]
    );

    res.json({
      payslip: payslipResult.rows[0] || { payroll_id: payrollId },
      payroll: payroll
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Generate payslip');
    res.status(500).json(errorResponse);
  }
});

// Get payslip
router.get('/payslip/:payrollId', authenticate, async (req, res) => {
  try {
    const { payrollId } = req.params;

    const result = await pool.query(
      `SELECT p.*, e.*, u.username, ps.generated_at
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN payslips ps ON ps.payroll_id = p.id
       WHERE p.id = $1`,
      [payrollId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Payslip'));
    }

    const payroll = result.rows[0];

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0 || employeeResult.rows[0].id !== payroll.employee_id) {
        return res.status(403).json(handleForbiddenError());
      }
    }

    res.json(payroll);
  } catch (error) {
    const errorResponse = handleError(error, 'Get payslip');
    res.status(500).json(errorResponse);
  }
});

export default router;

