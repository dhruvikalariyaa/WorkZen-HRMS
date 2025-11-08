/**
 * Helper Utility Functions
 * Common functions used across the application
 */

import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import { PASSWORD_CONSTANTS } from './constants.js';

/**
 * Generate a unique Login ID based on company initials, employee name initials, year, and serial number
 * Format: Company initials (2) + Name initials (4) + Year (4) + Serial (4)
 * Example: OIJODO20220001
 * Serial number is sequential across all employees (0001, 0002, 0003, etc.)
 * 
 * @param {string} firstName - Employee's first name
 * @param {string} lastName - Employee's last name
 * @param {Date|string} hireDate - Employee's hire date
 * @returns {Promise<string>} Generated login ID
 */
export const generateLoginId = async (firstName, lastName, hireDate) => {
  try {
    // Get company name from database
    const companyResult = await pool.query('SELECT company_name FROM company_info LIMIT 1');
    if (companyResult.rows.length === 0) {
      throw new Error('Company not registered. Please register company first.');
    }
    
    const companyName = companyResult.rows[0].company_name || 'WORKZEN';
    
    // Extract company initials (first 2 letters, uppercase)
    const companyInitials = companyName.substring(0, 2).toUpperCase();
    
    // Extract employee name initials (first 2 letters of first name + first 2 letters of last name)
    const firstNameInitials = (firstName || '').substring(0, 2).toUpperCase();
    const lastNameInitials = (lastName || '').substring(0, 2).toUpperCase();
    const nameInitials = firstNameInitials + lastNameInitials;
    
    // Extract year from hire date
    const year = hireDate ? new Date(hireDate).getFullYear() : new Date().getFullYear();
    
    // Get total count of all users to generate sequential serial number (0001, 0002, 0003, etc.)
    const serialResult = await pool.query(
      `SELECT COUNT(*) as count FROM users`
    );
    const serialNumber = parseInt(serialResult.rows[0].count) + 1;
    
    // Format: OIJODO20220001 (with sequential serial number)
    const loginId = `${companyInitials}${nameInitials}${year}${String(serialNumber).padStart(4, '0')}`;
    
    return loginId;
  } catch (error) {
    console.error('Generate Login ID error:', error);
    throw error;
  }
};

/**
 * Generate a random password with specified length
 * 
 * @param {number} length - Password length (default: 8)
 * @returns {string} Generated password
 */
export const generatePassword = (length = PASSWORD_CONSTANTS.GENERATED_LENGTH) => {
  const charset = PASSWORD_CONSTANTS.CHARSET;
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};

/**
 * Generate a unique Employee ID based on company prefix
 * Format: PREFIX + 5-digit number (e.g., EMP00001, WORK00001)
 * 
 * @returns {Promise<string>} Generated employee ID
 */
export const generateEmployeeId = async () => {
  try {
    // Get company name for prefix
    const companyResult = await pool.query('SELECT company_name FROM company_info LIMIT 1');
    let prefix = 'EMP';
    
    if (companyResult.rows.length > 0) {
      const companyName = companyResult.rows[0].company_name || 'WORKZEN';
      prefix = companyName.substring(0, 3).toUpperCase();
    }
    
    // Get all employee IDs with the same prefix
    const result = await pool.query(
      `SELECT employee_id FROM employees WHERE employee_id LIKE $1`,
      [`${prefix}%`]
    );
    
    let maxNumber = 0;
    const prefixRegex = new RegExp(`^${prefix}(\\d+)$`);
    
    // Find the highest number in existing employee IDs
    result.rows.forEach(row => {
      const match = row.employee_id.match(prefixRegex);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    const nextNumber = maxNumber + 1;
    
    // Format: PREFIX + 5-digit number (e.g., EMP00001, WORK00001)
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  } catch (error) {
    console.error('Generate Employee ID error:', error);
    // Fallback: use timestamp-based ID
    return `EMP${Date.now().toString().slice(-8)}`;
  }
};

/**
 * Calculate the number of days between two dates (inclusive)
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {number} Number of days
 */
export const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  // +1 to include both start and end dates
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Format date to YYYY-MM-DD string without timezone conversion
 * 
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateString = (date) => {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (typeof date === 'string' && date.includes('T')) {
    // If it's an ISO string, extract just the date part
    return date.split('T')[0];
  }
  return date;
};

/**
 * Get today's date in YYYY-MM-DD format
 * 
 * @returns {string} Today's date
 */
export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Hash a password using bcrypt
 * 
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare a plain text password with a hashed password
 * 
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Get employee ID from user ID
 * 
 * @param {number} userId - User ID
 * @returns {Promise<number|null>} Employee ID or null if not found
 */
export const getEmployeeIdByUserId = async (userId) => {
  const result = await pool.query(
    'SELECT id FROM employees WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
};

