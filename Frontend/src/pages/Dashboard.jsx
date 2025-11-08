import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkInStatus, setCheckInStatus] = useState({ checkedIn: false, checkedOut: false, checkIn: null, checkOut: null });
  const [checkInTime, setCheckInTime] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    todayAttendance: { present: 0, absent: 0, leave: 0 },
    pendingLeaves: 0,
    payrollStats: { processed: 0, pending: 0 }
  });
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [leaveDistribution, setLeaveDistribution] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState([]);

  useEffect(() => {
    if (user?.role === 'Employee') {
      fetchCheckInStatus();
      fetchEmployeeDashboardStats();
    } else {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchCheckInStatus = async () => {
    try {
      const response = await api.get('/attendance/today-status');
      setCheckInStatus(response.data);
      if (response.data.checkIn) {
        const [hours, minutes] = response.data.checkIn.split(':');
        const checkInDate = new Date();
        checkInDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setCheckInTime(checkInDate);
      }
    } catch (error) {
      console.error('Failed to fetch check-in status:', error);
    }
  };

  const fetchEmployeeDashboardStats = async () => {
    setLoading(true);
    try {
      // Call the employee-specific dashboard stats API
      const [statsRes, trendsRes, leaveRes] = await Promise.all([
        api.get('/dashboard/employee/stats'),
        api.get('/dashboard/analytics/attendance-trends').catch(() => ({ data: [] })),
        api.get('/dashboard/analytics/leave-distribution').catch(() => ({ data: [] }))
      ]);
      
      setStats(statsRes.data);
      setAttendanceTrends(trendsRes.data);
      setLeaveDistribution(leaveRes.data);
    } catch (error) {
      console.error('Failed to fetch employee dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [statsRes, trendsRes, leaveRes, payrollRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/analytics/attendance-trends').catch(() => ({ data: [] })),
        api.get('/dashboard/analytics/leave-distribution').catch(() => ({ data: [] })),
        api.get('/dashboard/analytics/payroll-summary').catch(() => ({ data: [] }))
      ]);
     
      
      setStats(statsRes.data);
      setAttendanceTrends(trendsRes.data);
      setLeaveDistribution(leaveRes.data);
      setPayrollSummary(payrollRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };
  

  const handleCheckIn = async () => {
    try {
      await api.post('/attendance/checkin');
      toast.success('Checked in successfully!');
      fetchCheckInStatus();
      // Update status to present
      setCheckInStatus({ checkedIn: true, checkedOut: false, checkIn: new Date().toTimeString().slice(0, 5), checkOut: null });
      const now = new Date();
      setCheckInTime(now);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/checkout');
      toast.success('Checked out successfully!');
      fetchCheckInStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    }
  };

  const formatTimeSince = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Employee view - show check-in/check-out with professional design
  if (user?.role === 'Employee') {
    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500">Welcome back, {user?.employee?.first_name || user?.loginId || 'Employee'}</p>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Check-In/Check-Out Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {checkInStatus.checkedIn && !checkInStatus.checkedOut && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Checked in at {checkInStatus.checkIn}</p>
                  <p className="text-sm text-gray-500">Working since {checkInTime ? formatTimeSince(checkInTime) : 'checking...'}</p>
                </div>
              )}
              {checkInStatus.checkedIn && checkInStatus.checkedOut && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Checked in: {checkInStatus.checkIn}</p>
                  <p className="text-sm text-gray-600">Checked out: {checkInStatus.checkOut}</p>
                </div>
              )}
              {!checkInStatus.checkedIn && (
                <p className="text-sm text-gray-600">Not checked in yet</p>
              )}
            </div>
            <div className="flex gap-3">
              {!checkInStatus.checkedIn ? (
                <button
                  onClick={handleCheckIn}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Check IN
                </button>
              ) : !checkInStatus.checkedOut ? (
                <button
                  onClick={handleCheckOut}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Check Out
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Today's Status</p>
                <p className={`text-2xl font-bold ${
                  checkInStatus.checkedIn && !checkInStatus.checkedOut 
                    ? 'text-green-600' 
                    : checkInStatus.checkedOut 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
                }`}>
                  {checkInStatus.checkedIn && !checkInStatus.checkedOut 
                    ? 'Present' 
                    : checkInStatus.checkedOut 
                    ? 'Completed' 
                    : 'Not Started'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Current status</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                checkInStatus.checkedIn && !checkInStatus.checkedOut 
                  ? 'bg-green-50' 
                  : checkInStatus.checkedOut 
                  ? 'bg-blue-50' 
                  : 'bg-gray-50'
              }`}>
                <svg className={`w-6 h-6 ${
                  checkInStatus.checkedIn && !checkInStatus.checkedOut 
                    ? 'text-green-600' 
                    : checkInStatus.checkedOut 
                    ? 'text-blue-600' 
                    : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Leave Requests */}
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/leaves')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Pending Leaves</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</p>
                <p className="text-xs text-gray-500 mt-0.5">Awaiting approval</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* This Month Attendance */}
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/attendance')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">This Month</p>
                <p className="text-2xl font-bold text-purple-600">{stats.thisMonthPresent || stats.todayAttendance?.present || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Days present</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">My Attendance Trends</h2>
                <p className="text-sm text-gray-500 mt-1">Last 7 days overview</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            {attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={attendanceTrends.map(t => ({
                  ...t,
                  date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} name="Present" dot={{ fill: '#10b981', r: 4 }} />
                  <Line type="monotone" dataKey="absent" stroke="#f59e0b" strokeWidth={2.5} name="Absent" dot={{ fill: '#f59e0b', r: 4 }} />
                  <Line type="monotone" dataKey="leave" stroke="#3b82f6" strokeWidth={2.5} name="On Leave" dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">No attendance data available</p>
              </div>
            )}
          </div>

          {/* Leave Distribution Chart */}
          {leaveDistribution.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Leave Distribution</h2>
                  <p className="text-sm text-gray-500 mt-1">Last 30 days breakdown</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={leaveDistribution.map(item => ({ name: item.leave_type, value: item.count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveDistribution.map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin/HR/Manager view - show dashboard statistics
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500">Welcome back, {user?.employee?.first_name || user?.loginId || 'Admin'}</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active workforce</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.312-.5-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.312.5-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Present Today */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
          onClick={() => navigate('/attendance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1">Present Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.todayAttendance.present}</p>
              <p className="text-xs text-gray-500 mt-0.5">Checked in</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Absent Today */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
          onClick={() => navigate('/attendance')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1">Absent Today</p>
              <p className="text-2xl font-bold text-amber-600">{stats.todayAttendance.absent}</p>
              <p className="text-xs text-gray-500 mt-0.5">Not checked in</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* On Leave Today */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
          onClick={() => navigate('/leaves')}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600 mb-1">On Leave Today</p>
              <p className="text-2xl font-bold text-blue-600">{stats.todayAttendance.leave}</p>
              <p className="text-xs text-gray-500 mt-0.5">Approved leaves</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pending Leave Requests */}
        {(['Admin', 'HR Officer', 'Payroll Officer'].includes(user?.role) || user?.role === 'Employee') && (
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/leaves')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Pending Leave Requests</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingLeaves}</p>
                <p className="text-xs text-gray-500 mt-0.5">Awaiting approval</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Stats - Processed */}
        {['Admin', 'Payroll Officer'].includes(user?.role) && (
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/payroll')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Payroll Processed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.payrollStats.processed}</p>
                <p className="text-xs text-gray-500 mt-0.5">This month</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Payroll Stats - Pending */}
        {['Admin', 'Payroll Officer'].includes(user?.role) && (
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/payroll')}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1">Payroll Pending</p>
                <p className="text-2xl font-bold text-red-600">{stats.payrollStats.pending}</p>
                <p className="text-xs text-gray-500 mt-0.5">Requires action</p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Attendance Trends</h2>
              <p className="text-sm text-gray-500 mt-1">Last 7 days overview</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          {attendanceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={attendanceTrends.map(t => ({
                ...t,
                date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} name="Present" dot={{ fill: '#10b981', r: 4 }} />
                <Line type="monotone" dataKey="absent" stroke="#f59e0b" strokeWidth={2.5} name="Absent" dot={{ fill: '#f59e0b', r: 4 }} />
                <Line type="monotone" dataKey="leave" stroke="#3b82f6" strokeWidth={2.5} name="On Leave" dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">No data available</p>
            </div>
          )}
        </div>

        {/* Leave Distribution Chart */}
        {leaveDistribution.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Leave Distribution</h2>
                <p className="text-sm text-gray-500 mt-1">Last 30 days breakdown</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={leaveDistribution.map(item => ({ name: item.leave_type, value: item.count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leaveDistribution.map((entry, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Payroll Summary (Admin/Payroll Officer only) */}
      {['Admin', 'Payroll Officer'].includes(user?.role) && payrollSummary.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Payroll Summary</h2>
              <p className="text-sm text-gray-500 mt-1">Last 6 months overview</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={payrollSummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                formatter={(value) => value.toLocaleString()} 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="processed" fill="#10b981" name="Processed" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#ef4444" name="Pending" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
