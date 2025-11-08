import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleError, handleValidationError, handleNotFoundError, handleForbiddenError } from '../utils/errorHandler.js';
import { PAYROLL_STATUS, LEAVE_TYPES } from '../utils/constants.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Calculate payroll for an employee based on attendance, PTO, and UPTO
const calculatePayroll = async (employeeId, month, year) => {
  // Ensure employeeId is an integer
  const empId = parseInt(employeeId);
  if (isNaN(empId)) {
    throw new Error(`Invalid employee ID: ${employeeId}`);
  }

  // Ensure month and year are integers
  const monthInt = parseInt(month);
  const yearInt = parseInt(year);
  if (isNaN(monthInt) || isNaN(yearInt)) {
    throw new Error(`Invalid month or year: month=${month}, year=${year}`);
  }

  // Get employee details and salary info from salary_info table (Employee Information -> Salary Info)
  const employeeResult = await pool.query(
    `SELECT e.*, si.* 
     FROM employees e
     LEFT JOIN salary_info si ON e.id = si.employee_id
     WHERE e.id = $1`,
    [empId]
  );

  if (employeeResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = employeeResult.rows[0];
  
  // Use only salary_info.monthly_wage (from Employee Information -> Salary Info)
  // Do not use employees.salary - salary must be set in Salary Info section
  const monthlyWage = parseFloat(employee.monthly_wage || 0);
  
  // Validate that employee has salary information in salary_info table
  if (!monthlyWage || monthlyWage <= 0) {
    throw new Error('Employee does not have salary information. Please add salary in Employee Information -> Salary Info section (Monthly Wage field).');
  }
  
  // Get all salary components from salary_info table (Employee Information -> Salary Info)
  // Step 1: Get all salary components from DB (these are distributed, not deducted)
  // Note: basic_salary comes from salary_info table (si.*), not from employees table
  const basicSalary = parseFloat(employee.basic_salary || 0);
  const hra = parseFloat(employee.hra || 0);
  const standardAllowance = parseFloat(employee.standard_allowance || 0);
  const performanceBonus = parseFloat(employee.performance_bonus || 0);
  const leaveTravelAllowance = parseFloat(employee.leave_travel_allowance || 0);
  const foodAllowance = parseFloat(employee.food_allowance || 0);
  const fixedAllowance = parseFloat(employee.fixed_allowance || 0);
  
  // Get percentages from salary_info table (Employee Information -> Salary Info)
  const basicSalaryPercentage = parseFloat(employee.basic_salary_percentage || 0);
  const hraPercentage = parseFloat(employee.hra_percentage || 0);
  const standardAllowancePercentage = parseFloat(employee.standard_allowance_percentage || 0);
  const performanceBonusPercentage = parseFloat(employee.performance_bonus_percentage || 0);
  const leaveTravelAllowancePercentage = parseFloat(employee.leave_travel_allowance_percentage || 0);
  const fixedAllowancePercentage = parseFloat(employee.fixed_allowance_percentage || 0);
  
  // Step 2: Get deduction components from DB (these will be deducted from gross salary)
  const pfEmployee = parseFloat(employee.pf_employee || 0);
  const pfEmployer = parseFloat(employee.pf_employer || 0);
  const professionalTax = parseFloat(employee.professional_tax || 0);
  
  // Get PF percentages from salary_info table
  const pfEmployeePercentage = parseFloat(employee.pf_employee_percentage || 0);
  const pfEmployerPercentage = parseFloat(employee.pf_employer_percentage || 0);
  
  // Use salary_info values if available, otherwise calculate from percentages in salary_info
  // Priority: Use actual amounts from salary_info, if missing use percentages from salary_info
  let calculatedBasicSalary = basicSalary;
  let calculatedHra = hra;
  let calculatedStandardAllowance = standardAllowance;
  let calculatedPerformanceBonus = performanceBonus;
  let calculatedLeaveTravelAllowance = leaveTravelAllowance;
  let calculatedFoodAllowance = foodAllowance;
  let calculatedFixedAllowance = fixedAllowance;
  
  // If salary_info values are missing, calculate from percentages stored in salary_info
  // Note: monthly_wage is required (validated above), so we always have it here
  if (monthlyWage > 0) {
    // Calculate Basic Salary from percentage if amount is missing
    if ((!basicSalary || basicSalary === 0) && basicSalaryPercentage > 0) {
      calculatedBasicSalary = parseFloat((monthlyWage * (basicSalaryPercentage / 100)).toFixed(2));
    }
    
    // Calculate HRA from percentage if amount is missing
    // HRA percentage is based on basic salary, so use calculatedBasicSalary
    if ((!hra || hra === 0) && hraPercentage > 0 && calculatedBasicSalary > 0) {
      calculatedHra = parseFloat((calculatedBasicSalary * (hraPercentage / 100)).toFixed(2));
    }
    
    // Calculate Standard Allowance from percentage if amount is missing
    if ((!standardAllowance || standardAllowance === 0) && standardAllowancePercentage > 0) {
      calculatedStandardAllowance = parseFloat((monthlyWage * (standardAllowancePercentage / 100)).toFixed(2));
    }
    
    // Calculate Performance Bonus from percentage if amount is missing
    if ((!performanceBonus || performanceBonus === 0) && performanceBonusPercentage > 0 && calculatedBasicSalary > 0) {
      calculatedPerformanceBonus = parseFloat((calculatedBasicSalary * (performanceBonusPercentage / 100)).toFixed(2));
    }
    
    // Calculate Leave Travel Allowance from percentage if amount is missing
    if ((!leaveTravelAllowance || leaveTravelAllowance === 0) && leaveTravelAllowancePercentage > 0 && calculatedBasicSalary > 0) {
      calculatedLeaveTravelAllowance = parseFloat((calculatedBasicSalary * (leaveTravelAllowancePercentage / 100)).toFixed(2));
    }
    
    // Food Allowance - keep as is if set, otherwise keep 0 (no default)
    // Food allowance is usually a fixed amount, not percentage-based
    
    // Calculate Fixed Allowance from percentage if amount is missing
    if ((!fixedAllowance || fixedAllowance === 0) && fixedAllowancePercentage > 0) {
      calculatedFixedAllowance = parseFloat((monthlyWage * (fixedAllowancePercentage / 100)).toFixed(2));
    } else if (!fixedAllowance || fixedAllowance === 0) {
      // If fixed allowance percentage is also not set, calculate as remaining amount
      const totalKnownAllowances = calculatedBasicSalary + calculatedHra + calculatedStandardAllowance + 
                                    calculatedPerformanceBonus + calculatedLeaveTravelAllowance + calculatedFoodAllowance;
      calculatedFixedAllowance = Math.max(0, parseFloat((monthlyWage - totalKnownAllowances).toFixed(2)));
    }
  }

  // Step 3: Calculate full gross salary (all components distributed - no deductions yet)
  // Gross Salary = Sum of all salary components (distributed)
  const grossSalary = parseFloat((calculatedBasicSalary + calculatedHra + calculatedStandardAllowance + 
                                   calculatedPerformanceBonus + calculatedLeaveTravelAllowance + 
                                   calculatedFoodAllowance + calculatedFixedAllowance).toFixed(2));

  // Get date range for the month
  const startDate = `${yearInt}-${String(monthInt).padStart(2, '0')}-01`;
  const endDate = new Date(yearInt, monthInt, 0).toISOString().split('T')[0];

  // Get attendance records for the month
  const attendanceResult = await pool.query(
    `SELECT date, status FROM attendance
     WHERE employee_id = $1 AND date BETWEEN $2 AND $3
     ORDER BY date`,
    [empId, startDate, endDate]
  );

  // Get approved leaves for the month
  const leavesResult = await pool.query(
    `SELECT leave_type, start_date, end_date
     FROM leaves
     WHERE employee_id = $1 
     AND status = 'Approved'
     AND start_date <= $3 
     AND end_date >= $2`,
    [empId, startDate, endDate]
  );

  // Calculate working days in the month (excluding weekends)
  const totalWorkingDays = calculateWorkingDaysInMonth(yearInt, monthInt);
  const workingDaysPerWeek = 5; // Standard 5 working days per week

  // Count attendance days (Present status)
  let attendanceDays = 0;
  const attendanceDates = new Set();
  
  attendanceResult.rows.forEach(record => {
    if (record.status === 'Present') {
      const date = new Date(record.date);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Only count weekdays
        attendanceDays++;
        attendanceDates.add(record.date);
      }
    }
  });

  // Count PTO (Paid Time Off) days - only 'Paid time Off' is paid
  // IMPORTANT: Don't count days that are already counted as attendance (Present)
  let paidTimeOffDays = 0;
  const paidTimeOffDates = new Set();
  
  leavesResult.rows.forEach(leave => {
    // Only 'Paid time Off' is paid leave
    if (leave.leave_type === LEAVE_TYPES.PAID_TIME_OFF || 
        leave.leave_type === 'Paid time Off') {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      
      for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        // Only count weekdays within the month
        // Don't count if already counted as attendance (Present) - prevent double counting
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateStr >= startDate && dateStr <= endDate) {
          // Only count if NOT already counted as attendance (Present)
          if (!attendanceDates.has(dateStr)) {
            paidTimeOffDays++;
            paidTimeOffDates.add(dateStr);
          }
        }
      }
    }
  });

  // Count UPTO (Unpaid Time Off) days - includes 'Sick time off' and 'Unpaid Leaves'
  // IMPORTANT: Don't count days that are already counted as attendance (Present) or paid leave
  let unpaidTimeOffDays = 0;
  const unpaidTimeOffDates = new Set();
  
  leavesResult.rows.forEach(leave => {
    // Unpaid leave types: 'Sick time off' and 'Unpaid Leaves' (both are unpaid - salary deducted)
    if (leave.leave_type === LEAVE_TYPES.UNPAID_LEAVES || 
        leave.leave_type === 'Unpaid Leaves' ||
        leave.leave_type === LEAVE_TYPES.SICK_TIME_OFF ||
        leave.leave_type === 'Sick time off') {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      
      for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        // Only count weekdays within the month
        // Don't count if already counted as attendance (Present) or paid leave - prevent double counting
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && dateStr >= startDate && dateStr <= endDate) {
          // Only count if NOT already counted as attendance (Present) or paid leave
          if (!attendanceDates.has(dateStr) && !paidTimeOffDates.has(dateStr)) {
            unpaidTimeOffDays++;
            unpaidTimeOffDates.add(dateStr);
          }
        }
      }
    }
  });

  // Also check attendance records with 'Leave' status that might be unpaid
  // If attendance shows 'Leave' but not in paid leaves, check if it's unpaid (Sick Leave or Unpaid Leaves)
  attendanceResult.rows.forEach(record => {
    if (record.status === 'Leave') {
      const dateStr = record.date;
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      
      // If it's a weekday and not already counted as paid leave (PTO), check if it's unpaid
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !paidTimeOffDates.has(dateStr)) {
        // Check if there's an approved unpaid leave (Sick Leave or Unpaid Leaves) for this date
        const hasUnpaidLeave = leavesResult.rows.some(leave => {
          if (leave.leave_type === LEAVE_TYPES.UNPAID_LEAVES || 
              leave.leave_type === 'Unpaid Leaves' ||
              leave.leave_type === LEAVE_TYPES.SICK_TIME_OFF ||
              leave.leave_type === 'Sick time off') {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            const checkDate = new Date(dateStr);
            return checkDate >= leaveStart && checkDate <= leaveEnd;
          }
          return false;
        });
        
        if (hasUnpaidLeave && !unpaidTimeOffDates.has(dateStr)) {
          unpaidTimeOffDays++;
          unpaidTimeOffDates.add(dateStr);
        }
      }
    }
  });

  // Calculate daily wage rate based on monthly wage (not gross salary)
  // Monthly wage is the base salary, gross salary includes all components which is higher
  const dailyWageRate = parseFloat((monthlyWage / totalWorkingDays).toFixed(2));
  
  // Debug logging (can be removed in production)
  console.log(`[Payroll Calculation] Employee ID: ${empId}, Month: ${monthInt}, Year: ${yearInt}`);
  console.log(`[Payroll Calculation] Monthly Wage: ₹${monthlyWage}, Total Working Days: ${totalWorkingDays}, Daily Rate: ₹${dailyWageRate}`);

  // Calculate amounts
  const attendanceAmount = parseFloat((dailyWageRate * attendanceDays).toFixed(2));
  const paidTimeOffAmount = parseFloat((dailyWageRate * paidTimeOffDays).toFixed(2));
  const unpaidTimeOffAmount = parseFloat((dailyWageRate * unpaidTimeOffDays).toFixed(2));
  
  // Calculate total payable days (Attendance + PTO - UPTO)
  // Note: Overlap is already prevented above (paidTimeOffDays excludes days already in attendanceDays)
  // Unpaid leaves should be deducted from total payable days
  const totalPayableDays = Math.max(0, attendanceDays + paidTimeOffDays - unpaidTimeOffDays);
  
  // Calculate total payable amount (Attendance + PTO - UPTO)
  // Unpaid leaves amount should be deducted from total payable amount
  const totalPayableAmount = Math.max(0, parseFloat((attendanceAmount + paidTimeOffAmount - unpaidTimeOffAmount).toFixed(2)));

  // Step 4: Apply attendance and leave ratio to salary components (pro-rate based on payable days)
  const payableRatio = totalPayableDays / totalWorkingDays;
  
  // Adjust all salary components based on payable days (attendance + paid leaves)
  const adjustedBasicSalary = parseFloat((calculatedBasicSalary * payableRatio).toFixed(2));
  const adjustedHra = parseFloat((calculatedHra * payableRatio).toFixed(2));
  const adjustedStandardAllowance = parseFloat((calculatedStandardAllowance * payableRatio).toFixed(2));
  const adjustedPerformanceBonus = parseFloat((calculatedPerformanceBonus * payableRatio).toFixed(2));
  const adjustedLeaveTravelAllowance = parseFloat((calculatedLeaveTravelAllowance * payableRatio).toFixed(2));
  const adjustedFoodAllowance = parseFloat((calculatedFoodAllowance * payableRatio).toFixed(2));
  const adjustedFixedAllowance = parseFloat((calculatedFixedAllowance * payableRatio).toFixed(2));
  
  // Calculate adjusted gross salary (after attendance/leave adjustment)
  const adjustedGrossSalary = parseFloat((adjustedBasicSalary + adjustedHra + adjustedStandardAllowance + 
                                          adjustedPerformanceBonus + adjustedLeaveTravelAllowance + 
                                          adjustedFoodAllowance + adjustedFixedAllowance).toFixed(2));

  // Step 5: Calculate deductions from adjusted gross salary (PF and Tax Deductions)
  // PF Employee: Use from salary_info or calculate based on percentage from salary_info
  let adjustedPfEmployee = 0;
  if (pfEmployee > 0) {
    // If PF amount is specified, use percentage to calculate from adjusted basic
    const calculatedPfPercentage = calculatedBasicSalary > 0 ? (pfEmployee / calculatedBasicSalary) : (pfEmployeePercentage / 100);
    adjustedPfEmployee = parseFloat((adjustedBasicSalary * calculatedPfPercentage).toFixed(2));
  } else if (pfEmployeePercentage > 0 && adjustedBasicSalary > 0) {
    // Use percentage from salary_info (Employee Information -> Salary Info)
    adjustedPfEmployee = parseFloat((adjustedBasicSalary * (pfEmployeePercentage / 100)).toFixed(2));
  }
  
  // PF Employer: Use from salary_info or calculate based on percentage from salary_info
  let adjustedPfEmployer = 0;
  if (pfEmployer > 0) {
    // If PF amount is specified, use percentage to calculate from adjusted basic
    const calculatedPfPercentage = calculatedBasicSalary > 0 ? (pfEmployer / calculatedBasicSalary) : (pfEmployerPercentage / 100);
    adjustedPfEmployer = parseFloat((adjustedBasicSalary * calculatedPfPercentage).toFixed(2));
  } else if (pfEmployerPercentage > 0 && adjustedBasicSalary > 0) {
    // Use percentage from salary_info (Employee Information -> Salary Info)
    adjustedPfEmployer = parseFloat((adjustedBasicSalary * (pfEmployerPercentage / 100)).toFixed(2));
  }
  
  // Professional Tax: Usually fixed per month (from salary_info)
  const adjustedProfessionalTax = professionalTax || 200;
  
  // Other deductions (can be added from salary_info if fields exist)
  const incomeTax = 0; // Can be calculated based on tax brackets
  const tdsDeduction = 0; // Can be calculated
  const loanDeduction = 0; // Can be stored per employee
  const otherDeductions = 0;
  
  // Total deductions (PF Employee + PF Employer + Professional Tax + Other Tax Deductions)
  const totalDeductions = parseFloat((adjustedPfEmployee + adjustedPfEmployer + adjustedProfessionalTax + 
                                       incomeTax + tdsDeduction + loanDeduction + otherDeductions).toFixed(2));

  // Step 6: Calculate net salary (Adjusted Gross Salary - Total Deductions)
  const netSalary = parseFloat((adjustedGrossSalary - totalDeductions).toFixed(2));

  return {
    // Salary components (adjusted based on attendance/leave)
    basicSalary: adjustedBasicSalary,
    hra: adjustedHra,
    standardAllowance: adjustedStandardAllowance,
    performanceBonus: adjustedPerformanceBonus,
    leaveTravelAllowance: adjustedLeaveTravelAllowance,
    foodAllowance: adjustedFoodAllowance,
    otherAllowances: adjustedFixedAllowance, // Using fixed_allowance as other_allowances
    grossSalary: adjustedGrossSalary,
    
    // Deductions
    pfEmployee: adjustedPfEmployee,
    pfEmployer: adjustedPfEmployer,
    professionalTax: adjustedProfessionalTax,
    incomeTax,
    tdsDeduction,
    loanDeduction,
    otherDeductions,
    totalDeductions,
    netSalary,
    
    // Worked days breakdown
    workedDays: {
      attendanceDays,
      attendanceAmount,
      paidTimeOffDays,
      paidTimeOffAmount,
      unpaidTimeOffDays,
      unpaidTimeOffAmount,
      totalPayableDays,
      totalPayableAmount,
      totalWorkingDays,
      workingDaysPerWeek
    }
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
  body('employeeId').optional().isInt(),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2000 }),
  body('payrunId').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(handleValidationError(errors.array()));
    }

    const { employeeId, month, year, payrunId } = req.body;

    // Generate payrun ID if not provided
    const generatedPayrunId = payrunId || `Payrun ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`;

    // If employeeId is provided, generate for single employee
    if (employeeId) {
      // Ensure employeeId is an integer
      const empId = parseInt(employeeId);
      if (isNaN(empId)) {
        return res.status(400).json({ error: `Invalid employee ID: ${employeeId}` });
      }

      // Check if payroll already exists
      const existing = await pool.query(
        'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
        [empId, parseInt(month), parseInt(year)]
      );

      // Calculate payroll (using monthly wage, not gross salary)
      const payrollData = await calculatePayroll(empId, month, year);

      let payrollId;
      let result;

      if (existing.rows.length > 0) {
        // Update existing payroll (recompute)
        payrollId = existing.rows[0].id;
        result = await pool.query(
          `UPDATE payroll SET
            payrun_id = $2, gross_salary = $3, basic_salary = $4,
            hra = $5, standard_allowance = $6, performance_bonus = $7, 
            leave_travel_allowance = $8, food_allowance = $9, other_allowances = $10,
            pf_employee = $11, pf_employer = $12, professional_tax = $13, 
            income_tax = $14, tds_deduction = $15, loan_deduction = $16, 
            other_deductions = $17, total_deductions = $18, net_salary = $19,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *`,
          [
            payrollId,
            generatedPayrunId,
            parseFloat(payrollData.grossSalary), 
            parseFloat(payrollData.basicSalary),
            parseFloat(payrollData.hra), 
            parseFloat(payrollData.standardAllowance),
            parseFloat(payrollData.performanceBonus),
            parseFloat(payrollData.leaveTravelAllowance),
            parseFloat(payrollData.foodAllowance),
            parseFloat(payrollData.otherAllowances),
            parseFloat(payrollData.pfEmployee), 
            parseFloat(payrollData.pfEmployer),
            parseFloat(payrollData.professionalTax), 
            parseFloat(payrollData.incomeTax),
            parseFloat(payrollData.tdsDeduction),
            parseFloat(payrollData.loanDeduction),
            parseFloat(payrollData.otherDeductions), 
            parseFloat(payrollData.totalDeductions), 
            parseFloat(payrollData.netSalary)
          ]
        );
      } else {
        // Insert new payroll
        result = await pool.query(
          `INSERT INTO payroll (
            employee_id, month, year, payrun_id, gross_salary, basic_salary,
            hra, standard_allowance, performance_bonus, leave_travel_allowance, 
            food_allowance, other_allowances,
            pf_employee, pf_employer, professional_tax, income_tax, tds_deduction,
            loan_deduction, other_deductions, total_deductions, net_salary, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING *`,
          [
            empId, 
            parseInt(month), 
            parseInt(year),
            generatedPayrunId,
            parseFloat(payrollData.grossSalary), 
            parseFloat(payrollData.basicSalary),
            parseFloat(payrollData.hra), 
            parseFloat(payrollData.standardAllowance),
            parseFloat(payrollData.performanceBonus),
            parseFloat(payrollData.leaveTravelAllowance),
            parseFloat(payrollData.foodAllowance),
            parseFloat(payrollData.otherAllowances),
            parseFloat(payrollData.pfEmployee), 
            parseFloat(payrollData.pfEmployer),
            parseFloat(payrollData.professionalTax), 
            parseFloat(payrollData.incomeTax),
            parseFloat(payrollData.tdsDeduction),
            parseFloat(payrollData.loanDeduction),
            parseFloat(payrollData.otherDeductions), 
            parseFloat(payrollData.totalDeductions), 
            parseFloat(payrollData.netSalary),
            PAYROLL_STATUS.PROCESSED
          ]
        );
        payrollId = result.rows[0].id;
      }

      // Insert worked days breakdown
      await pool.query(
        `INSERT INTO worked_days (
          payroll_id, employee_id, attendance_days, attendance_amount,
          paid_time_off_days, paid_time_off_amount,
          unpaid_time_off_days, unpaid_time_off_amount,
          total_payable_days, total_payable_amount, working_days_per_week
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (payroll_id) DO UPDATE SET
          attendance_days = EXCLUDED.attendance_days,
          attendance_amount = EXCLUDED.attendance_amount,
          paid_time_off_days = EXCLUDED.paid_time_off_days,
          paid_time_off_amount = EXCLUDED.paid_time_off_amount,
          unpaid_time_off_days = EXCLUDED.unpaid_time_off_days,
          unpaid_time_off_amount = EXCLUDED.unpaid_time_off_amount,
          total_payable_days = EXCLUDED.total_payable_days,
          total_payable_amount = EXCLUDED.total_payable_amount,
          updated_at = CURRENT_TIMESTAMP`,
        [
          payrollId,
          empId,
          parseFloat(payrollData.workedDays.attendanceDays),
          parseFloat(payrollData.workedDays.attendanceAmount),
          parseFloat(payrollData.workedDays.paidTimeOffDays),
          parseFloat(payrollData.workedDays.paidTimeOffAmount),
          parseFloat(payrollData.workedDays.unpaidTimeOffDays),
          parseFloat(payrollData.workedDays.unpaidTimeOffAmount),
          parseFloat(payrollData.workedDays.totalPayableDays),
          parseFloat(payrollData.workedDays.totalPayableAmount),
          parseInt(payrollData.workedDays.workingDaysPerWeek)
        ]
      );

      res.status(201).json(result.rows[0]);
    } else {
      // Generate for all employees
      const employeesResult = await pool.query('SELECT id FROM employees');
      const employees = employeesResult.rows;
      const generatedPayrolls = [];
      const errors = [];

      if (employees.length === 0) {
        return res.status(400).json({ 
          error: 'No employees found in the system. Please add employees first.' 
        });
      }

      for (const employee of employees) {
        try {
          // Ensure employee.id is an integer
          const employeeId = parseInt(employee.id);
          if (isNaN(employeeId)) {
            errors.push(`Invalid employee ID: ${employee.id}`);
            continue;
          }

          // Check if payroll already exists
          const existing = await pool.query(
            'SELECT id FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
            [employeeId, parseInt(month), parseInt(year)]
          );

          if (existing.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Check if employee has salary information in salary_info table
          const employeeCheck = await pool.query(
            `SELECT e.id, si.monthly_wage 
             FROM employees e 
             LEFT JOIN salary_info si ON e.id = si.employee_id 
             WHERE e.id = $1`,
            [employeeId]
          );

          if (employeeCheck.rows.length === 0) {
            errors.push(`Employee ID ${employeeId}: Employee not found`);
            continue;
          }

          const empData = employeeCheck.rows[0];
          if (!empData.monthly_wage || parseFloat(empData.monthly_wage) <= 0) {
            errors.push(`Employee ID ${employeeId}: No salary information found. Please add salary in Employee Information -> Salary Info section (Monthly Wage field).`);
            continue;
          }

          // Ensure month and year are integers before calling calculatePayroll
          const monthInt = parseInt(month);
          const yearInt = parseInt(year);
          if (isNaN(monthInt) || isNaN(yearInt)) {
            errors.push(`Employee ID ${employeeId}: Invalid month or year: month=${month}, year=${year}`);
            continue;
          }

          // Calculate payroll
          const payrollData = await calculatePayroll(employeeId, monthInt, yearInt);

          // Insert payroll
          const result = await pool.query(
            `INSERT INTO payroll (
              employee_id, month, year, payrun_id, gross_salary, basic_salary,
              hra, standard_allowance, performance_bonus, leave_travel_allowance, 
              food_allowance, other_allowances,
              pf_employee, pf_employer, professional_tax, income_tax, tds_deduction,
              loan_deduction, other_deductions, total_deductions, net_salary, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *`,
            [
              employeeId, 
              monthInt, 
              yearInt,
              generatedPayrunId,
              parseFloat(payrollData.grossSalary), 
              parseFloat(payrollData.basicSalary),
              parseFloat(payrollData.hra), 
              parseFloat(payrollData.standardAllowance),
              parseFloat(payrollData.performanceBonus),
              parseFloat(payrollData.leaveTravelAllowance),
              parseFloat(payrollData.foodAllowance),
              parseFloat(payrollData.otherAllowances),
              parseFloat(payrollData.pfEmployee), 
              parseFloat(payrollData.pfEmployer),
              parseFloat(payrollData.professionalTax), 
              parseFloat(payrollData.incomeTax),
              parseFloat(payrollData.tdsDeduction),
              parseFloat(payrollData.loanDeduction),
              parseFloat(payrollData.otherDeductions), 
              parseFloat(payrollData.totalDeductions), 
              parseFloat(payrollData.netSalary),
              PAYROLL_STATUS.PROCESSED
            ]
          );

          const payrollId = result.rows[0].id;

          // Insert worked days breakdown
          await pool.query(
            `INSERT INTO worked_days (
              payroll_id, employee_id, attendance_days, attendance_amount,
              paid_time_off_days, paid_time_off_amount,
              unpaid_time_off_days, unpaid_time_off_amount,
              total_payable_days, total_payable_amount, working_days_per_week
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (payroll_id) DO UPDATE SET
              attendance_days = EXCLUDED.attendance_days,
              attendance_amount = EXCLUDED.attendance_amount,
              paid_time_off_days = EXCLUDED.paid_time_off_days,
              paid_time_off_amount = EXCLUDED.paid_time_off_amount,
              unpaid_time_off_days = EXCLUDED.unpaid_time_off_days,
              unpaid_time_off_amount = EXCLUDED.unpaid_time_off_amount,
              total_payable_days = EXCLUDED.total_payable_days,
              total_payable_amount = EXCLUDED.total_payable_amount,
              updated_at = CURRENT_TIMESTAMP`,
            [
              payrollId,
              employeeId,
              parseFloat(payrollData.workedDays.attendanceDays),
              parseFloat(payrollData.workedDays.attendanceAmount),
              parseFloat(payrollData.workedDays.paidTimeOffDays),
              parseFloat(payrollData.workedDays.paidTimeOffAmount),
              parseFloat(payrollData.workedDays.unpaidTimeOffDays),
              parseFloat(payrollData.workedDays.unpaidTimeOffAmount),
              parseFloat(payrollData.workedDays.totalPayableDays),
              parseFloat(payrollData.workedDays.totalPayableAmount),
              parseInt(payrollData.workedDays.workingDaysPerWeek)
            ]
          );

          generatedPayrolls.push(result.rows[0]);
        } catch (error) {
          const empId = employee?.id || 'unknown';
          console.error(`Error generating payroll for employee ${empId}:`, error);
          console.error('Error stack:', error.stack);
          
          const errorDetails = {
            timestamp: new Date().toISOString(),
            employeeId: empId,
            month: month,
            year: year,
            generatedPayrunId: generatedPayrunId,
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack,
            errorDetails: {
              length: error.length,
              severity: error.severity,
              code: error.code,
              detail: error.detail,
              hint: error.hint,
              position: error.position,
              internalPosition: error.internalPosition,
              internalQuery: error.internalQuery,
              where: error.where,
              schema: error.schema,
              table: error.table,
              column: error.column,
              dataType: error.dataType,
              constraint: error.constraint,
              file: error.file,
              line: error.line,
              routine: error.routine
            }
          };
          
          console.error('Error details:', errorDetails);
          
          // Save error to JSON file
          try {
            const errorLogPath = path.join(__dirname, '../../error_logs.json');
            let errorLogs = [];
            
            // Read existing errors if file exists
            if (fs.existsSync(errorLogPath)) {
              const fileContent = fs.readFileSync(errorLogPath, 'utf8');
              try {
                errorLogs = JSON.parse(fileContent);
              } catch (e) {
                errorLogs = [];
              }
            }
            
            // Add new error
            errorLogs.push(errorDetails);
            
            // Keep only last 100 errors
            if (errorLogs.length > 100) {
              errorLogs = errorLogs.slice(-100);
            }
            
            // Write to file
            fs.writeFileSync(errorLogPath, JSON.stringify(errorLogs, null, 2), 'utf8');
            console.error(`Error saved to: ${errorLogPath}`);
          } catch (fileError) {
            console.error('Failed to save error to file:', fileError);
          }
          
          errors.push(`Employee ID ${empId}: ${error.message || 'Failed to generate payroll'}`);
          // Continue with other employees
        }
      }

      const response = { 
        message: `Generated payroll for ${generatedPayrolls.length} out of ${employees.length} employees`,
        payrunId: generatedPayrunId,
        count: generatedPayrolls.length,
        totalEmployees: employees.length,
        payrolls: generatedPayrolls
      };

      if (errors.length > 0) {
        response.errors = errors;
        response.warning = `${errors.length} employee(s) were skipped due to errors`;
      }

      if (generatedPayrolls.length === 0) {
        return res.status(400).json({
          error: 'No payroll was generated. All employees either already have payroll for this period or have missing salary information.',
          details: errors,
          totalEmployees: employees.length
        });
      }

      res.status(201).json(response);
    }
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
      `SELECT p.*, e.*, u.username, ps.generated_at, wd.*
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN payslips ps ON ps.payroll_id = p.id
       LEFT JOIN worked_days wd ON wd.payroll_id = p.id
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

// Get payrun list (grouped by payrun_id)
router.get('/payruns', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = `
      SELECT 
        payrun_id,
        month,
        year,
        COUNT(*) as employee_count,
        SUM(gross_salary) as total_gross,
        SUM(basic_salary) as total_basic,
        SUM(net_salary) as total_net,
        SUM(pf_employer) as total_employer_cost,
        MIN(created_at) as created_at
      FROM payroll
      WHERE payrun_id IS NOT NULL
    `;
    const params = [];
    const conditions = [];

    if (month) {
      conditions.push(`month = $${params.length + 1}`);
      params.push(month);
    }

    if (year) {
      conditions.push(`year = $${params.length + 1}`);
      params.push(year);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY payrun_id, month, year ORDER BY year DESC, month DESC, created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get payruns');
    res.status(500).json(errorResponse);
  }
});

// Get payrolls by payrun_id
router.get('/payrun/:payrunId', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { payrunId } = req.params;

    const result = await pool.query(
      `SELECT p.*, e.employee_id, e.first_name, e.last_name
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.payrun_id = $1
       ORDER BY e.first_name`,
      [payrunId]
    );

    res.json(result.rows);
  } catch (error) {
    const errorResponse = handleError(error, 'Get payrun');
    res.status(500).json(errorResponse);
  }
});

// Validate payroll (mark as validated)
router.put('/validate/:payrollId', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { payrollId } = req.params;

    const result = await pool.query(
      `UPDATE payroll 
       SET is_validated = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [payrollId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Payroll'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Validate payroll');
    res.status(500).json(errorResponse);
  }
});

// Validate entire payrun
router.put('/payrun/:payrunId/validate', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { payrunId } = req.params;

    const result = await pool.query(
      `UPDATE payroll 
       SET is_validated = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE payrun_id = $1
       RETURNING id`,
      [payrunId]
    );

    res.json({ 
      message: `Validated ${result.rows.length} payroll records`,
      count: result.rows.length
    });
  } catch (error) {
    const errorResponse = handleError(error, 'Validate payrun');
    res.status(500).json(errorResponse);
  }
});

// Get worked days breakdown for a payroll
router.get('/:payrollId/worked-days', authenticate, async (req, res) => {
  try {
    const { payrollId } = req.params;

    // Check permissions
    const payrollResult = await pool.query(
      'SELECT employee_id FROM payroll WHERE id = $1',
      [payrollId]
    );

    if (payrollResult.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Payroll'));
    }

    if (req.user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [req.user.id]
      );
      if (employeeResult.rows.length === 0 || employeeResult.rows[0].id !== payrollResult.rows[0].employee_id) {
        return res.status(403).json(handleForbiddenError());
      }
    } else if (!['Admin', 'Payroll Officer'].includes(req.user.role)) {
      return res.status(403).json(handleForbiddenError());
    }

    const result = await pool.query(
      `SELECT * FROM worked_days WHERE payroll_id = $1`,
      [payrollId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(handleNotFoundError('Worked days'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    const errorResponse = handleError(error, 'Get worked days');
    res.status(500).json(errorResponse);
  }
});

// Get employees without bank account
router.get('/warnings/no-bank-account', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.bank_account_number,
        e.bank_name,
        m.id as manager_id,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id,
        CASE 
          WHEN m.bank_account_number IS NULL OR m.bank_account_number = '' THEN false
          ELSE true
        END::boolean as manager_has_bank_account
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.bank_account_number IS NULL OR e.bank_account_number = ''
      ORDER BY e.first_name, e.last_name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get employees without bank account error:', error);
    const errorResponse = handleError(error, 'Get employees without bank account');
    res.status(500).json(errorResponse);
  }
});

// Get employees without manager
router.get('/warnings/no-manager', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.manager_id,
        e.bank_account_number,
        e.bank_name
      FROM employees e
      WHERE e.manager_id IS NULL
      ORDER BY e.first_name, e.last_name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get employees without manager error:', error);
    const errorResponse = handleError(error, 'Get employees without manager');
    res.status(500).json(errorResponse);
  }
});

// Get payroll dashboard statistics
router.get('/dashboard', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get warnings
    const warnings = [];
    
    // Employees without bank account
    const noBankResult = await pool.query(
      `SELECT COUNT(*) as count FROM employees 
       WHERE bank_account_number IS NULL OR bank_account_number = ''`
    );
    if (parseInt(noBankResult.rows[0].count) > 0) {
      warnings.push({
        type: 'no_bank_account',
        message: `${noBankResult.rows[0].count} Employee without Bank A/c`,
        count: parseInt(noBankResult.rows[0].count)
      });
    }

    // Employees without bank manager (assuming this means manager_id is null)
    const noManagerResult = await pool.query(
      `SELECT COUNT(*) as count FROM employees WHERE manager_id IS NULL`
    );
    if (parseInt(noManagerResult.rows[0].count) > 0) {
      warnings.push({
        type: 'no_bank_manager',
        message: `${noManagerResult.rows[0].count} Employee without Manager`,
        count: parseInt(noManagerResult.rows[0].count)
      });
    }

    // Get recent payruns
    const payrunsResult = await pool.query(
      `SELECT 
        payrun_id,
        month,
        year,
        COUNT(*) as payslip_count,
        COALESCE(SUM(net_salary), 0) as total_net,
        COALESCE(SUM(pf_employer), 0) as total_employer_cost,
        COALESCE(SUM(gross_salary), 0) as total_gross
       FROM payroll
       WHERE payrun_id IS NOT NULL
       GROUP BY payrun_id, month, year
       ORDER BY year DESC, month DESC
       LIMIT 5`
    );

    // Get statistics for current month
    const statsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(net_salary), 0) as monthly_net,
        COALESCE(SUM(pf_employer), 0) as monthly_employer_cost,
        COALESCE(SUM(gross_salary), 0) as monthly_gross,
        COUNT(*) as employee_count
       FROM payroll
       WHERE month = $1 AND year = $2`,
      [currentMonth, currentYear]
    );

    const stats = statsResult.rows[0] || {
      monthly_net: '0',
      monthly_employer_cost: '0',
      monthly_gross: '0',
      employee_count: '0'
    };

    res.json({
      warnings,
      payruns: payrunsResult.rows.map(payrun => ({
        ...payrun,
        payslip_count: parseInt(payrun.payslip_count) || 0,
        total_net: parseFloat(payrun.total_net) || 0,
        total_employer_cost: parseFloat(payrun.total_employer_cost) || 0,
        total_gross: parseFloat(payrun.total_gross) || 0
      })),
      statistics: {
        monthly_net: parseFloat(stats.monthly_net) || 0,
        monthly_employer_cost: parseFloat(stats.monthly_employer_cost) || 0,
        monthly_gross: parseFloat(stats.monthly_gross) || 0,
        employee_count: parseInt(stats.employee_count) || 0
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    const errorResponse = handleError(error, 'Get dashboard');
    res.status(500).json(errorResponse);
  }
});

export default router;

