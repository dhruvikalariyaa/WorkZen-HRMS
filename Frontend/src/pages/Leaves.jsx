import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Leaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [applyLeaveData, setApplyLeaveData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
    fetchLeaveTypes();
  }, [searchTerm, statusFilter]);

  const fetchLeaves = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/leaves', { params });
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types');
      setLeaveTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', applyLeaveData);
      setShowApplyLeave(false);
      fetchLeaves();
      setApplyLeaveData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to apply for leave');
    }
  };

  const handleStatusChange = async (leaveId, status) => {
    try {
      await api.put(`/leaves/${leaveId}/status`, { status });
      fetchLeaves();
    } catch (error) {
      alert('Failed to update leave status');
    }
  };

  const isEmployee = user?.role === 'Employee';
  const canApprove = ['Admin', 'HR Officer', 'Manager', 'Payroll Officer'].includes(user?.role);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEmployee ? 'My Time Off' : 'Time Off'}
        </h1>
        {isEmployee && (
          <button
            onClick={() => setShowApplyLeave(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Apply for Leave
          </button>
        )}
      </div>

      {showApplyLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                <select
                  value={applyLeaveData.leaveType}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, leaveType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={applyLeaveData.startDate}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={applyLeaveData.endDate}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, endDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={applyLeaveData.reason}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowApplyLeave(false)}
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {!isEmployee && <th className="text-left py-3 px-4 font-semibold">Employee ID</th>}
                {!isEmployee && <th className="text-left py-3 px-4 font-semibold">Name</th>}
                <th className="text-left py-3 px-4 font-semibold">Leave Type</th>
                <th className="text-left py-3 px-4 font-semibold">Start Date</th>
                <th className="text-left py-3 px-4 font-semibold">End Date</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                {canApprove && <th className="text-left py-3 px-4 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 5 : canApprove ? 7 : 6} className="text-center py-8 text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="border-b hover:bg-gray-50">
                    {!isEmployee && <td className="py-3 px-4">{leave.employee_id}</td>}
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        {leave.first_name} {leave.last_name}
                      </td>
                    )}
                    <td className="py-3 px-4">{leave.leave_type}</td>
                    <td className="py-3 px-4">{leave.start_date}</td>
                    <td className="py-3 px-4">{leave.end_date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          leave.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : leave.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </td>
                    {canApprove && leave.status === 'Pending' && (
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusChange(leave.id, 'Approved')}
                            className="text-green-600 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(leave.id, 'Rejected')}
                            className="text-red-600 hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                    {canApprove && leave.status !== 'Pending' && (
                      <td className="py-3 px-4">-</td>
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

export default Leaves;

