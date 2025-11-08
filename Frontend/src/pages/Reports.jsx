import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [salaryStatementData, setSalaryStatementData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    month: '',
    year: new Date().getFullYear().toString(),
    status: ''
  });

  // Different report types based on role
  const isEmployee = user?.role === 'Employee';
  const isAdminOrPayroll = ['Admin', 'Payroll Officer'].includes(user?.role);
  
  const adminReportTypes = [
    { id: 'attendance', name: 'Attendance Report' },
    { id: 'leave', name: 'Leave Report' },
    { id: 'salary', name: 'Salary Report' },
    { id: 'salary-statement', name: 'Salary Statement Report' },
    { id: 'employee', name: 'Employee Report' }
  ];

  const employeeReportTypes = [
    { id: 'attendance', name: 'My Attendance Report' },
    { id: 'leave', name: 'My Leave Report' },
    { id: 'salary', name: 'My Salary Report' }
  ];

  const reportTypes = isEmployee ? employeeReportTypes : adminReportTypes;

  useEffect(() => {
    if (isAdminOrPayroll && reportType === 'salary-statement') {
      fetchEmployees();
    }
  }, [reportType, isAdminOrPayroll]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportType) {
      alert('Please select a report type');
      return;
    }

    if (reportType === 'salary-statement') {
      if (!filters.employeeId || !filters.year) {
        alert('Please select an employee and year');
        return;
      }
    }

    setLoading(true);
    try {
      const params = {};
      
      if (reportType === 'attendance') {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (!isEmployee && filters.employeeId) params.employeeId = filters.employeeId;
      } else if (reportType === 'leave') {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (!isEmployee && filters.employeeId) params.employeeId = filters.employeeId;
        if (filters.status) params.status = filters.status;
      } else if (reportType === 'salary' || reportType === 'payroll') {
        if (filters.month) params.month = filters.month;
        if (filters.year) params.year = filters.year;
        if (!isEmployee && filters.employeeId) params.employeeId = filters.employeeId;
      } else if (reportType === 'salary-statement') {
        params.employeeId = filters.employeeId;
        params.year = filters.year;
      }

      let endpoint = reportType === 'salary' ? 'payroll' : reportType;
      if (reportType === 'employee') {
        endpoint = 'employee';
      }
      
      if (reportType === 'salary-statement') {
        const response = await api.get(`/reports/salary-statement`, { params });
        setSalaryStatementData(response.data);
        setReportData(null);
      } else {
        const response = await api.get(`/reports/${endpoint}`, { params });
        setReportData(response.data);
        setSalaryStatementData(null);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!filters.employeeId || !filters.year) {
      alert('Please select an employee and year');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/salary-statement/pdf?employeeId=${filters.employeeId}&year=${filters.year}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary_Statement_${filters.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    if (!filters.employeeId || !filters.year) {
      alert('Please select an employee and year');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/salary-statement/excel?employeeId=${filters.employeeId}&year=${filters.year}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary_Statement_${filters.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Report Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {reportTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                reportType === type.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-800">{type.name}</h3>
            </div>
          ))}
        </div>

        {reportType && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportType === 'salary-statement' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label>
                    <select
                      value={filters.employeeId}
                      onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                </>
              )}
              {(reportType === 'attendance' || reportType === 'leave') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              {(reportType === 'salary' || reportType === 'payroll') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <select
                      value={filters.month}
                      onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">All Months</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
              {reportType === 'leave' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : reportType === 'salary-statement' ? 'View Report' : 'Generate Report'}
              </button>
              {reportType === 'salary-statement' && salaryStatementData && (
                <>
                  <button
                    onClick={handleExportPDF}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Export Excel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {salaryStatementData && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-600 mb-2">Salary Statement Report</h2>
            <h3 className="text-xl font-semibold">{salaryStatementData.company.name}</h3>
            {salaryStatementData.company.address && (
              <p className="text-gray-600">{salaryStatementData.company.address}</p>
            )}
            <hr className="my-4" />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Employee Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Employee Name:</span> {salaryStatementData.employee.name}
              </div>
              <div>
                <span className="font-medium">Designation:</span> {salaryStatementData.employee.designation || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Date Of Joining:</span> {salaryStatementData.employee.dateOfJoining || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Salary Effective From:</span> {salaryStatementData.employee.salaryEffectiveFrom || 'N/A'}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Salary Components</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Monthly Amount</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Yearly Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="3" className="border border-gray-300 px-4 py-2 font-semibold text-red-600">Earnings</td>
                </tr>
                {salaryStatementData.monthly.basic_salary > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Basic</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.basic_salary.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.basic_salary.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.hra > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">HRA</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.hra.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.hra.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.conveyance > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Conveyance</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.conveyance.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.conveyance.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.medical_allowance > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Medical Allowance</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.medical_allowance.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.medical_allowance.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.other_allowances > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Other Allowances</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.other_allowances.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.other_allowances.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan="3" className="border border-gray-300 px-4 py-2 font-semibold text-red-600">Deduction</td>
                </tr>
                {salaryStatementData.monthly.pf > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">PF</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.pf.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.pf.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.professional_tax > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Professional Tax</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.professional_tax.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.professional_tax.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.income_tax > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Income Tax</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.income_tax.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.income_tax.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.loan_deduction > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Loan Deduction</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.loan_deduction.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.loan_deduction.toFixed(2)}</td>
                  </tr>
                )}
                {salaryStatementData.monthly.other_deductions > 0 && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Other Deductions</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.monthly.other_deductions.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{salaryStatementData.yearly.other_deductions.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-bold">
                  <td className="border border-gray-300 px-4 py-3">Net Salary</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">₹{salaryStatementData.monthly.net_salary.toFixed(2)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">₹{salaryStatementData.yearly.net_salary.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {reportTypes.find(t => t.id === reportType)?.name}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {reportType === 'attendance' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Department</th>
                      <th className="text-left py-3 px-4 font-semibold">Present Days</th>
                      <th className="text-left py-3 px-4 font-semibold">Absent Days</th>
                      <th className="text-left py-3 px-4 font-semibold">Leave Days</th>
                      <th className="text-left py-3 px-4 font-semibold">Total Hours</th>
                    </>
                  )}
                  {reportType === 'leave' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Leave Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Start Date</th>
                      <th className="text-left py-3 px-4 font-semibold">End Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </>
                  )}
                  {(reportType === 'salary' || reportType === 'payroll') && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Month</th>
                      <th className="text-left py-3 px-4 font-semibold">Year</th>
                      <th className="text-left py-3 px-4 font-semibold">Gross Salary</th>
                      <th className="text-left py-3 px-4 font-semibold">Net Salary</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </>
                  )}
                  {reportType === 'employee' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Department</th>
                      <th className="text-left py-3 px-4 font-semibold">Position</th>
                      <th className="text-left py-3 px-4 font-semibold">Hire Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  reportData.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {reportType === 'attendance' && (
                        <>
                          <td className="py-3 px-4">{row.employee_id}</td>
                          <td className="py-3 px-4">{row.name}</td>
                          <td className="py-3 px-4">{row.department || '-'}</td>
                          <td className="py-3 px-4">{row.present_days || 0}</td>
                          <td className="py-3 px-4">{row.absent_days || 0}</td>
                          <td className="py-3 px-4">{row.leave_days || 0}</td>
                          <td className="py-3 px-4">{row.total_hours ? `${parseFloat(row.total_hours).toFixed(2)}h` : '-'}</td>
                        </>
                      )}
                      {reportType === 'leave' && (
                        <>
                          <td className="py-3 px-4">{row.employee_id}</td>
                          <td className="py-3 px-4">{row.name}</td>
                          <td className="py-3 px-4">{row.leave_type}</td>
                          <td className="py-3 px-4">{row.start_date}</td>
                          <td className="py-3 px-4">{row.end_date}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                row.status === 'Approved'
                                  ? 'bg-green-100 text-green-800'
                                  : row.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {(reportType === 'salary' || reportType === 'payroll') && (
                        <>
                          <td className="py-3 px-4">{row.employee_id}</td>
                          <td className="py-3 px-4">{row.name}</td>
                          <td className="py-3 px-4">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][row.month - 1]}</td>
                          <td className="py-3 px-4">{row.year}</td>
                          <td className="py-3 px-4">₹{parseFloat(row.gross_salary).toFixed(2)}</td>
                          <td className="py-3 px-4">₹{parseFloat(row.net_salary).toFixed(2)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-sm ${
                                row.status === 'Processed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === 'employee' && (
                        <>
                          <td className="py-3 px-4">{row.employee_id}</td>
                          <td className="py-3 px-4">{row.first_name} {row.last_name}</td>
                          <td className="py-3 px-4">{row.email}</td>
                          <td className="py-3 px-4">{row.department || '-'}</td>
                          <td className="py-3 px-4">{row.position || '-'}</td>
                          <td className="py-3 px-4">{row.hire_date || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
