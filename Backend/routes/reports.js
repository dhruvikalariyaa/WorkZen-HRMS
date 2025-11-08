import express from 'express';
import pool from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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

// Helper function to get salary statement data
const getSalaryStatementData = async (employeeId, year) => {
  // Get employee details
  const employeeResult = await pool.query(
    `SELECT e.*, c.company_name, c.address as company_address, c.phone as company_phone, c.email as company_email
     FROM employees e
     LEFT JOIN company_info c ON true
     WHERE e.id = $1
     LIMIT 1`,
    [employeeId]
  );

  if (employeeResult.rows.length === 0) {
    throw new Error('Employee not found');
  }

  const employee = employeeResult.rows[0];

  // Get all payroll records for the year
  const payrollResult = await pool.query(
    `SELECT * FROM payroll 
     WHERE employee_id = $1 AND year = $2 
     ORDER BY month ASC`,
    [employeeId, year]
  );

  const payrollRecords = payrollResult.rows;

  // Calculate yearly totals
  const yearlyTotals = {
    basic_salary: 0,
    hra: 0,
    conveyance: 0,
    medical_allowance: 0,
    other_allowances: 0,
    gross_salary: 0,
    pf: 0,
    professional_tax: 0,
    income_tax: 0,
    loan_deduction: 0,
    other_deductions: 0,
    total_deductions: 0,
    net_salary: 0
  };

  payrollRecords.forEach(record => {
    yearlyTotals.basic_salary += parseFloat(record.basic_salary || 0);
    yearlyTotals.hra += parseFloat(record.hra || 0);
    yearlyTotals.conveyance += parseFloat(record.conveyance || 0);
    yearlyTotals.medical_allowance += parseFloat(record.medical_allowance || 0);
    yearlyTotals.other_allowances += parseFloat(record.other_allowances || 0);
    yearlyTotals.gross_salary += parseFloat(record.gross_salary || 0);
    yearlyTotals.pf += parseFloat(record.pf || 0);
    yearlyTotals.professional_tax += parseFloat(record.professional_tax || 0);
    yearlyTotals.income_tax += parseFloat(record.income_tax || 0);
    yearlyTotals.loan_deduction += parseFloat(record.loan_deduction || 0);
    yearlyTotals.other_deductions += parseFloat(record.other_deductions || 0);
    yearlyTotals.total_deductions += parseFloat(record.total_deductions || 0);
    yearlyTotals.net_salary += parseFloat(record.net_salary || 0);
  });

  // Get monthly average (divide by number of records or 12)
  const monthsWithData = payrollRecords.length || 12;
  const monthlyAverages = {
    basic_salary: yearlyTotals.basic_salary / monthsWithData,
    hra: yearlyTotals.hra / monthsWithData,
    conveyance: yearlyTotals.conveyance / monthsWithData,
    medical_allowance: yearlyTotals.medical_allowance / monthsWithData,
    other_allowances: yearlyTotals.other_allowances / monthsWithData,
    gross_salary: yearlyTotals.gross_salary / monthsWithData,
    pf: yearlyTotals.pf / monthsWithData,
    professional_tax: yearlyTotals.professional_tax / monthsWithData,
    income_tax: yearlyTotals.income_tax / monthsWithData,
    loan_deduction: yearlyTotals.loan_deduction / monthsWithData,
    other_deductions: yearlyTotals.other_deductions / monthsWithData,
    total_deductions: yearlyTotals.total_deductions / monthsWithData,
    net_salary: yearlyTotals.net_salary / monthsWithData
  };

  // Get salary effective from date (first payroll record or hire date)
  const salaryEffectiveFrom = payrollRecords.length > 0 
    ? `${year}-01-01` 
    : employee.hire_date || employee.hire_date;

  return {
    company: {
      name: employee.company_name || '[Company]',
      address: employee.company_address || '',
      phone: employee.company_phone || '',
      email: employee.company_email || ''
    },
    employee: {
      name: `${employee.first_name} ${employee.last_name}`,
      designation: employee.position || '',
      dateOfJoining: employee.hire_date || '',
      salaryEffectiveFrom: salaryEffectiveFrom
    },
    year: year,
    monthly: monthlyAverages,
    yearly: yearlyTotals,
    payrollRecords: payrollRecords
  };
};

// Get salary statement report data
router.get('/salary-statement', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { employeeId, year } = req.query;

    if (!employeeId || !year) {
      return res.status(400).json({ error: 'Employee ID and Year are required' });
    }

    const data = await getSalaryStatementData(parseInt(employeeId), parseInt(year));
    res.json(data);
  } catch (error) {
    console.error('Get salary statement error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Export salary statement as PDF
router.get('/salary-statement/pdf', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { employeeId, year } = req.query;

    if (!employeeId || !year) {
      return res.status(400).json({ error: 'Employee ID and Year are required' });
    }

    const data = await getSalaryStatementData(parseInt(employeeId), parseInt(year));

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Salary_Statement_${data.employee.name.replace(/\s+/g, '_')}_${year}.pdf"`);

    doc.pipe(res);

    // Title
    doc.fontSize(20).fillColor('#0066cc').text('Salary Statement Report', { align: 'center' });
    doc.moveDown();

    // Company Info
    doc.fontSize(14).fillColor('#000000').text(data.company.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666666');
    if (data.company.address) doc.text(data.company.address, { align: 'center' });
    if (data.company.phone) doc.text(`Phone: ${data.company.phone}`, { align: 'center' });
    if (data.company.email) doc.text(`Email: ${data.company.email}`, { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Employee Info
    doc.fontSize(16).fillColor('#000000').text('Salary Statement Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Employee Name: ${data.employee.name}`);
    doc.text(`Designation: ${data.employee.designation || 'N/A'}`);
    doc.text(`Date Of Joining: ${data.employee.dateOfJoining || 'N/A'}`);
    doc.text(`Salary Effective From: ${data.employee.salaryEffectiveFrom || 'N/A'}`);
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#000000');
    
    // Table columns
    const col1 = 50;
    const col2 = 300;
    const col3 = 450;
    const rowHeight = 20;

    // Header row
    doc.font('Helvetica-Bold');
    doc.text('Salary Components', col1, tableTop);
    doc.text('Monthly Amount', col2, tableTop);
    doc.text('Yearly Amount', col3, tableTop);
    doc.moveDown(0.5);
    doc.strokeColor('#000000').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    // Earnings Section
    doc.font('Helvetica-Bold').fillColor('#cc0000').text('Earnings', col1, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');
    
    const earnings = [
      { name: 'Basic', monthly: data.monthly.basic_salary, yearly: data.yearly.basic_salary },
      { name: 'HRA', monthly: data.monthly.hra, yearly: data.yearly.hra },
      { name: 'Conveyance', monthly: data.monthly.conveyance, yearly: data.yearly.conveyance },
      { name: 'Medical Allowance', monthly: data.monthly.medical_allowance, yearly: data.yearly.medical_allowance },
      { name: 'Other Allowances', monthly: data.monthly.other_allowances, yearly: data.yearly.other_allowances }
    ];

    earnings.forEach(item => {
      if (item.monthly > 0 || item.yearly > 0) {
        doc.text(item.name, col1, doc.y);
        doc.text(`₹${item.monthly.toFixed(2)}`, col2, doc.y);
        doc.text(`₹${item.yearly.toFixed(2)}`, col3, doc.y);
        doc.moveDown(0.5);
      }
    });

    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Deductions Section
    doc.font('Helvetica-Bold').fillColor('#cc0000').text('Deduction', col1, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor('#000000');

    const deductions = [
      { name: 'PF', monthly: data.monthly.pf, yearly: data.yearly.pf },
      { name: 'Professional Tax', monthly: data.monthly.professional_tax, yearly: data.yearly.professional_tax },
      { name: 'Income Tax', monthly: data.monthly.income_tax, yearly: data.yearly.income_tax },
      { name: 'Loan Deduction', monthly: data.monthly.loan_deduction, yearly: data.yearly.loan_deduction },
      { name: 'Other Deductions', monthly: data.monthly.other_deductions, yearly: data.yearly.other_deductions }
    ];

    deductions.forEach(item => {
      if (item.monthly > 0 || item.yearly > 0) {
        doc.text(item.name, col1, doc.y);
        doc.text(`₹${item.monthly.toFixed(2)}`, col2, doc.y);
        doc.text(`₹${item.yearly.toFixed(2)}`, col3, doc.y);
        doc.moveDown(0.5);
      }
    });

    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Net Salary
    doc.font('Helvetica-Bold');
    doc.text('Net Salary', col1, doc.y);
    doc.text(`₹${data.monthly.net_salary.toFixed(2)}`, col2, doc.y);
    doc.text(`₹${data.yearly.net_salary.toFixed(2)}`, col3, doc.y);
    doc.moveDown(0.5);
    doc.strokeColor('#000000').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.end();
  } catch (error) {
    console.error('Export salary statement PDF error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Export salary statement as Excel
router.get('/salary-statement/excel', authenticate, authorize('Admin', 'Payroll Officer'), async (req, res) => {
  try {
    const { employeeId, year } = req.query;

    if (!employeeId || !year) {
      return res.status(400).json({ error: 'Employee ID and Year are required' });
    }

    const data = await getSalaryStatementData(parseInt(employeeId), parseInt(year));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salary Statement');

    // Set column widths
    worksheet.getColumn(1).width = 30;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 20;

    // Title
    worksheet.mergeCells('A1:C1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Salary Statement Report';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    // Company Info
    let currentRow = 2;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const companyCell = worksheet.getCell(`A${currentRow}`);
    companyCell.value = data.company.name;
    companyCell.font = { size: 12, bold: true };
    companyCell.alignment = { horizontal: 'center' };
    currentRow++;

    if (data.company.address) {
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = data.company.address;
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      currentRow++;
    }

    // Separator
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getRow(currentRow).height = 1;
    currentRow++;

    // Report Header
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const reportHeader = worksheet.getCell(`A${currentRow}`);
    reportHeader.value = 'Salary Statement Report';
    reportHeader.font = { size: 14, bold: true };
    reportHeader.alignment = { horizontal: 'center' };
    currentRow += 2;

    // Employee Info
    worksheet.getCell(`A${currentRow}`).value = 'Employee Name:';
    worksheet.getCell(`B${currentRow}`).value = data.employee.name;
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Designation:';
    worksheet.getCell(`B${currentRow}`).value = data.employee.designation || 'N/A';
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Date Of Joining:';
    worksheet.getCell(`B${currentRow}`).value = data.employee.dateOfJoining || 'N/A';
    currentRow++;
    worksheet.getCell(`A${currentRow}`).value = 'Salary Effective From:';
    worksheet.getCell(`B${currentRow}`).value = data.employee.salaryEffectiveFrom || 'N/A';
    currentRow += 2;

    // Table Header
    const headerRow = worksheet.getRow(currentRow);
    headerRow.getCell(1).value = 'Salary Components';
    headerRow.getCell(2).value = 'Monthly Amount';
    headerRow.getCell(3).value = 'Yearly Amount';
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;
    currentRow++;

    // Earnings Section
    const earningsHeader = worksheet.getRow(currentRow);
    earningsHeader.getCell(1).value = 'Earnings';
    earningsHeader.getCell(1).font = { bold: true, color: { argb: 'FFCC0000' } };
    earningsHeader.height = 20;
    currentRow++;

    const earnings = [
      { name: 'Basic', monthly: data.monthly.basic_salary, yearly: data.yearly.basic_salary },
      { name: 'HRA', monthly: data.monthly.hra, yearly: data.yearly.hra },
      { name: 'Conveyance', monthly: data.monthly.conveyance, yearly: data.yearly.conveyance },
      { name: 'Medical Allowance', monthly: data.monthly.medical_allowance, yearly: data.yearly.medical_allowance },
      { name: 'Other Allowances', monthly: data.monthly.other_allowances, yearly: data.yearly.other_allowances }
    ];

    earnings.forEach(item => {
      if (item.monthly > 0 || item.yearly > 0) {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = item.name;
        row.getCell(2).value = item.monthly;
        row.getCell(2).numFmt = '₹#,##0.00';
        row.getCell(3).value = item.yearly;
        row.getCell(3).numFmt = '₹#,##0.00';
        currentRow++;
      }
    });

    currentRow++;

    // Deductions Section
    const deductionsHeader = worksheet.getRow(currentRow);
    deductionsHeader.getCell(1).value = 'Deduction';
    deductionsHeader.getCell(1).font = { bold: true, color: { argb: 'FFCC0000' } };
    deductionsHeader.height = 20;
    currentRow++;

    const deductions = [
      { name: 'PF', monthly: data.monthly.pf, yearly: data.yearly.pf },
      { name: 'Professional Tax', monthly: data.monthly.professional_tax, yearly: data.yearly.professional_tax },
      { name: 'Income Tax', monthly: data.monthly.income_tax, yearly: data.yearly.income_tax },
      { name: 'Loan Deduction', monthly: data.monthly.loan_deduction, yearly: data.yearly.loan_deduction },
      { name: 'Other Deductions', monthly: data.monthly.other_deductions, yearly: data.yearly.other_deductions }
    ];

    deductions.forEach(item => {
      if (item.monthly > 0 || item.yearly > 0) {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = item.name;
        row.getCell(2).value = item.monthly;
        row.getCell(2).numFmt = '₹#,##0.00';
        row.getCell(3).value = item.yearly;
        row.getCell(3).numFmt = '₹#,##0.00';
        currentRow++;
      }
    });

    currentRow++;

    // Net Salary
    const netSalaryRow = worksheet.getRow(currentRow);
    netSalaryRow.getCell(1).value = 'Net Salary';
    netSalaryRow.getCell(1).font = { bold: true };
    netSalaryRow.getCell(2).value = data.monthly.net_salary;
    netSalaryRow.getCell(2).numFmt = '₹#,##0.00';
    netSalaryRow.getCell(2).font = { bold: true };
    netSalaryRow.getCell(3).value = data.yearly.net_salary;
    netSalaryRow.getCell(3).numFmt = '₹#,##0.00';
    netSalaryRow.getCell(3).font = { bold: true };
    netSalaryRow.height = 20;

    // Add borders
    const range = worksheet.getCell(`A${headerRow.number}:C${currentRow}`);
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= headerRow.number && rowNumber <= currentRow) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Salary_Statement_${data.employee.name.replace(/\s+/g, '_')}_${year}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export salary statement Excel error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

