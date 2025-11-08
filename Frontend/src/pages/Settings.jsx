import { useState, useEffect } from 'react';
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
  const [payrollSettings, setPayrollSettings] = useState({
    pfPercentage: 12,
    professionalTaxAmount: 200,
    hraPercentage: 40
  });
  const [showAddLeaveType, setShowAddLeaveType] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState({
    name: '',
    maxDays: 0,
    description: ''
  });

  useEffect(() => {
    fetchCompanyInfo();
    fetchLeaveTypes();
    fetchPayrollSettings();
  }, []);

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
      alert('Company logo uploaded successfully');
      fetchCompanyInfo();
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompanyInfo = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings/company', companyInfo);
      alert('Company information saved successfully');
    } catch (error) {
      alert('Failed to save company information');
    }
  };

  const handleSavePayrollSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings/payroll', payrollSettings);
      alert('Payroll settings saved successfully');
    } catch (error) {
      alert('Failed to save payroll settings');
    }
  };

  const handleAddLeaveType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/leave-types', newLeaveType);
      setShowAddLeaveType(false);
      setNewLeaveType({ name: '', maxDays: 0, description: '' });
      fetchLeaveTypes();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add leave type');
    }
  };

  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) {
      return;
    }
    try {
      await api.delete(`/settings/leave-types/${id}`);
      fetchLeaveTypes();
    } catch (error) {
      alert('Failed to delete leave type');
    }
  };

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'leave-types', label: 'Leave Types' },
    { id: 'payroll', label: 'Payroll Settings' }
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Leave Types</h2>
                <button
                  onClick={() => setShowAddLeaveType(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Add Leave Type
                </button>
              </div>

              {showAddLeaveType && (
                <div className="mb-6 p-4 border rounded-lg">
                  <form onSubmit={handleAddLeaveType} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={newLeaveType.name}
                        onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Days</label>
                      <input
                        type="number"
                        value={newLeaveType.maxDays}
                        onChange={(e) => setNewLeaveType({ ...newLeaveType, maxDays: parseInt(e.target.value) })}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={newLeaveType.description}
                        onChange={(e) => setNewLeaveType({ ...newLeaveType, description: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddLeaveType(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

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
                        <td className="py-3 px-4">{type.max_days}</td>
                        <td className="py-3 px-4">{type.description || '-'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteLeaveType(type.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
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
        </div>
      </div>
    </div>
  );
};

export default Settings;

