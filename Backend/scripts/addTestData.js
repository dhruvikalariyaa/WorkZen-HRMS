import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

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
  let workingDays = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      workingDays.push(new Date(d));
    }
  }
  
  return workingDays;
};

// Add test data for October 2025
const addTestData = async () => {
  try {
    console.log('🚀 Starting to add test data for October 2025...\n');

    // Get all employees
    const employeesResult = await pool.query('SELECT id, employee_id, first_name, last_name FROM employees');
    const employees = employeesResult.rows;

    if (employees.length === 0) {
      console.log('❌ No employees found. Please add employees first.');
      return;
    }

    console.log(`📋 Found ${employees.length} employees\n`);

    const year = 2025;
    const month = 10; // October
    
    // Get total days in month (30 or 31)
    const totalDaysInMonth = getTotalDaysInMonth(year, month);
    const workingDays = calculateWorkingDaysInMonth(year, month);
    
    console.log(`📅 Month: October ${year}`);
    console.log(`   - Total days in month: ${totalDaysInMonth}`);
    console.log(`   - Working days (excluding weekends): ${workingDays.length}`);
    console.log(`   - Adding attendance for ${workingDays.length} working days\n`);

    // Add attendance for all employees
    for (let empIndex = 0; empIndex < employees.length; empIndex++) {
      const employee = employees[empIndex];
      let attendanceCount = 0;
      let leaveCount = 0;

      // Add attendance for most working days (Present status)
      // Skip a few days to simulate some leaves based on employee index
      for (let i = 0; i < workingDays.length; i++) {
        const date = workingDays[i];
        const dateStr = date.toISOString().split('T')[0];
        
        // Skip some days for different employees to simulate leaves
        // Employee 0: Skip first 2 days (will add as Paid Time Off)
        // Employee 1: Skip days 5-6 (will add as Sick Leave)
        // Employee 2: Skip days 10-11 (will add as Unpaid Leave)
        // Other employees: Skip random 1-2 days
        let skipDay = false;
        if (empIndex === 0 && i < 2) skipDay = true;
        else if (empIndex === 1 && i >= 4 && i < 6) skipDay = true;
        else if (empIndex === 2 && i >= 9 && i < 11) skipDay = true;
        else if (empIndex > 2 && i % 15 === 0) skipDay = true; // Skip one day for other employees
        
        if (skipDay) continue;
        
        // Check if attendance already exists
        const existing = await pool.query(
          'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
          [employee.id, dateStr]
        );

        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
             VALUES ($1, $2, 'Present', '09:00', '18:00', 8.0)
             ON CONFLICT (employee_id, date) DO NOTHING`,
            [employee.id, dateStr]
          );
          attendanceCount++;
        }
      }

      console.log(`✅ Employee ${employee.employee_id} (${employee.first_name} ${employee.last_name}): ${attendanceCount} attendance records added`);
    }

    console.log('\n📝 Adding leave records...\n');

    // Add leaves for existing employees based on their index
    for (let empIndex = 0; empIndex < employees.length; empIndex++) {
      const employee = employees[empIndex];
      
      if (empIndex === 0) {
        // First employee: Paid Time Off (Oct 1-2)
        const existingLeave1 = await pool.query(
          'SELECT id FROM leaves WHERE employee_id = $1 AND start_date = $2',
          [employee.id, '2025-10-01']
        );
        
        if (existingLeave1.rows.length === 0) {
          await pool.query(
            `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
             VALUES ($1, 'Paid time Off', '2025-10-01', '2025-10-02', 'Vacation', 'Approved')`,
            [employee.id]
          );
          console.log(`✅ Employee ${employee.employee_id} (${employee.first_name}): Paid Time Off (Oct 1-2) added`);
        }
      } else if (empIndex === 1) {
        // Second employee: Sick Leave (Oct 5-6)
        const existingLeave2 = await pool.query(
          'SELECT id FROM leaves WHERE employee_id = $1 AND start_date = $2',
          [employee.id, '2025-10-05']
        );
        
        if (existingLeave2.rows.length === 0) {
          await pool.query(
            `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
             VALUES ($1, 'Sick time off', '2025-10-05', '2025-10-06', 'Medical', 'Approved')`,
            [employee.id]
          );
          console.log(`✅ Employee ${employee.employee_id} (${employee.first_name}): Sick Leave (Oct 5-6) added`);
        }
      } else if (empIndex === 2) {
        // Third employee: Unpaid Leave (Oct 10-11)
        const existingLeave3 = await pool.query(
          'SELECT id FROM leaves WHERE employee_id = $1 AND start_date = $2',
          [employee.id, '2025-10-10']
        );
        
        if (existingLeave3.rows.length === 0) {
          await pool.query(
            `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
             VALUES ($1, 'Unpaid Leaves', '2025-10-10', '2025-10-11', 'Personal', 'Approved')`,
            [employee.id]
          );
          console.log(`✅ Employee ${employee.employee_id} (${employee.first_name}): Unpaid Leave (Oct 10-11) added`);
        }
      } else {
        // Other employees: Random single day leave (Paid Time Off)
        const skipDayIndex = Math.floor(workingDays.length / 2); // Middle of the month
        if (skipDayIndex < workingDays.length) {
          const leaveDate = workingDays[skipDayIndex];
          const leaveDateStr = leaveDate.toISOString().split('T')[0];
          
          const existingLeave = await pool.query(
            'SELECT id FROM leaves WHERE employee_id = $1 AND start_date = $2',
            [employee.id, leaveDateStr]
          );
          
          if (existingLeave.rows.length === 0) {
            await pool.query(
              `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
               VALUES ($1, 'Paid time Off', $2, $2, 'Personal', 'Approved')`,
              [employee.id, leaveDateStr]
            );
            console.log(`✅ Employee ${employee.employee_id} (${employee.first_name}): Paid Time Off (${leaveDateStr}) added`);
          }
        }
      }
    }

    // Add attendance with 'Leave' status for the leave days
    // IMPORTANT: Clear check_in, check_out, and total_hours for leave days
    for (let empIndex = 0; empIndex < employees.length; empIndex++) {
      const employee = employees[empIndex];
      
      if (empIndex === 0) {
        // First employee: Leave on Oct 1-2
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
           VALUES ($1, '2025-10-01', 'Leave', NULL, NULL, NULL),
                  ($1, '2025-10-02', 'Leave', NULL, NULL, NULL)
           ON CONFLICT (employee_id, date) DO UPDATE SET 
             status = 'Leave',
             check_in = NULL,
             check_out = NULL,
             total_hours = NULL,
             extra_hours = 0`,
          [employee.id]
        );
      } else if (empIndex === 1) {
        // Second employee: Leave on Oct 5-6
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
           VALUES ($1, '2025-10-05', 'Leave', NULL, NULL, NULL),
                  ($1, '2025-10-06', 'Leave', NULL, NULL, NULL)
           ON CONFLICT (employee_id, date) DO UPDATE SET 
             status = 'Leave',
             check_in = NULL,
             check_out = NULL,
             total_hours = NULL,
             extra_hours = 0`,
          [employee.id]
        );
      } else if (empIndex === 2) {
        // Third employee: Leave on Oct 10-11
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
           VALUES ($1, '2025-10-10', 'Leave', NULL, NULL, NULL),
                  ($1, '2025-10-11', 'Leave', NULL, NULL, NULL)
           ON CONFLICT (employee_id, date) DO UPDATE SET 
             status = 'Leave',
             check_in = NULL,
             check_out = NULL,
             total_hours = NULL,
             extra_hours = 0`,
          [employee.id]
        );
      } else {
        // Other employees: Leave on middle of month
        const skipDayIndex = Math.floor(workingDays.length / 2);
        if (skipDayIndex < workingDays.length) {
          const leaveDate = workingDays[skipDayIndex];
          const leaveDateStr = leaveDate.toISOString().split('T')[0];
          
          await pool.query(
            `INSERT INTO attendance (employee_id, date, status, check_in, check_out, total_hours)
             VALUES ($1, $2, 'Leave', NULL, NULL, NULL)
             ON CONFLICT (employee_id, date) DO UPDATE SET 
               status = 'Leave',
               check_in = NULL,
               check_out = NULL,
               total_hours = NULL,
               extra_hours = 0`,
            [employee.id, leaveDateStr]
          );
        }
      }
    }

    console.log('\n✅ Test data added successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total employees processed: ${employees.length}`);
    console.log(`   - Total days in October 2025: ${totalDaysInMonth}`);
    console.log(`   - Working days (excluding weekends): ${workingDays.length}`);
    console.log(`   - Attendance records added for all employees`);
    if (employees.length > 0) {
      console.log(`   - Employee 1 (${employees[0].first_name}): Paid Time Off (Oct 1-2)`);
    }
    if (employees.length > 1) {
      console.log(`   - Employee 2 (${employees[1].first_name}): Sick Leave (Oct 5-6)`);
    }
    if (employees.length > 2) {
      console.log(`   - Employee 3 (${employees[2].first_name}): Unpaid Leave (Oct 10-11)`);
    }
    if (employees.length > 3) {
      console.log(`   - Other employees: Random leaves added`);
    }
    console.log('\n💡 You can now test payroll generation for October 2025!');

  } catch (error) {
    console.error('❌ Error adding test data:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the script
addTestData()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

