import pool from './database.js';

const initDatabase = async () => {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        login_id VARCHAR(255) UNIQUE,
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Employee',
        is_password_changed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(20),
        address TEXT,
        department VARCHAR(100),
        position VARCHAR(100),
        hire_date DATE,
        salary DECIMAL(10, 2),
        basic_salary DECIMAL(10, 2),
        profile_image_url TEXT,
        nationality VARCHAR(100),
        marital_status VARCHAR(20),
        location VARCHAR(255),
        manager_id INTEGER REFERENCES employees(id),
        bank_account_number VARCHAR(50),
        bank_name VARCHAR(255),
        ifsc_code VARCHAR(20),
        pan_number VARCHAR(20),
        uan_number VARCHAR(50),
        bic_code VARCHAR(20),
        about TEXT,
        job_love TEXT,
        interests TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Present',
        check_in TIME,
        check_out TIME,
        total_hours DECIMAL(5, 2),
        extra_hours DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);

    // Add extra_hours column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS extra_hours DECIMAL(5, 2) DEFAULT 0
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        attachment_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add attachment_url column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE leaves 
      ADD COLUMN IF NOT EXISTS attachment_url TEXT
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        gross_salary DECIMAL(10, 2) NOT NULL,
        basic_salary DECIMAL(10, 2) NOT NULL,
        hra DECIMAL(10, 2) DEFAULT 0,
        conveyance DECIMAL(10, 2) DEFAULT 0,
        medical_allowance DECIMAL(10, 2) DEFAULT 0,
        other_allowances DECIMAL(10, 2) DEFAULT 0,
        pf DECIMAL(10, 2) DEFAULT 0,
        professional_tax DECIMAL(10, 2) DEFAULT 0,
        income_tax DECIMAL(10, 2) DEFAULT 0,
        loan_deduction DECIMAL(10, 2) DEFAULT 0,
        other_deductions DECIMAL(10, 2) DEFAULT 0,
        total_deductions DECIMAL(10, 2) DEFAULT 0,
        net_salary DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, month, year)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id SERIAL PRIMARY KEY,
        payroll_id INTEGER REFERENCES payroll(id) ON DELETE CASCADE,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_info (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255),
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        tax_id VARCHAR(100),
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        max_days INTEGER DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_settings (
        id SERIAL PRIMARY KEY,
        pf_percentage DECIMAL(5, 2) DEFAULT 12.00,
        professional_tax_amount DECIMAL(10, 2) DEFAULT 200.00,
        hra_percentage DECIMAL(5, 2) DEFAULT 40.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leave_allocations table for employee-specific leave policies
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_allocations (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(100) NOT NULL,
        allocation_days DECIMAL(10, 2) NOT NULL DEFAULT 0,
        validity_start_date DATE,
        validity_end_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, leave_type)
      )
    `);

    // Insert default leave types (matching wireframe: Paid time off, Sick time off, Unpaid Leaves)
    // First, delete any leave types that are not in the required list
    await pool.query(`
      DELETE FROM leave_types 
      WHERE name NOT IN ('Paid time Off', 'Sick time off', 'Unpaid Leaves')
    `);
    
    // Then insert only the required leave types
    await pool.query(`
      INSERT INTO leave_types (name, max_days, description)
      VALUES 
        ('Paid time Off', 24, 'Paid time off for vacation and personal needs'),
        ('Sick time off', 7, 'Sick leave for medical purposes'),
        ('Unpaid Leaves', 0, 'Unpaid leave for extended time off')
      ON CONFLICT (name) DO UPDATE 
      SET max_days = EXCLUDED.max_days, description = EXCLUDED.description
    `);

    // Insert default payroll settings
    await pool.query(`
      INSERT INTO payroll_settings (pf_percentage, professional_tax_amount, hra_percentage)
      VALUES (12.00, 200.00, 40.00)
      ON CONFLICT DO NOTHING
    `);

    // Create salary_info table for detailed salary components
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_info (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
        wage_type VARCHAR(50) DEFAULT 'Fixed',
        monthly_wage DECIMAL(10, 2) NOT NULL,
        yearly_wage DECIMAL(10, 2),
        basic_salary DECIMAL(10, 2),
        basic_salary_percentage DECIMAL(5, 2),
        hra DECIMAL(10, 2),
        hra_percentage DECIMAL(5, 2),
        standard_allowance DECIMAL(10, 2),
        standard_allowance_percentage DECIMAL(5, 2),
        performance_bonus DECIMAL(10, 2),
        performance_bonus_percentage DECIMAL(5, 2),
        leave_travel_allowance DECIMAL(10, 2),
        leave_travel_allowance_percentage DECIMAL(5, 2),
        fixed_allowance DECIMAL(10, 2),
        fixed_allowance_percentage DECIMAL(5, 2),
        pf_employee DECIMAL(10, 2),
        pf_employee_percentage DECIMAL(5, 2),
        pf_employer DECIMAL(10, 2),
        pf_employer_percentage DECIMAL(5, 2),
        professional_tax DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create employee_skills table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_skills (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        skill_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create employee_certifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_certifications (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        certification_name VARCHAR(255) NOT NULL,
        issuing_organization VARCHAR(255),
        issue_date DATE,
        expiry_date DATE,
        certificate_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to employees table if they don't exist
    await pool.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
      ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20),
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES employees(id),
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS uan_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bic_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS about TEXT,
      ADD COLUMN IF NOT EXISTS job_love TEXT,
      ADD COLUMN IF NOT EXISTS interests TEXT
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export default initDatabase;

