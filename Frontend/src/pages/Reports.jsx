import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
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
    { id: 'employee', name: 'Employee Report' }
  ];

  const employeeReportTypes = [
    { id: 'attendance', name: 'My Attendance Report' },
    { id: 'leave', name: 'My Leave Report' },
    { id: 'salary', name: 'My Salary Report' }
  ];

  const reportTypes = isEmployee ? employeeReportTypes : adminReportTypes;

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.warning('Please select a report type');
      return;
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
      }

      let endpoint = reportType === 'salary' ? 'payroll' : reportType;
      if (reportType === 'employee') {
        endpoint = 'employee';
      }
      
      const response = await api.get(`/reports/${endpoint}`, { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async (type) => {
    if (!reportData || reportData.length === 0) {
      toast.warning('No data to export');
      return;
    }

    try {
        let csvContent = '';
        let filename = '';

        if (reportType === 'attendance') {
          // CSV header
          csvContent = 'Employee ID,Name,Department,Present Days,Absent Days,Leave Days,Total Hours\n';
          // CSV rows
          reportData.forEach(row => {
            csvContent += `${row.employee_id || ''},"${row.name || ''}","${row.department || ''}",${row.present_days || 0},${row.absent_days || 0},${row.leave_days || 0},"${row.total_hours ? parseFloat(row.total_hours).toFixed(2) + 'h' : '-'}"\n`;
          });
          filename = `Attendance_Report_${filters.startDate || 'all'}_${filters.endDate || 'all'}.csv`;
        } else if (reportType === 'leave') {
          csvContent = 'Employee ID,Name,Leave Type,Start Date,End Date,Status\n';
          reportData.forEach(row => {
            csvContent += `${row.employee_id || ''},"${row.name || ''}","${row.leave_type || ''}","${row.start_date || ''}","${row.end_date || ''}","${row.status || ''}"\n`;
          });
          filename = `Leave_Report_${filters.startDate || 'all'}_${filters.endDate || 'all'}.csv`;
        } else if (reportType === 'salary' || reportType === 'payroll') {
          csvContent = 'Employee ID,Name,Month,Year,Gross Salary,Net Salary,Status\n';
          reportData.forEach(row => {
            const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][row.month - 1] || '';
            csvContent += `${row.employee_id || ''},"${row.name || ''}","${monthName}","${row.year || ''}",${parseFloat(row.gross_salary || 0).toFixed(2)},${parseFloat(row.net_salary || 0).toFixed(2)},"${row.status || ''}"\n`;
          });
          filename = `Salary_Report_${filters.month || 'all'}_${filters.year || 'all'}.csv`;
        } else if (reportType === 'employee') {
          csvContent = 'Employee ID,Name,Email,Department,Position,Hire Date\n';
          reportData.forEach(row => {
            csvContent += `${row.employee_id || ''},"${row.first_name || ''} ${row.last_name || ''}","${row.email || ''}","${row.department || ''}","${row.position || ''}","${row.hire_date || ''}"\n`;
          });
          filename = `Employee_Report.csv`;
        }

        // Create blob and download
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast.error('Failed to export Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
        

          <div className="p-8">
            {/* Report Type Selection */}
            <div className="mb-6">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>Select Report Type</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      reportType === type.id
                        ? 'border-[#8200db] bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <h3 className={`font-semibold ${reportType === type.id ? 'text-[#8200db]' : 'text-gray-800'}`}>{type.name}</h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters Section */}
            {reportType && (
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                  <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(reportType === 'attendance' || reportType === 'leave') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                </>
              )}
              {(reportType === 'salary' || reportType === 'payroll') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={filters.month}
                      onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    >
                      <option value="">All Months</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={filters.year}
                      onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                </>
              )}
              {reportType === 'leave' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              )}
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t-2 border-gray-200">
                  <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: '#8200db' }}
                  >
                    {loading ? 'Generating...' : 'Generate Report'}
                  </button>
                  {reportData && reportData.length > 0 && (
                    <button
                      onClick={() => handleExportExcel(reportType)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Export Excel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      {reportData && (
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>
                  {reportTypes.find(t => t.id === reportType)?.name}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#8200db' }}>
                  {reportType === 'attendance' && (
                    <>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Employee ID</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Department</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Present Days</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Absent Days</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Leave Days</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Total Hours</th>
                    </>
                  )}
                  {reportType === 'leave' && (
                    <>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Employee ID</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Leave Type</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Start Date</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">End Date</th>
                      <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Status</th>
                    </>
                  )}
                  {(reportType === 'salary' || reportType === 'payroll') && (
                    <>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Employee ID</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Month</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Year</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Gross Salary</th>
                      <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Net Salary</th>
                      <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Status</th>
                    </>
                  )}
                  {reportType === 'employee' && (
                    <>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Employee ID</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Email</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Department</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Position</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Hire Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                            No data found
                          </td>
                        </tr>
                      ) : (
                        reportData.map((row, index) => (
                          <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {reportType === 'attendance' && (
                        <>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.employee_id}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.name}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.department || '-'}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-800">{row.present_days || 0}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-800">{row.absent_days || 0}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-800">{row.leave_days || 0}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-800">{row.total_hours ? `${parseFloat(row.total_hours).toFixed(2)}h` : '-'}</td>
                        </>
                      )}
                      {reportType === 'leave' && (
                        <>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.employee_id}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.name}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.leave_type}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.start_date}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.end_date}</td>
                          <td className="py-2 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                row.status === 'Approved'
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : row.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {(reportType === 'salary' || reportType === 'payroll') && (
                        <>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.employee_id}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.name}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][row.month - 1]}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.year}</td>
                          <td className="py-2 px-4 text-right text-sm text-gray-800">₹{parseFloat(row.gross_salary).toFixed(2)}</td>
                          <td className="py-2 px-4 text-right font-semibold text-sm" style={{ color: '#8200db' }}>₹{parseFloat(row.net_salary).toFixed(2)}</td>
                          <td className="py-2 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                row.status === 'Processed'
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </>
                      )}
                      {reportType === 'employee' && (
                        <>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.employee_id}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.first_name} {row.last_name}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.email}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.department || '-'}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.position || '-'}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{row.hire_date || '-'}</td>
                        </>
                      )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
