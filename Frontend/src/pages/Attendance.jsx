import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Attendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [markAttendanceData, setMarkAttendanceData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    checkIn: '',
    checkOut: ''
  });

  useEffect(() => {
    fetchAttendance();
  }, [searchTerm, dateFilter]);

  const fetchAttendance = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (dateFilter) params.date = dateFilter;
      
      const response = await api.get('/attendance', { params });
      setAttendance(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance', markAttendanceData);
      setShowMarkAttendance(false);
      fetchAttendance();
      setMarkAttendanceData({
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        checkIn: '',
        checkOut: ''
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const isEmployee = user?.role === 'Employee';

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEmployee ? 'My Attendance' : 'Attendance'}
        </h1>
        {isEmployee && (
          <button
            onClick={() => setShowMarkAttendance(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Mark Attendance
          </button>
        )}
      </div>

      {showMarkAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark Attendance</h2>
            <form onSubmit={handleMarkAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={markAttendanceData.date}
                  onChange={(e) => setMarkAttendanceData({ ...markAttendanceData, date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={markAttendanceData.status}
                  onChange={(e) => setMarkAttendanceData({ ...markAttendanceData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check In</label>
                <input
                  type="time"
                  value={markAttendanceData.checkIn}
                  onChange={(e) => setMarkAttendanceData({ ...markAttendanceData, checkIn: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check Out</label>
                <input
                  type="time"
                  value={markAttendanceData.checkOut}
                  onChange={(e) => setMarkAttendanceData({ ...markAttendanceData, checkOut: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowMarkAttendance(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex space-x-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {!isEmployee && <th className="text-left py-3 px-4 font-semibold">Employee ID</th>}
                {!isEmployee && <th className="text-left py-3 px-4 font-semibold">Name</th>}
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Check In</th>
                <th className="text-left py-3 px-4 font-semibold">Check Out</th>
                <th className="text-left py-3 px-4 font-semibold">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 5 : 7} className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    {!isEmployee && <td className="py-3 px-4">{record.employee_id}</td>}
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        {record.first_name} {record.last_name}
                      </td>
                    )}
                    <td className="py-3 px-4">{record.date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          record.status === 'Present'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'Leave'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{record.check_in || '-'}</td>
                    <td className="py-3 px-4">{record.check_out || '-'}</td>
                    <td className="py-3 px-4">{record.total_hours ? `${record.total_hours.toFixed(2)}h` : '-'}</td>
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

