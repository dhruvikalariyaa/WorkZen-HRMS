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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showSendCredentialsConfirm, setShowSendCredentialsConfirm] = useState(false);
  const [employeeToSendCredentials, setEmployeeToSendCredentials] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);
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
      setLoadingEmployee(true);
      const response = await api.get(`/employees/${employee.id}`);
      setSelectedEmployee(response.data);
      setShowEmployeeModal(true);
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoadingEmployee(false);
    }
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
    setActionMenuOpen(null);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    try {
      setDeletingEmployee(true);
      await api.delete(`/employees/${employeeToDelete.id}`);
      toast.success('Employee deleted successfully');
      fetchEmployees();
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete employee');
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
    } finally {
      setDeletingEmployee(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setEmployeeToDelete(null);
  };

  const handleSendCredentialsClick = (employee) => {
    setEmployeeToSendCredentials(employee);
    setShowSendCredentialsConfirm(true);
    setActionMenuOpen(null);
  };

  const handleSendCredentialsConfirm = async () => {
    if (!employeeToSendCredentials) return;

    try {
      setSendingCredentials(true);
      const response = await api.post(`/employees/${employeeToSendCredentials.id}/send-credentials`);
      if (response.data.emailSent) {
        toast.success('Credentials email sent successfully!');
      } else {
        toast.info(`Email could not be sent. Please share credentials manually:\n\nLogin ID: ${response.data.loginId}\nPassword: ${response.data.password}`);
      }
      setShowSendCredentialsConfirm(false);
      setEmployeeToSendCredentials(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send credentials email');
      setShowSendCredentialsConfirm(false);
      setEmployeeToSendCredentials(null);
    } finally {
      setSendingCredentials(false);
    }
  };

  const handleSendCredentialsCancel = () => {
    setShowSendCredentialsConfirm(false);
    setEmployeeToSendCredentials(null);
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#8200db' }}></div>
          <p className="text-gray-600 font-medium">Loading employees...</p>
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
                
              </div>
              <div className="flex items-center gap-3">
          <input
            type="text"
                  placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
          />
        {['Admin', 'HR Officer'].includes(user?.role) && (
          <button
            onClick={() => navigate('/employee-info')}
                    className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#8200db' }}
          >
            NEW
          </button>
        )}
      </div>
            </div>
          </div>

          <div className="p-8">
            {employees.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No employees found
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 relative hover:shadow-lg transition-all cursor-pointer"
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
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {actionMenuOpen === employee.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border-2 border-gray-200 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpen(null);
                                  navigate('/employee-info', { state: { employeeId: employee.id } });
                                }}
                                className="w-full flex items-center px-3 py-1.5 hover:bg-purple-50 text-xs transition-colors"
                                style={{ color: '#8200db' }}
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
                                  handleSendCredentialsClick(employee);
                                }}
                                className="w-full flex items-center px-3 py-1.5 hover:bg-blue-50 text-xs text-blue-600 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Send Credentials
                              </button>
              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpen(null);
                                  handleDeleteClick(employee);
                                }}
                                className="w-full flex items-center px-3 py-1.5 hover:bg-red-50 text-xs text-red-600 transition-colors"
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
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: '#8200db20', borderColor: '#8200db' }}>
                          <span className="font-semibold text-2xl" style={{ color: '#8200db' }}>
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
      </div>

      {showEmployeeModal && (
        loadingEmployee ? (
          <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-12 w-full max-w-3xl mx-4 border-2" style={{ borderColor: '#8200db' }}>
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#8200db' }}></div>
                <p className="text-gray-600 font-medium">Loading employee details...</p>
              </div>
            </div>
          </div>
        ) : selectedEmployee ? (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border-2" style={{ borderColor: '#8200db' }}>
            {/* Header */}
            <div className="flex-shrink-0 border-b-2 border-gray-200 px-5 py-4">
              <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-bold" style={{ color: '#8200db' }}>Employee Details</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Complete employee information</p>
                </div>
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8200db #f3f4f6' }}>
              <style>{`
                div::-webkit-scrollbar {
                  width: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: #f3f4f6;
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                  background: #8200db;
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #6d00b8;
                }
              `}</style>
              {/* Profile Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-gray-200">
                <div className="flex items-center space-x-4">
              <div>
                  {selectedEmployee.profile_image_url ? (
                    <img
                      src={selectedEmployee.profile_image_url}
                      alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                        className="w-16 h-16 rounded-full object-cover border-2"
                        style={{ borderColor: '#8200db' }}
                    />
                  ) : (
                      <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 text-2xl font-bold" style={{ backgroundColor: '#8200db20', borderColor: '#8200db', color: '#8200db' }}>
                        {selectedEmployee.first_name?.[0]?.toUpperCase() || 'E'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-0.5">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-1.5">{selectedEmployee.position || 'Employee'}</p>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedEmployee.department || 'N/A'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4a2 2 0 100 4 2 2 0 000-4zm0 0c1.306 0 2.417.835 2.83 2M21 14a3.001 3.001 0 01-2.83 2" />
                        </svg>
                        {selectedEmployee.employee_id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-4">
                <h4 className="text-base font-semibold mb-3 pb-1.5 border-b-2" style={{ color: '#8200db', borderColor: '#8200db' }}>Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Email</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.email || '-'}</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Phone Number</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.phone_number || '-'}</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Date of Birth</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedEmployee.date_of_birth 
                        ? new Date(selectedEmployee.date_of_birth).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Gender</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.gender || '-'}</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3 md:col-span-2">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Address</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="mb-4">
                <h4 className="text-base font-semibold mb-3 pb-1.5 border-b-2" style={{ color: '#8200db', borderColor: '#8200db' }}>Employment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Department</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.department || '-'}</p>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Position</p>
              </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.position || '-'}</p>
              </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Hire Date</p>
              </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedEmployee.hire_date 
                        ? new Date(selectedEmployee.hire_date).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })
                        : '-'}
                    </p>
              </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex items-center mb-1.5">
                      <svg className="w-4 h-4 mr-1.5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-medium text-gray-600">Salary</p>
              </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedEmployee.salary ? `₹${parseFloat(selectedEmployee.salary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</p>
              </div>
              </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 border-t-2 border-gray-200 px-5 py-3 flex justify-end space-x-2">
              {['Admin', 'HR Officer'].includes(user?.role) && (
                <button
                  onClick={() => {
                    setShowEmployeeModal(false);
                    navigate('/employee-info', { state: { employeeId: selectedEmployee.id } });
                  }}
                  className="px-4 py-2 rounded-lg text-xs text-white transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: '#8200db' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        ) : null
      )}

      {/* Send Credentials Confirmation Modal */}
      {showSendCredentialsConfirm && employeeToSendCredentials && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Send Credentials</h3>
                <p className="text-sm text-gray-500 mt-1">Send login credentials via email</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to send login credentials to <span className="font-semibold">{employeeToSendCredentials.email || employeeToSendCredentials.first_name + ' ' + employeeToSendCredentials.last_name}</span>?
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleSendCredentialsCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCredentialsConfirm}
                disabled={sendingCredentials}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sendingCredentials ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{employeeToDelete.first_name} {employeeToDelete.last_name}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                All associated data including attendance, payroll, and profile information will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingEmployee}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingEmployee ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;

