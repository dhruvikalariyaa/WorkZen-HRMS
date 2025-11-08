import { useEffect, useState } from 'react';
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
      fetchEmployees();
    } catch (error) {
      alert('Failed to delete employee');
    }
  };

  const handleSendCredentials = async (employee) => {
    if (!window.confirm(`Send login credentials to ${employee.email || 'employee email'}?`)) {
      return;
    }

    try {
      const response = await api.post(`/employees/${employee.id}/send-credentials`);
      if (response.data.emailSent) {
        alert('Credentials email sent successfully!');
      } else {
        alert(`Email could not be sent. Please share credentials manually:\n\nLogin ID: ${response.data.loginId}\nPassword: ${response.data.password}`);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send credentials email');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        {['Admin', 'HR Officer'].includes(user?.role) && (
          <button
            onClick={() => navigate('/employee-info')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Add Employee
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
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Position</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{employee.employee_id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {employee.profile_image_url ? (
                          <img
                            src={employee.profile_image_url}
                            alt={`${employee.first_name} ${employee.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">
                              {employee.first_name?.[0] || 'E'}
                            </span>
                          </div>
                        )}
                        <span>{employee.first_name} {employee.last_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{employee.email}</td>
                    <td className="py-3 px-4">{employee.department || '-'}</td>
                    <td className="py-3 px-4">{employee.position || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {employee.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewEmployee(employee)}
                          className="text-purple-600 hover:underline"
                        >
                          View
                        </button>
                        {['Admin', 'HR Officer'].includes(user?.role) && (
                          <>
                            <button
                              onClick={() => navigate(`/profile/${employee.id}`)}
                              className="text-indigo-600 hover:underline"
                              title="View Full Profile"
                            >
                              Profile
                            </button>
                            <button
                              onClick={() => navigate('/employee-info', { state: { employeeId: employee.id } })}
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSendCredentials(employee)}
                              className="text-green-600 hover:underline"
                              title="Send login credentials via email"
                            >
                              Send Mail
                            </button>
                            <button
                              onClick={() => handleDelete(employee.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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

export default Employees;

