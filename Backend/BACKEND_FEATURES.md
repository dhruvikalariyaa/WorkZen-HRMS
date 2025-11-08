# Backend Features - Matching Wireframes

## ✅ All Backend Features Match Wireframes

### 1. Authentication ✅
- **POST /api/auth/register**
  - Uses `username` (not email)
  - Requires `userType`: Admin, HR Officer, Manager, Employee
  - Validates password confirmation
  - Returns JWT token

- **POST /api/auth/login**
  - Uses `username` (not email)
  - Returns JWT token and user info

- **GET /api/auth/me**
  - Returns current user with employee info if exists

### 2. Employee Management ✅
- **GET /api/employees**
  - Role-based filtering:
    - Employee: Only own data
    - Manager: All employees (read-only)
    - Admin/HR Officer: All employees (with edit/delete)
  - Search functionality
  - Returns: employee_id, first_name, last_name, email, position, hire_date, etc.

- **GET /api/employees/:id**
  - Role-based access control
  - Returns full employee details

- **POST /api/employees**
  - Admin/HR Officer only
  - Fields: employeeId, firstName, lastName, email, phoneNumber, dateOfBirth, gender, address, department, position, hireDate, salary
  - Validates employee ID uniqueness
  - Calculates basic_salary (80% of salary)

- **PUT /api/employees/:id**
  - Employee: Can edit own profile (limited fields)
  - Manager: Cannot edit (read-only)
  - Admin/HR Officer: Can edit all fields
  - Uses: position (not designation), hireDate (not dateOfJoining)

- **DELETE /api/employees/:id**
  - Admin/HR Officer only
  - Cascades delete to related records (attendance, leaves, payroll)

### 3. Attendance Management ✅
- **GET /api/attendance**
  - Role-based filtering:
    - Employee: Only own attendance
    - Manager/Admin/HR Officer: All employees
  - Filter by date range, search
  - Returns: employee_id, name, date, check_in, check_out, status, total_hours

- **POST /api/attendance**
  - Employee only
  - Fields: date, status, checkIn, checkOut
  - Calculates total_hours automatically
  - Prevents duplicate entries for same date

- **PUT /api/attendance/:id**
  - Admin/HR Officer only
  - Can update attendance records

### 4. Leave Management ✅
- **GET /api/leaves**
  - Role-based filtering:
    - Employee: Only own leaves
    - Manager/Admin/HR Officer/Payroll Officer: All leaves
  - Filter by status, search
  - Returns: employee_id, name, leave_type, start_date, end_date, status

- **POST /api/leaves**
  - Employee only
  - Fields: leaveType, startDate, endDate, reason
  - Validates date range
  - Prevents overlapping with approved leaves
  - Leave types: Annual Leave, Sick Leave, Casual Leave, Maternity Leave

- **PUT /api/leaves/:id/status**
  - Admin, HR Officer, Manager, Payroll Officer
  - Can approve/reject leave requests
  - Auto-marks attendance as "Leave" when approved

- **GET /api/leaves/types**
  - Returns all leave types

### 5. Payroll Management ✅
- **GET /api/payroll**
  - Admin/Payroll Officer only
  - Filter by month, year, search
  - Returns payroll records with all details

- **POST /api/payroll/generate**
  - Admin/Payroll Officer only
  - Calculates payroll based on:
    - Basic Salary (80% of total salary)
    - HRA (40% of basic, configurable)
    - Conveyance (₹1,600 fixed)
    - Medical Allowance (₹1,250 fixed)
    - Other Allowances
    - PF (12% of basic, configurable)
    - Professional Tax (₹200, configurable)
    - Income Tax (0, can be configured)
    - Loan Deduction (0, can be configured)
    - Other Deductions
  - Adjusts based on attendance (present days + leave days)

- **POST /api/payroll/payslip**
  - Generates payslip for payroll
  - Role-based access (Employee can view own, Admin/Payroll Officer can view all)

- **GET /api/payroll/payslip/:payrollId**
  - Returns payslip with full details
  - Includes all earnings and deductions

### 6. Reports ✅
- **GET /api/reports/attendance**
  - All authenticated users
  - Employee: Only own attendance report
  - Manager/Admin/HR Officer: All employees
  - Filter by date range, employeeId
  - Returns: employee_id, name, department, present_days, absent_days, leave_days, total_hours

- **GET /api/reports/leave**
  - All authenticated users
  - Employee: Only own leave report
  - Manager/Admin/HR Officer: All employees
  - Filter by date range, status, employeeId
  - Returns: employee_id, name, leave_type, start_date, end_date, status

- **GET /api/reports/payroll**
  - All authenticated users
  - Employee: Only own payroll report
  - Manager/Admin/Payroll Officer: All employees
  - Filter by month, year, employeeId
  - Returns: employee_id, name, month, year, gross_salary, net_salary, status

- **GET /api/reports/employee**
  - Admin/HR Officer only
  - Returns: employee_id, first_name, last_name, email, department, position, hire_date

### 7. Dashboard ✅
- **GET /api/dashboard/stats**
  - Role-based statistics:
    - All: Total employees, today's attendance
    - Admin/Payroll Officer: Pending leaves, payroll stats
    - Employee: Only own pending leaves

### 8. Settings ✅
- **GET /api/settings/company**
  - Admin only
  - Returns company information

- **PUT /api/settings/company**
  - Admin only
  - Updates company information

- **GET /api/settings/leave-types**
  - Admin only
  - Returns all leave types

- **POST /api/settings/leave-types**
  - Admin only
  - Creates new leave type

- **PUT /api/settings/leave-types/:id**
  - Admin only
  - Updates leave type

- **DELETE /api/settings/leave-types/:id**
  - Admin only
  - Deletes leave type

- **GET /api/settings/payroll**
  - Admin only
  - Returns payroll settings (PF%, Professional Tax, HRA%)

- **PUT /api/settings/payroll**
  - Admin only
  - Updates payroll settings

## Role Permissions Summary

### Admin
- ✅ Full access to all endpoints
- ✅ Can manage settings
- ✅ Can approve/reject leaves
- ✅ Can generate payroll

### HR Officer
- ✅ Can create/edit/delete employees
- ✅ Can view/edit attendance
- ✅ Can approve/reject leaves
- ✅ Can view reports
- ❌ Cannot access payroll
- ❌ Cannot access settings

### Manager
- ✅ Can view all employees (read-only)
- ✅ Can view attendance (read-only)
- ✅ Can approve/reject leaves
- ✅ Can view reports
- ❌ Cannot create/edit/delete employees
- ❌ Cannot edit attendance
- ❌ Cannot access payroll
- ❌ Cannot access settings

### Payroll Officer
- ✅ Can approve/reject leaves
- ✅ Can generate payroll and payslips
- ✅ Can view reports
- ✅ Can view attendance
- ❌ Cannot create/edit/delete employees
- ❌ Cannot access settings

### Employee
- ✅ Can view own profile
- ✅ Can mark own attendance
- ✅ Can apply for leave
- ✅ Can view own reports
- ❌ Cannot view other employees
- ❌ Cannot access payroll
- ❌ Cannot access settings

## Database Schema ✅
- ✅ `users` table with `username` field
- ✅ `employees` table with `position` and `hire_date`
- ✅ `payroll` table with `income_tax` and `loan_deduction` fields
- ✅ All relationships properly set up with CASCADE deletes

## All Features Match Wireframes! ✅

