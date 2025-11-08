import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';

const Attendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // For Admin/HR/Payroll: daily view
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // For Employees: monthly view
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState({ presentDays: 0, leaveDays: 0, totalWorkingDays: 0 });

  const isEmployee = user?.role === 'Employee';
  const isAdmin = ['Admin', 'HR Officer', 'Payroll Officer'].includes(user?.role);
  const canClockInOut = ['Employee', 'HR Officer', 'Payroll Officer'].includes(user?.role);
  const isHRorPayroll = ['HR Officer', 'Payroll Officer'].includes(user?.role);
  
  // For HR/Payroll: toggle between "All Attendance" and "My Attendance"
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);

  useEffect(() => {
    fetchAttendance();
    if (canClockInOut && (isEmployee || viewMode === 'my')) {
      fetchSummary();
    }
  }, [selectedDate, selectedMonth, selectedYear, canClockInOut, viewMode]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (isEmployee || (isHRorPayroll && viewMode === 'my')) {
        // For employees or HR/Payroll viewing their own: get monthly data
        const firstDay = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
        params.startDate = firstDay;
        params.endDate = lastDay;
      } else {
        // For admin/HR/Payroll viewing all: get daily data
        params.date = selectedDate;
        if (searchTerm) {
          params.search = searchTerm;
        }
      }
      
      const response = await api.get('/attendance', { params });
      setAttendance(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const firstDay = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      const response = await api.get('/attendance/summary', {
        params: { startDate: firstDay, endDate: lastDay }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString;
  };

  const formatHours = (hours) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const navigateDate = (direction) => {
    if (isEmployee || (isHRorPayroll && viewMode === 'my')) {
      // Navigate months
      if (direction === 'prev') {
        if (selectedMonth === 0) {
          setSelectedMonth(11);
          setSelectedYear(selectedYear - 1);
        } else {
          setSelectedMonth(selectedMonth - 1);
        }
      } else {
        if (selectedMonth === 11) {
          setSelectedMonth(0);
          setSelectedYear(selectedYear + 1);
        } else {
          setSelectedMonth(selectedMonth + 1);
        }
      }
    } else {
      // Navigate days
      const date = new Date(selectedDate);
      if (direction === 'prev') {
        date.setDate(date.getDate() - 1);
      } else {
        date.setDate(date.getDate() + 1);
      }
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const getCurrentDateDisplay = () => {
    if (isEmployee || (isHRorPayroll && viewMode === 'my')) {
      return `${new Date(selectedYear, selectedMonth, 1).getDate()}, ${getMonthName(selectedMonth)} ${selectedYear}`;
    } else {
      const date = new Date(selectedDate);
      return `${date.getDate()}, ${getMonthName(date.getMonth())} ${date.getFullYear()}`;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Dropdown for HR/Payroll Officer */}
          {isHRorPayroll && (
            <div className="relative">
              <button
                onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
              >
                {viewMode === 'all' ? 'All Attendance' : 'My Attendance'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showViewModeDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowViewModeDropdown(false)}
                  ></div>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <button
                      onClick={() => {
                        setViewMode('all');
                        setSearchTerm('');
                        setShowViewModeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-t-lg transition-colors ${
                        viewMode === 'all'
                          ? 'bg-purple-50 text-purple-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      All Attendance
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('my');
                        setSearchTerm('');
                        setShowViewModeDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-b-lg transition-colors ${
                        viewMode === 'my'
                          ? 'bg-purple-50 text-purple-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      My Attendance
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              &lt;
            </button>
            <div className="flex items-center space-x-2">
              {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {getMonthName(i)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </>
              ) : (
                <>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded"
                  />
                  <span className="px-3 py-1 text-gray-700">Day</span>
                </>
              )}
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              &gt;
            </button>
          </div>
          
          {!isEmployee && viewMode === 'all' && (
            <input
              type="text"
              placeholder="Searchbar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Summary Boxes for Employees/HR Officer/Payroll Officer (only in My Attendance view) */}
      {canClockInOut && (isEmployee || viewMode === 'my') && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Count of days present</p>
            <p className="text-2xl font-bold text-gray-800">{summary.presentDays}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Leaves count</p>
            <p className="text-2xl font-bold text-gray-800">{summary.leaveDays}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">Total working days</p>
            <p className="text-2xl font-bold text-gray-800">{summary.totalWorkingDays}</p>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <p className="text-lg font-semibold text-gray-700">{getCurrentDateDisplay()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                  <>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Check In</th>
                    <th className="text-left py-3 px-4 font-semibold">Check Out</th>
                    <th className="text-left py-3 px-4 font-semibold">Work Hours</th>
                    <th className="text-left py-3 px-4 font-semibold">Extra hours</th>
                  </>
                ) : (
                  <>
                    <th className="text-left py-3 px-4 font-semibold">Emp</th>
                    <th className="text-left py-3 px-4 font-semibold">Check In</th>
                    <th className="text-left py-3 px-4 font-semibold">Check Out</th>
                    <th className="text-left py-3 px-4 font-semibold">Work Hours</th>
                    <th className="text-left py-3 px-4 font-semibold">Extra hours</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                      <>
                        <td className="py-3 px-4">{formatDate(record.date)}</td>
                        <td className="py-3 px-4">{formatTime(record.check_in)}</td>
                        <td className="py-3 px-4">{formatTime(record.check_out)}</td>
                        <td className="py-3 px-4">{formatHours(record.total_hours)}</td>
                        <td className="py-3 px-4">{formatHours(record.extra_hours)}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          {record.first_name} {record.last_name}
                        </td>
                        <td className="py-3 px-4">{formatTime(record.check_in)}</td>
                        <td className="py-3 px-4">{formatTime(record.check_out)}</td>
                        <td className="py-3 px-4">{formatHours(record.total_hours)}</td>
                        <td className="py-3 px-4">{formatHours(record.extra_hours)}</td>
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
  );
};

export default Attendance;
