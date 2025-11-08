import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get full profile with all related data
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    // Check if user can access this profile
    // Employees can only view their own profile
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get employee basic info
    const employeeResult = await pool.query(
      `SELECT e.*, u.login_id, u.email as user_email, u.role,
       m.first_name as manager_first_name, m.last_name as manager_last_name, m.employee_id as manager_employee_id,
       c.company_name
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN employees m ON e.manager_id = m.id
       LEFT JOIN company_info c ON true
       WHERE e.id = $1`,
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];

    // Get skills
    const skillsResult = await pool.query(
      'SELECT id, skill_name FROM employee_skills WHERE employee_id = $1 ORDER BY created_at',
      [employeeId]
    );

    // Get certifications
    const certificationsResult = await pool.query(
      'SELECT * FROM employee_certifications WHERE employee_id = $1 ORDER BY issue_date DESC',
      [employeeId]
    );

    // Get salary info (only for Admin/Payroll Officer)
    let salaryInfo = null;
    if (['Admin', 'Payroll Officer'].includes(req.user.role)) {
      const salaryResult = await pool.query(
        'SELECT * FROM salary_info WHERE employee_id = $1',
        [employeeId]
      );
      salaryInfo = salaryResult.rows[0] || null;
    }

    res.json({
      ...employee,
      skills: skillsResult.rows,
      certifications: certificationsResult.rows,
      salaryInfo
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile basic info
router.put('/:employeeId', authenticate, [
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId } = req.params;
    
    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['Admin', 'HR Officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      firstName, lastName, phoneNumber, dateOfBirth, gender, address,
      nationality, maritalStatus, location, managerId,
      bankAccountNumber, bankName, ifscCode, panNumber, uanNumber, bicCode,
      about, jobLove, interests
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (phoneNumber !== undefined) {
      updateFields.push(`phone_number = $${paramCount++}`);
      values.push(phoneNumber);
    }
    if (dateOfBirth) {
      updateFields.push(`date_of_birth = $${paramCount++}`);
      values.push(dateOfBirth);
    }
    if (gender) {
      updateFields.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (nationality !== undefined) {
      updateFields.push(`nationality = $${paramCount++}`);
      values.push(nationality);
    }
    if (maritalStatus !== undefined) {
      updateFields.push(`marital_status = $${paramCount++}`);
      values.push(maritalStatus);
    }
    if (location !== undefined && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`location = $${paramCount++}`);
      values.push(location);
    }
    if (managerId !== undefined && ['Admin', 'HR Officer'].includes(req.user.role)) {
      updateFields.push(`manager_id = $${paramCount++}`);
      values.push(managerId);
    }
    if (bankAccountNumber !== undefined) {
      updateFields.push(`bank_account_number = $${paramCount++}`);
      values.push(bankAccountNumber);
    }
    if (bankName !== undefined) {
      updateFields.push(`bank_name = $${paramCount++}`);
      values.push(bankName);
    }
    if (ifscCode !== undefined) {
      updateFields.push(`ifsc_code = $${paramCount++}`);
      values.push(ifscCode);
    }
    if (panNumber !== undefined) {
      updateFields.push(`pan_number = $${paramCount++}`);
      values.push(panNumber);
    }
    if (uanNumber !== undefined) {
      updateFields.push(`uan_number = $${paramCount++}`);
      values.push(uanNumber);
    }
    if (bicCode !== undefined) {
      updateFields.push(`bic_code = $${paramCount++}`);
      values.push(bicCode);
    }
    if (about !== undefined) {
      updateFields.push(`about = $${paramCount++}`);
      values.push(about);
    }
    if (jobLove !== undefined) {
      updateFields.push(`job_love = $${paramCount++}`);
      values.push(jobLove);
    }
    if (interests !== undefined) {
      updateFields.push(`interests = $${paramCount++}`);
      values.push(interests);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(employeeId);

    const result = await pool.query(
      `UPDATE employees SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update or create salary info (Admin/Payroll Officer only)
router.put('/:employeeId/salary', authenticate, authorize('Admin', 'Payroll Officer'), [
  body('monthlyWage')
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return false;
      }
      const numValue = parseFloat(value);
      return !isNaN(numValue) && numValue >= 0;
    })
    .withMessage('Monthly wage must be a valid number greater than or equal to 0'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId } = req.params;
    const {
      wageType = 'Fixed',
      monthlyWage,
      basicSalaryPercentage,
      hraPercentage,
      standardAllowance,
      standardAllowancePercentage,
      performanceBonusPercentage,
      leaveTravelAllowancePercentage,
      fixedAllowancePercentage,
      pfEmployeePercentage,
      pfEmployerPercentage,
      professionalTax
    } = req.body;

    // Validate monthlyWage is provided and valid
    const monthlyWageNum = parseFloat(monthlyWage);
    if (isNaN(monthlyWageNum) || monthlyWageNum < 0) {
      return res.status(400).json({ error: 'Monthly wage must be a valid number greater than or equal to 0' });
    }

    // Validate and parse percentage values
    const basicSalaryPercent = parseFloat(basicSalaryPercentage) || 60;
    const hraPercent = parseFloat(hraPercentage) || 10;
    const standardAllowancePercent = parseFloat(standardAllowancePercentage) || 0.5;
    const perfBonusPercent = parseFloat(performanceBonusPercentage) || 8.33;
    const ltaPercent = parseFloat(leaveTravelAllowancePercentage) || 8.33;
    const pfEmpPercent = parseFloat(pfEmployeePercentage) || 12;
    const pfEmpPercentValue = parseFloat(pfEmployerPercentage) || 12;

    // Calculate yearly wage
    const yearlyWage = monthlyWageNum * 12;

    // Calculate basic salary
    const basicSalary = parseFloat((monthlyWageNum * (basicSalaryPercent / 100)).toFixed(2));

    // Calculate HRA
    const hra = parseFloat((basicSalary * (hraPercent / 100)).toFixed(2));

    // Calculate Standard Allowance
    const standardAllowanceValue = standardAllowance ? parseFloat(standardAllowance) : parseFloat((monthlyWageNum * (standardAllowancePercent / 100)).toFixed(2));

    // Calculate Performance Bonus
    const performanceBonus = parseFloat((basicSalary * (perfBonusPercent / 100)).toFixed(2));

    // Calculate Leave Travel Allowance
    const leaveTravelAllowance = parseFloat((basicSalary * (ltaPercent / 100)).toFixed(2));

    // Calculate Fixed Allowance
    let fixedAllowance, finalFixedAllowancePercentage;
    if (fixedAllowancePercentage !== undefined && fixedAllowancePercentage !== null && fixedAllowancePercentage !== '') {
      // If fixedAllowancePercentage is provided, use it
      finalFixedAllowancePercentage = parseFloat(fixedAllowancePercentage);
      fixedAllowance = parseFloat((monthlyWageNum * (finalFixedAllowancePercentage / 100)).toFixed(2));
    } else {
      // Calculate Fixed Allowance (remaining amount)
      const totalComponents = basicSalary + hra + standardAllowanceValue + performanceBonus + leaveTravelAllowance;
      fixedAllowance = parseFloat((monthlyWageNum - totalComponents).toFixed(2));
      finalFixedAllowancePercentage = monthlyWageNum > 0 ? parseFloat(((fixedAllowance / monthlyWageNum) * 100).toFixed(2)) : 0;
    }

    // Calculate PF
    const pfEmployee = parseFloat((basicSalary * (pfEmpPercent / 100)).toFixed(2));
    const pfEmployer = parseFloat((basicSalary * (pfEmpPercentValue / 100)).toFixed(2));

    // Professional Tax
    const profTax = parseFloat(professionalTax) || 200;

    // Check if salary info exists
    const existingResult = await pool.query(
      'SELECT id FROM salary_info WHERE employee_id = $1',
      [employeeId]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE salary_info SET
          wage_type = $1, monthly_wage = $2, yearly_wage = $3,
          basic_salary = $4, basic_salary_percentage = $5,
          hra = $6, hra_percentage = $7,
          standard_allowance = $8, standard_allowance_percentage = $9,
          performance_bonus = $10, performance_bonus_percentage = $11,
          leave_travel_allowance = $12, leave_travel_allowance_percentage = $13,
          fixed_allowance = $14, fixed_allowance_percentage = $15,
          pf_employee = $16, pf_employee_percentage = $17,
          pf_employer = $18, pf_employer_percentage = $19,
          professional_tax = $20,
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $21
        RETURNING *`,
        [
          wageType, monthlyWageNum, yearlyWage,
          basicSalary, basicSalaryPercent,
          hra, hraPercent,
          standardAllowanceValue, standardAllowancePercent,
          performanceBonus, perfBonusPercent,
          leaveTravelAllowance, ltaPercent,
          fixedAllowance, finalFixedAllowancePercentage,
          pfEmployee, pfEmpPercent,
          pfEmployer, pfEmpPercentValue,
          profTax,
          employeeId
        ]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO salary_info (
          employee_id, wage_type, monthly_wage, yearly_wage,
          basic_salary, basic_salary_percentage,
          hra, hra_percentage,
          standard_allowance, standard_allowance_percentage,
          performance_bonus, performance_bonus_percentage,
          leave_travel_allowance, leave_travel_allowance_percentage,
          fixed_allowance, fixed_allowance_percentage,
          pf_employee, pf_employee_percentage,
          pf_employer, pf_employer_percentage,
          professional_tax
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          employeeId, wageType, monthlyWageNum, yearlyWage,
          basicSalary, basicSalaryPercent,
          hra, hraPercent,
          standardAllowanceValue, standardAllowancePercent,
          performanceBonus, perfBonusPercent,
          leaveTravelAllowance, ltaPercent,
          fixedAllowance, finalFixedAllowancePercentage,
          pfEmployee, pfEmpPercent,
          pfEmployer, pfEmpPercentValue,
          profTax
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update salary info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add skill
router.post('/:employeeId/skills', authenticate, [
  body('skillName').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId } = req.params;
    const { skillName } = req.body;

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      'INSERT INTO employee_skills (employee_id, skill_name) VALUES ($1, $2) RETURNING *',
      [employeeId, skillName]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete skill
router.delete('/:employeeId/skills/:skillId', authenticate, async (req, res) => {
  try {
    const { employeeId, skillId } = req.params;

    // Validate skillId
    if (!skillId || skillId === 'undefined' || skillId === 'null') {
      return res.status(400).json({ error: 'Invalid skill ID' });
    }

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Check if skill exists
    const skillCheck = await pool.query(
      'SELECT id FROM employee_skills WHERE id = $1 AND employee_id = $2',
      [skillId, employeeId]
    );

    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    await pool.query('DELETE FROM employee_skills WHERE id = $1 AND employee_id = $2', [skillId, employeeId]);
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add certification
router.post('/:employeeId/certifications', authenticate, [
  body('certificationName').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId } = req.params;
    const { certificationName, issuingOrganization, issueDate, expiryDate, certificateUrl } = req.body;

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const result = await pool.query(
      `INSERT INTO employee_certifications (employee_id, certification_name, issuing_organization, issue_date, expiry_date, certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employeeId, certificationName, issuingOrganization || null, issueDate || null, expiryDate || null, certificateUrl || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete certification
router.delete('/:employeeId/certifications/:certId', authenticate, async (req, res) => {
  try {
    const { employeeId, certId } = req.params;

    // Check permissions
    if (req.user.role === 'Employee') {
      const employeeCheck = await pool.query(
        'SELECT user_id FROM employees WHERE id = $1',
        [employeeId]
      );
      if (employeeCheck.rows.length === 0 || employeeCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await pool.query('DELETE FROM employee_certifications WHERE id = $1 AND employee_id = $2', [certId, employeeId]);
    res.json({ message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('Delete certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

