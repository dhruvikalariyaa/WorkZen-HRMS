import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm]);

  const fetchEmployees = async () => {
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await api.get('/employees', { params });
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = async (employee) => {
    try {
      const response = await api.get(`/employees/${employee.id}`);
      setSelectedEmployee(response.data);
      setShowEmployeeModal(true);
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const handleSendCredentials = async (employee) => {
    if (!window.confirm(`Send login credentials to ${employee.email || 'employee email'}?`)) {
      return;
    }

    try {
      const response = await api.post(`/employees/${employee.id}/send-credentials`);
      if (response.data.emailSent) {
        toast.success('Credentials email sent successfully!');
      } else {
        toast.info(`Email could not be sent. Please share credentials manually:\n\nLogin ID: ${response.data.loginId}\nPassword: ${response.data.password}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send credentials email');
    }
  };

  const handleActionClick = (e, employeeId) => {
    e.stopPropagation();
    setActionMenuOpen(actionMenuOpen === employeeId ? null : employeeId);
  };

  // Handle click outside to close action menu
  useEffect(() => {
    const handleClickOutside = () => {
      setActionMenuOpen(null);
    };
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'present':
        return <div className="w-3 h-3 bg-green-500 rounded-full" title="Present"></div>;
      case 'on_leave':
        return <span className="text-lg" title="On Leave">✈️</span>;
      case 'absent':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full" title="Absent"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" title="Unknown"></div>;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        <div className="flex items-center gap-4 flex-1 justify-center">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-md w-full"
          />
        </div>
        {['Admin', 'HR Officer'].includes(user?.role) && (
          <button
            onClick={() => navigate('/employee-info')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 whitespace-nowrap"
          >
            NEW
          </button>
        )}
      </div>

      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Employee Details</h2>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-semibold">{selectedEmployee.employee_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <div className="flex items-center space-x-3 mt-1">
                  {selectedEmployee.profile_image_url ? (
                    <img
                      src={selectedEmployee.profile_image_url}
                      alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">
                        {selectedEmployee.first_name?.[0] || 'E'}
                      </span>
                    </div>
                  )}
                  <p className="font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{selectedEmployee.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-semibold">{selectedEmployee.phone_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-semibold">{selectedEmployee.date_of_birth || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-semibold">{selectedEmployee.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-semibold">{selectedEmployee.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-semibold">{selectedEmployee.position || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Hire Date</p>
                <p className="font-semibold">{selectedEmployee.hire_date || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Salary</p>
                <p className="font-semibold">{selectedEmployee.salary ? `₹${parseFloat(selectedEmployee.salary).toFixed(2)}` : '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold">{selectedEmployee.address || '-'}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              {['Admin', 'HR Officer'].includes(user?.role) && (
                <button
                  onClick={() => {
                    setShowEmployeeModal(false);
                    navigate('/employee-info', { state: { employeeId: selectedEmployee.id } });
                  }}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {employees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No employees found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="bg-white border border-gray-200 rounded-lg p-4 relative hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewEmployee(employee)}
              >
                {/* Top Right Section - Status and Action Button */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-center">
                    {getStatusIndicator(employee.attendance_status)}
                  </div>
                  
                  {/* Action Button */}
                  {['Admin', 'HR Officer'].includes(user?.role) && (
                    <div className="relative">
                      <button
                        onClick={(e) => handleActionClick(e, employee.id)}
                        className="flex items-center justify-center text-gray-600 hover:text-gray-800 text-lg"
                        title="Actions"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </button>
                      {actionMenuOpen === employee.id && (
                        <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(null);
                              handleViewEmployee(employee);
                            }}
                            className="w-full flex items-center px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(null);
                              navigate(`/profile/${employee.id}`);
                            }}
                            className="w-full flex items-center px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(null);
                              navigate('/employee-info', { state: { employeeId: employee.id } });
                            }}
                            className="w-full flex items-center px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(null);
                              handleSendCredentials(employee);
                            }}
                            className="w-full flex items-center px-3 py-1.5 hover:bg-gray-100 text-xs text-gray-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send Mail
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(null);
                              handleDelete(employee.id);
                            }}
                            className="w-full flex items-center px-3 py-1.5 hover:bg-red-50 text-xs text-red-600"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Picture */}
                <div className="flex justify-center mb-3">
                  {employee.profile_image_url ? (
                    <img
                      src={employee.profile_image_url}
                      alt={`${employee.first_name} ${employee.last_name}`}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-2xl">
                        {employee.first_name?.[0]?.toUpperCase() || 'E'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="text-center mb-1">
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {employee.first_name} {employee.last_name}
                  </h3>
                </div>

                {/* Role */}
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {employee.role || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Employees;

