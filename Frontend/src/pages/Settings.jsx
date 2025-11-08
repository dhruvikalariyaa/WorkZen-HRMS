import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    taxId: ''
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [editLeaveTypeData, setEditLeaveTypeData] = useState({
    maxDays: 0,
    description: ''
  });
  const [payrollSettings, setPayrollSettings] = useState({
    pfPercentage: 12,
    professionalTaxAmount: 200,
    hraPercentage: 40
  });

  useEffect(() => {
    fetchCompanyInfo();
    fetchLeaveTypes();
    fetchPayrollSettings();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoles({ ...updatingRoles, [userId]: true });
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      toast.success('User role updated successfully');
      fetchUsers(); // Refresh users list
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user role');
    } finally {
      setUpdatingRoles({ ...updatingRoles, [userId]: false });
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get('/settings/company');
      if (response.data) {
        setCompanyInfo({
          companyName: response.data.company_name || '',
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          taxId: response.data.tax_id || ''
        });
        setCompanyLogoUrl(response.data.logo_url || null);
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/settings/leave-types');
      setLeaveTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchPayrollSettings = async () => {
    try {
      const response = await api.get('/settings/payroll');
      if (response.data) {
        setPayrollSettings({
          pfPercentage: response.data.pf_percentage || 12,
          professionalTaxAmount: response.data.professional_tax_amount || 200,
          hraPercentage: response.data.hra_percentage || 40
        });
      }
    } catch (error) {
      console.error('Failed to fetch payroll settings:', error);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompanyLogo(file);
      setCompanyLogoUrl(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!companyLogo) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('image', companyLogo);

      const response = await api.post('/upload/company/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setCompanyLogoUrl(response.data.imageUrl);
      setCompanyLogo(null);
      toast.success('Company logo uploaded successfully');
      fetchCompanyInfo();
      // Dispatch event to update logo in Layout component
      window.dispatchEvent(new Event('logoUpdated'));
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompanyInfo = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings/company', companyInfo);
      toast.success('Company information saved successfully');
    } catch (error) {
      toast.error('Failed to save company information');
    }
  };

  const handleSavePayrollSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings/payroll', payrollSettings);
      toast.success('Payroll settings saved successfully');
    } catch (error) {
      toast.error('Failed to save payroll settings');
    }
  };

  const handleEditLeaveType = (type) => {
    setEditingLeaveType(type.id);
    setEditLeaveTypeData({
      maxDays: type.max_days || 0,
      description: type.description || ''
    });
  };

  const handleSaveEditLeaveType = async (e, id) => {
    e.preventDefault();
    try {
      await api.put(`/settings/leave-types/${id}`, {
        maxDays: editLeaveTypeData.maxDays,
        description: editLeaveTypeData.description
      });
      setEditingLeaveType(null);
      setEditLeaveTypeData({ maxDays: 0, description: '' });
      fetchLeaveTypes();
      toast.success('Leave type updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update leave type');
    }
  };

  const handleCancelEdit = () => {
    setEditingLeaveType(null);
    setEditLeaveTypeData({ maxDays: 0, description: '' });
  };

  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) {
      return;
    }
    try {
      await api.delete(`/settings/leave-types/${id}`);
      fetchLeaveTypes();
      toast.success('Leave type deleted successfully');
    } catch (error) {
      toast.error('Failed to delete leave type');
    }
  };


  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState({});

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'leave-types', label: 'Leave Types' },
    { id: 'payroll', label: 'Payroll Settings' },
    { id: 'users', label: 'User Setting' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompanyInfo} className="space-y-4 max-w-2xl">
              {/* Company Logo Upload */}
              <div className="mb-6 pb-6 border-b">
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                <div className="flex items-center space-x-4">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt="Company Logo"
                      className="w-32 h-32 object-contain border-2 border-gray-300 rounded-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
                      <span className="text-gray-400">No Logo</span>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="mb-2"
                    />
                    {companyLogo && (
                      <button
                        type="button"
                        onClick={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                      >
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                <input
                  type="text"
                  value={companyInfo.taxId}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
              >
                Save
              </button>
            </form>
          )}

          {activeTab === 'leave-types' && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Leave Types</h2>
                <p className="text-sm text-gray-600 mt-2">
                  System supports only these leave types: Paid time Off, Sick time off, Unpaid Leaves
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Max Days</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((type) => (
                      <tr key={type.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{type.name}</td>
                        {editingLeaveType === type.id ? (
                          <>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={editLeaveTypeData.maxDays}
                                onChange={(e) => setEditLeaveTypeData({ ...editLeaveTypeData, maxDays: parseInt(e.target.value) || 0 })}
                                min="0"
                                className="w-24 px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <textarea
                                value={editLeaveTypeData.description}
                                onChange={(e) => setEditLeaveTypeData({ ...editLeaveTypeData, description: e.target.value })}
                                rows="2"
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => handleSaveEditLeaveType(e, type.id)}
                                  className="text-green-600 hover:underline text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-600 hover:underline text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">{type.max_days}</td>
                            <td className="py-3 px-4">{type.description || '-'}</td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleEditLeaveType(type)}
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <form onSubmit={handleSavePayrollSettings} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PF Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payrollSettings.pfPercentage}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, pfPercentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professional Tax Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payrollSettings.professionalTaxAmount}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, professionalTaxAmount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">HRA Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payrollSettings.hraPercentage}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, hraPercentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
              >
                Save
              </button>
            </form>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  In the Admin Settings, the administrator can assign user access rights based on each user's role.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Access rights can be configured on a module basis, allowing specific permissions for each module.
                </p>
              </div>

              {loadingUsers ? (
                <div className="text-center py-12">Loading users...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">User name</th>
                        <th className="text-left py-3 px-4 font-semibold">Login id</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email || 'N/A'}
                            </td>
                            <td className="py-3 px-4">{user.login_id || '-'}</td>
                            <td className="py-3 px-4">{user.email || '-'}</td>
                            <td className="py-3 px-4">
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                disabled={updatingRoles[user.id]}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                              >
                                <option value="Employee">Employee</option>
                                <option value="HR Officer">HR Officer</option>
                                <option value="Payroll Officer">Payroll Officer</option>
                                <option value="Manager">Manager</option>
                                <option value="Admin">Admin</option>
                              </select>
                              {updatingRoles[user.id] && (
                                <span className="ml-2 text-xs text-gray-500">Updating...</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Select user access rights as per their role and responsibilities. 
                  These access rights define what users are allowed to access and what they are restricted from accessing.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Available roles: <strong>Employee</strong> / <strong>Admin</strong> / <strong>HR Officer</strong> / <strong>Payroll Officer</strong> / <strong>Manager</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

