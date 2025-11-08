/**
 * Application Constants
 * Centralized configuration values and magic numbers
 */

// Payroll Constants
export const PAYROLL_CONSTANTS = {
  STANDARD_WORK_HOURS: 8,
  BASIC_SALARY_PERCENTAGE: 0.8, // 80% of total salary
  DEFAULT_PF_PERCENTAGE: 12,
  DEFAULT_PROFESSIONAL_TAX: 200,
  DEFAULT_HRA_PERCENTAGE: 40,
  CONVEYANCE_ALLOWANCE: 1600,
  MEDICAL_ALLOWANCE: 1250,
  DEFAULT_WORKING_DAYS_PER_MONTH: 30
};

// Password Constants
export const PASSWORD_CONSTANTS = {
  MIN_LENGTH: 6,
  GENERATED_LENGTH: 8,
  CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'Admin',
  HR_OFFICER: 'HR Officer',
  PAYROLL_OFFICER: 'Payroll Officer',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee'
};

// Leave Types
export const LEAVE_TYPES = {
  PAID_TIME_OFF: 'Paid time Off',
  SICK_TIME_OFF: 'Sick time off',
  UNPAID_LEAVES: 'Unpaid Leaves'
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LEAVE: 'Leave'
};

// Leave Status
export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

// Payroll Status
export const PAYROLL_STATUS = {
  PENDING: 'Pending',
  PROCESSED: 'Processed'
};

// Date Formats
export const DATE_FORMATS = {
  ISO_DATE: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm'
};

