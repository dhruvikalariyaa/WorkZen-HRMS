import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';

const Attendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For Admin/HR/Payroll: daily view or monthly view
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminViewMode, setAdminViewMode] = useState('day'); // 'day' or 'month'
  const [adminSelectedMonth, setAdminSelectedMonth] = useState(new Date().getMonth());
  const [adminSelectedYear, setAdminSelectedYear] = useState(new Date().getFullYear());
  
  // For Employees: monthly view
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState({ presentDays: 0, leaveDays: 0, totalWorkingDays: 0 });
  const [loadingSummary, setLoadingSummary] = useState(false);

  const isEmployee = user?.role === 'Employee';
  const isAdmin = ['Admin', 'HR Officer', 'Payroll Officer'].includes(user?.role);
  const canClockInOut = ['Employee', 'HR Officer', 'Payroll Officer'].includes(user?.role);
  const isHRorPayroll = ['HR Officer', 'Payroll Officer'].includes(user?.role);
  
  // For HR/Payroll: toggle between "All Attendance" and "My Attendance"
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);

  // Initial load
  useEffect(() => {
    fetchAttendance();
    if (canClockInOut && (isEmployee || viewMode === 'my')) {
      fetchSummary();
    }
  }, []);

  // Update summary when month/year changes
  useEffect(() => {
    if (canClockInOut && (isEmployee || viewMode === 'my')) {
      fetchSummary();
    }
  }, [selectedMonth, selectedYear, canClockInOut, viewMode]);

  // Update attendance when date/month/year/view mode changes
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedMonth, selectedYear, canClockInOut, viewMode, adminViewMode, adminSelectedMonth, adminSelectedYear]);

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
        // For admin/HR/Payroll viewing all: get daily or monthly data based on view mode
        if (adminViewMode === 'month') {
          // Monthly view for admin
          const firstDay = new Date(adminSelectedYear, adminSelectedMonth, 1).toISOString().split('T')[0];
          const lastDay = new Date(adminSelectedYear, adminSelectedMonth + 1, 0).toISOString().split('T')[0];
          params.startDate = firstDay;
          params.endDate = lastDay;
        } else {
          // Daily view for admin
          params.date = selectedDate;
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
      setLoadingSummary(true);
      const firstDay = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      const response = await api.get('/attendance/summary', {
        params: { startDate: firstDay, endDate: lastDay }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
      toast.error('Failed to load attendance summary');
    } finally {
      setLoadingSummary(false);
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
      // For admin: navigate based on view mode
      if (adminViewMode === 'month') {
        // Navigate months
        if (direction === 'prev') {
          if (adminSelectedMonth === 0) {
            setAdminSelectedMonth(11);
            setAdminSelectedYear(adminSelectedYear - 1);
          } else {
            setAdminSelectedMonth(adminSelectedMonth - 1);
          }
        } else {
          if (adminSelectedMonth === 11) {
            setAdminSelectedMonth(0);
            setAdminSelectedYear(adminSelectedYear + 1);
          } else {
            setAdminSelectedMonth(adminSelectedMonth + 1);
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
      if (adminViewMode === 'month') {
        return `${getMonthName(adminSelectedMonth)} ${adminSelectedYear}`;
      } else {
        const date = new Date(selectedDate);
        return `${date.getDate()}, ${getMonthName(date.getMonth())} ${date.getFullYear()}`;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#8200db' }}></div>
          <p className="text-gray-600 font-medium">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b-2 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-semibold" style={{ color: '#8200db' }}>Attendance</h1>
                </div>
              <div className="flex items-center gap-3">
                {/* Dropdown for HR/Payroll Officer */}
                {isHRorPayroll && (
                  <div className="relative">
                    <button
                      onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center gap-2 text-sm"
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
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border-2 border-gray-200 z-20">
                          <button
                            onClick={() => {
                              setViewMode('all');
                              setSearchTerm('');
                              setShowViewModeDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-t-lg transition-colors ${
                              viewMode === 'all'
                                ? 'bg-purple-50 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            style={viewMode === 'all' ? { color: '#8200db' } : {}}
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
                                ? 'bg-purple-50 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            style={viewMode === 'my' ? { color: '#8200db' } : {}}
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
          </div>

          <div className="p-8">

            {/* Date Navigation */}
            <div className="mb-6">
              <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => navigateDate('prev')}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                    >
                      &lt;
                    </button>
                    <div className="flex items-center space-x-2">
                      {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                        <>
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
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
                            className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
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
                          {/* View Mode Toggle for Admin */}
                          <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setAdminViewMode('day')}
                              className={`px-4 py-2 text-sm font-medium transition-all ${
                                adminViewMode === 'day'
                                  ? 'text-white'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              style={adminViewMode === 'day' ? { backgroundColor: '#8200db' } : {}}
                            >
                              Day
                            </button>
                            <button
                              onClick={() => setAdminViewMode('month')}
                              className={`px-4 py-2 text-sm font-medium transition-all ${
                                adminViewMode === 'month'
                                  ? 'text-white'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                              style={adminViewMode === 'month' ? { backgroundColor: '#8200db' } : {}}
                            >
                              Month
                            </button>
                          </div>
                          
                          {adminViewMode === 'month' ? (
                            <>
                              <select
                                value={adminSelectedMonth}
                                onChange={(e) => setAdminSelectedMonth(parseInt(e.target.value))}
                                className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                              >
                                {Array.from({ length: 12 }, (_, i) => (
                                  <option key={i} value={i}>
                                    {getMonthName(i)}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={adminSelectedYear}
                                onChange={(e) => setAdminSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
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
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                            />
                          )}
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => navigateDate('next')}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Boxes for Employees/HR Officer/Payroll Officer (only in My Attendance view) */}
            {canClockInOut && (isEmployee || viewMode === 'my') && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {loadingSummary ? (
                  <div className="col-span-3 text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mb-2" style={{ borderColor: '#8200db' }}></div>
                    <p className="text-gray-600 text-sm">Loading summary...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-4">
                      <p className="text-xs text-gray-600 mb-1">Count of days present</p>
                      <p className="text-2xl font-bold text-gray-800">{summary.presentDays}</p>
                    </div>
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-4">
                      <p className="text-xs text-gray-600 mb-1">Leaves count</p>
                      <p className="text-2xl font-bold text-gray-800">{summary.leaveDays}</p>
                    </div>
                    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-md p-4">
                      <p className="text-xs text-gray-600 mb-1">Total working days</p>
                      <p className="text-2xl font-bold text-gray-800">{summary.totalWorkingDays}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Attendance Table */}
            <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
              <div className="mb-4 p-4 border-b-2 border-gray-200">
                <p className="text-lg font-semibold" style={{ color: '#8200db' }}>{getCurrentDateDisplay()}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#8200db' }}>
                      {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                        <>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Date</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Check In</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Check Out</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Work Hours</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Extra hours</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Emp</th>
                          {adminViewMode === 'month' && (
                            <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Date</th>
                          )}
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Check In</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Check Out</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Work Hours</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Extra hours</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={(!isEmployee && !(isHRorPayroll && viewMode === 'my') && adminViewMode === 'month') ? 6 : 5} className="text-center py-8 text-gray-500 text-sm">
                          No attendance records found
                        </td>
                      </tr>
                    ) : (
                      attendance.map((record, index) => (
                        <tr key={record.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (
                            <>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatDate(record.date)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatTime(record.check_in)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatTime(record.check_out)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatHours(record.total_hours)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatHours(record.extra_hours)}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-4 text-sm text-gray-800">
                                {record.first_name} {record.last_name}
                              </td>
                              {adminViewMode === 'month' && (
                                <td className="py-2 px-4 text-sm text-gray-800">{formatDate(record.date)}</td>
                              )}
                              <td className="py-2 px-4 text-sm text-gray-800">{formatTime(record.check_in)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatTime(record.check_out)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatHours(record.total_hours)}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{formatHours(record.extra_hours)}</td>
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
    </div>
  );
};

export default Attendance;
