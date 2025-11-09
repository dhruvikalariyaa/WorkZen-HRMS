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

  const handleDeleteLeaveTypeClick = (id) => {
    const leaveType = leaveTypes.find(lt => lt.id === id);
    setLeaveTypeToDelete({ id, name: leaveType?.name || 'this leave type' });
    setShowDeleteLeaveTypeConfirm(true);
  };

  const handleDeleteLeaveTypeConfirm = async () => {
    if (!leaveTypeToDelete) return;

    try {
      await api.delete(`/settings/leave-types/${leaveTypeToDelete.id}`);
      fetchLeaveTypes();
      toast.success('Leave type deleted successfully');
      setShowDeleteLeaveTypeConfirm(false);
      setLeaveTypeToDelete(null);
    } catch (error) {
      toast.error('Failed to delete leave type');
      setShowDeleteLeaveTypeConfirm(false);
      setLeaveTypeToDelete(null);
    }
  };

  const handleDeleteLeaveTypeCancel = () => {
    setShowDeleteLeaveTypeConfirm(false);
    setLeaveTypeToDelete(null);
  };


  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState({});
  const [showDeleteLeaveTypeConfirm, setShowDeleteLeaveTypeConfirm] = useState(false);
  const [leaveTypeToDelete, setLeaveTypeToDelete] = useState(null);

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'leave-types', label: 'Leave Types' },
    { id: 'payroll', label: 'Payroll Settings' },
    { id: 'users', label: 'User Setting' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete Leave Type Confirmation Modal */}
      {showDeleteLeaveTypeConfirm && leaveTypeToDelete && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 border-2" style={{ borderColor: '#8200db' }}>
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#ef444420' }}>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Delete Leave Type</h3>
                <p className="text-xs text-gray-600 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-4 pb-4 border-b-2 border-gray-200">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold" style={{ color: '#8200db' }}>{leaveTypeToDelete.name}</span>?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This leave type will be permanently removed from the system.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleDeleteLeaveTypeCancel}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLeaveTypeConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-md hover:shadow-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="border-b-2 border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium text-sm transition-all relative ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: '#8200db' } : {}}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>Company Information</h2>
              </div>
              <form onSubmit={handleSaveCompanyInfo} className="space-y-4 max-w-2xl">
                {/* Company Logo Upload */}
                <div className="mb-6 pb-6 border-b-2 border-gray-200">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Company Logo</label>
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
                        className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                        style={{ backgroundColor: '#8200db' }}
                      >
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={companyInfo.companyName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={companyInfo.phone}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tax ID</label>
                  <input
                    type="text"
                    value={companyInfo.taxId}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#8200db' }}
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'leave-types' && (
            <div className="space-y-6">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>Leave Types</h2>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                System supports only these leave types: Paid time Off, Sick time off, Unpaid Leaves
              </p>

              <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#8200db' }}>
                        <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                        <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Max Days</th>
                        <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Description</th>
                        <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveTypes.map((type, index) => (
                        <tr key={type.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="py-2 px-4 text-sm text-gray-800 font-medium">{type.name}</td>
                          {editingLeaveType === type.id ? (
                            <>
                              <td className="py-2 px-4">
                                <input
                                  type="number"
                                  value={editLeaveTypeData.maxDays}
                                  onChange={(e) => setEditLeaveTypeData({ ...editLeaveTypeData, maxDays: parseInt(e.target.value) || 0 })}
                                  min="0"
                                  className="w-24 px-2 py-1 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                                />
                              </td>
                              <td className="py-2 px-4">
                                <textarea
                                  value={editLeaveTypeData.description}
                                  onChange={(e) => setEditLeaveTypeData({ ...editLeaveTypeData, description: e.target.value })}
                                  rows="2"
                                  className="w-full px-2 py-1 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                                />
                              </td>
                              <td className="py-2 px-4 text-center">
                                <div className="flex space-x-2 justify-center">
                                  <button
                                    onClick={(e) => handleSaveEditLeaveType(e, type.id)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 px-4 text-sm text-gray-800">{type.max_days}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{type.description || '-'}</td>
                              <td className="py-2 px-4 text-center">
                                <button
                                  onClick={() => handleEditLeaveType(type)}
                                  className="px-3 py-1 rounded text-white text-xs font-medium shadow-sm hover:shadow-md transition-all"
                                  style={{ backgroundColor: '#8200db' }}
                                >
                                  Edit
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>Payroll Settings</h2>
              </div>
              <form onSubmit={handleSavePayrollSettings} className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PF Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollSettings.pfPercentage}
                    onChange={(e) => setPayrollSettings({ ...payrollSettings, pfPercentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Professional Tax Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollSettings.professionalTaxAmount}
                    onChange={(e) => setPayrollSettings({ ...payrollSettings, professionalTaxAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">HRA Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollSettings.hraPercentage}
                    onChange={(e) => setPayrollSettings({ ...payrollSettings, hraPercentage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                </div>
                <div className="flex justify-end pt-4 border-t-2 border-gray-200">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg"
                    style={{ backgroundColor: '#8200db' }}
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>User Settings</h2>
              </div>

              {loadingUsers ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mb-3" style={{ borderColor: '#8200db' }}></div>
                  <p className="text-gray-600 text-sm">Loading users...</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: '#8200db' }}>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">User Name</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Login ID</th>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Email</th>
                          <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-8 text-gray-500 text-sm">
                              No users found
                            </td>
                          </tr>
                        ) : (
                          users.map((user, index) => (
                            <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="py-2 px-4 text-sm text-gray-800">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email || 'N/A'}
                              </td>
                              <td className="py-2 px-4 text-sm text-gray-800">{user.login_id || '-'}</td>
                              <td className="py-2 px-4 text-sm text-gray-800">{user.email || '-'}</td>
                              <td className="py-2 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    disabled={updatingRoles[user.id]}
                                    className="px-3 py-1 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all disabled:opacity-50"
                                  >
                                    <option value="Employee">Employee</option>
                                    <option value="HR Officer">HR Officer</option>
                                    <option value="Payroll Officer">Payroll Officer</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Admin">Admin</option>
                                  </select>
                                  {updatingRoles[user.id] && (
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2" style={{ borderColor: '#8200db' }}></div>
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
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

