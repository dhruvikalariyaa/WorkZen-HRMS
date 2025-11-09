import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';

const Leaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [availableDays, setAvailableDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [applyLeaveData, setApplyLeaveData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: null
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [changingStatus, setChangingStatus] = useState(null);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
  const [loadingAvailableDays, setLoadingAvailableDays] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const isEmployee = user?.role === 'Employee';
  const isHRorPayroll = ['HR Officer', 'Payroll Officer'].includes(user?.role);
  const isAdmin = user?.role === 'Admin';
  const canApplyLeave = ['Admin', 'Employee', 'HR Officer', 'Payroll Officer'].includes(user?.role);
  const canApprove = ['Admin', 'HR Officer', 'Manager', 'Payroll Officer'].includes(user?.role);
  
  // For HR/Payroll: toggle between "All Time Off" and "My Time Off"
  const [viewMode, setViewMode] = useState('my'); // 'all' or 'my'

  // Initial load
  useEffect(() => {
    fetchLeaves();
    fetchLeaveTypes();
    if (isAdmin) {
      fetchEmployees();
    }
    if (canApplyLeave && (isEmployee || viewMode === 'my' || user?.role === 'Admin')) {
      fetchAvailableDays();
    }
  }, []);

  // Update leave types and available days when view mode changes
  useEffect(() => {
    fetchLeaveTypes();
    if (canApplyLeave && (isEmployee || viewMode === 'my' || user?.role === 'Admin')) {
      fetchAvailableDays(selectedEmployeeId);
    }
  }, [viewMode]);

  // Update available days when selected employee changes (Admin only)
  useEffect(() => {
    if (isAdmin && selectedEmployeeId && showApplyLeave) {
      fetchAvailableDays(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  // Debounced search and filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLeaves();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, selectedLeaveType, viewMode]);

  useEffect(() => {
    if (applyLeaveData.startDate && applyLeaveData.endDate) {
      const start = new Date(applyLeaveData.startDate);
      const end = new Date(applyLeaveData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(diffDays);
    } else {
      setCalculatedDays(0);
    }
  }, [applyLeaveData.startDate, applyLeaveData.endDate]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = {};
      if (isHRorPayroll) {
        params.viewMode = viewMode;
      }
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (selectedLeaveType) params.leaveType = selectedLeaveType;
      
      const response = await api.get('/leaves', { params });
      setLeaves(response.data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      setLoadingLeaveTypes(true);
      const response = await api.get('/leaves/types');
      setLeaveTypes(response.data);
      // Don't auto-select - let user choose which tab they want
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
      toast.error('Failed to load leave types');
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  const fetchAvailableDays = async (employeeId = null) => {
    try {
      setLoadingAvailableDays(true);
      const params = {};
      if (isAdmin && employeeId) {
        params.employeeId = employeeId;
      }
      const response = await api.get('/leaves/available-days', { params });
      setAvailableDays(response.data);
    } catch (error) {
      console.error('Failed to fetch available days:', error);
      toast.error('Failed to load available days');
    } finally {
      setLoadingAvailableDays(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await api.get('/employees');
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAttachmentChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and image files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setApplyLeaveData({ ...applyLeaveData, attachment: response.data.fileUrl });
      toast.success('Attachment uploaded successfully');
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      toast.error(error.response?.data?.error || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      setSubmittingLeave(true);
      const payload = {
        leaveType: applyLeaveData.leaveType,
        startDate: applyLeaveData.startDate,
        endDate: applyLeaveData.endDate,
        reason: applyLeaveData.reason,
        attachmentUrl: applyLeaveData.attachment || null
      };
      
      // If Admin selected an employee, include employeeId
      if (isAdmin && selectedEmployeeId) {
        payload.employeeId = selectedEmployeeId;
      }
      
      await api.post('/leaves', payload);
      setShowApplyLeave(false);
      setApplyLeaveData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        attachment: null
      });
      setSelectedEmployeeId(null);
      setCalculatedDays(0);
      fetchLeaves();
      fetchAvailableDays();
      toast.success('Leave request submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to apply for leave');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleStatusChange = async (leaveId, status) => {
    try {
      setChangingStatus(leaveId);
      await api.put(`/leaves/${leaveId}/status`, { status });
      fetchLeaves();
      fetchAvailableDays();
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
    } catch (error) {
      toast.error('Failed to update leave status');
    } finally {
      setChangingStatus(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#9333ea' }}></div>
          <p className="text-gray-600 font-medium">Loading leaves...</p>
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
                <h1 className="text-lg font-semibold" style={{ color: '#8200db' }}>
                  {isEmployee || (isHRorPayroll && viewMode === 'my') ? 'My Time Off' : 'Time Off Management'}
                </h1>
               </div>
              <div className="flex items-center gap-3">
                {isHRorPayroll && (
                  <div className="relative">
                    <button
                      onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      {viewMode === 'all' ? 'All Time Off' : 'My Time Off'}
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
                            All Time Off
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
                            My Time Off
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {canApplyLeave && (isEmployee || viewMode === 'my' || user?.role === 'Admin') && (
                  <button
                    onClick={() => setShowApplyLeave(true)}
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

            {/* Leave Type Tabs */}
            <div className="mb-6">
              <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <div className="border-b-2 border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setSelectedLeaveType('')}
                      className={`px-6 py-3 font-medium text-sm transition-all relative ${
                        selectedLeaveType === ''
                          ? 'text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      style={selectedLeaveType === '' ? { backgroundColor: '#8200db' } : {}}
                    >
                      All Types
                      {selectedLeaveType === '' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                      )}
                    </button>
                    {leaveTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedLeaveType(type.name)}
                        className={`px-6 py-3 font-medium text-sm transition-all relative ${
                          selectedLeaveType === type.name
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                        style={selectedLeaveType === type.name ? { backgroundColor: '#8200db' } : {}}
                      >
                        {type.name}
                        {availableDays[type.name] !== undefined && (
                          <span className="ml-2 text-xs font-normal">
                            ({availableDays[type.name].toFixed(2)} Days Available)
                          </span>
                        )}
                        {selectedLeaveType === type.name && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-6">
              <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder={isEmployee || (isHRorPayroll && viewMode === 'my') ? "Search by leave type or reason..." : "Search by name or employee ID..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>


            {/* Leaves Table */}
            <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#8200db' }}>
                      {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? null : (
                        <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Name</th>
                      )}
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Start Date</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">End Date</th>
                      <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Time off Type</th>
                      <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Status</th>
                      <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Attachment</th>
                      {canApprove && <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={(isEmployee || (isHRorPayroll && viewMode === 'my')) ? (canApprove ? 6 : 5) : (canApprove ? 7 : 6)} className="text-center py-8 text-gray-500 text-sm">
                          No leave requests found
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave, index) => (
                        <tr key={leave.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          {(isEmployee || (isHRorPayroll && viewMode === 'my')) ? null : (
                            <td className="py-2 px-4 text-sm text-gray-800">
                              {leave.first_name} {leave.last_name}
                            </td>
                          )}
                          <td className="py-2 px-4 text-sm text-gray-800">{formatDate(leave.start_date)}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{formatDate(leave.end_date)}</td>
                          <td className="py-2 px-4 text-sm text-gray-800">{leave.leave_type}</td>
                          <td className="py-2 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                leave.status === 'Approved'
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : leave.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              }`}
                            >
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            {leave.attachment_url ? (
                              <button
                                onClick={() => setViewingAttachment(leave.attachment_url)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                              >
                                📎 View
                              </button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          {canApprove && (
                            <td className="py-2 px-4 text-center">
                              {leave.status === 'Pending' ? (
                                <div className="flex space-x-2 justify-center">
                                  <button
                                    onClick={() => handleStatusChange(leave.id, 'Approved')}
                                    disabled={changingStatus === leave.id}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                  >
                                    {changingStatus === leave.id ? 'Processing...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                    disabled={changingStatus === leave.id}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                  >
                                    {changingStatus === leave.id ? 'Processing...' : 'Reject'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
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

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">View Attachment</h2>
              <button
                onClick={() => {
                  setViewingAttachment(null);
                  setUseGoogleViewer(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const urlLower = viewingAttachment.toLowerCase();
                const isPDF = urlLower.endsWith('.pdf') || 
                             urlLower.includes('/raw/') ||
                             urlLower.includes('resource_type=raw') ||
                             (urlLower.includes('/documents/') && urlLower.includes('.pdf')) ||
                             (urlLower.includes('cloudinary.com') && urlLower.includes('.pdf'));
                
                if (isPDF) {
                  let pdfUrl = viewingAttachment;
                  if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
                    pdfUrl = 'https://' + pdfUrl;
                  }
                  const isImageResource = pdfUrl.includes('/image/upload/');
                  const googleDocsViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
                  const finalUrl = (isImageResource || useGoogleViewer) ? googleDocsViewer : pdfUrl;
                  
                  return (
                    <div className="w-full h-full">
                      <iframe
                        key={finalUrl}
                        src={finalUrl}
                        className="w-full h-full min-h-[600px] border"
                        title="PDF Viewer"
                        style={{ minHeight: '600px' }}
                      />
                      {isImageResource ? (
                        <div className="mt-2 text-center">
                          <p className="text-xs text-gray-500">
                            Using Google Docs Viewer for compatibility
                          </p>
                        </div>
                      ) : !useGoogleViewer ? (
                        <div className="mt-2 text-center">
                          <p className="text-xs text-gray-500 mb-2">
                            PDF not loading? Try Google Docs viewer
                          </p>
                          <button
                            onClick={() => setUseGoogleViewer(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Switch to Google Docs Viewer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                } else {
                  return (
                    <img
                      src={viewingAttachment}
                      alt="Attachment"
                      className="max-w-full h-auto mx-auto"
                    />
                  );
                }
              })()}
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              {(() => {
                const urlLower = viewingAttachment.toLowerCase();
                const isPDF = urlLower.endsWith('.pdf') || 
                             urlLower.includes('/raw/') ||
                             urlLower.includes('resource_type=raw') ||
                             (urlLower.includes('/documents/') && urlLower.includes('.pdf')) ||
                             (urlLower.includes('cloudinary.com') && urlLower.includes('.pdf'));
                
                let fixedUrl = viewingAttachment;
                if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
                  fixedUrl = 'https://' + fixedUrl;
                }
                
                return (
                  <>
                    {isPDF && (
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(fixedUrl)}&embedded=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        View with Google Docs
                      </a>
                    )}
                    <a
                      href={fixedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                      download={isPDF}
                    >
                      {isPDF ? 'Download PDF' : 'Open in New Tab'}
                    </a>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Form Modal */}
      {showApplyLeave && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2" style={{ borderColor: '#8200db' }}>
            <div className="mb-4 pb-3 border-b-2" style={{ borderColor: '#8200db' }}>
              <h2 className="text-xl font-bold" style={{ color: '#8200db' }}>Time off Type Request</h2>
              <p className="text-xs text-gray-600 mt-1">Submit a new time off request</p>
            </div>
            <form onSubmit={handleApplyLeave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee *</label>
                {isAdmin ? (
                  <select
                    value={selectedEmployeeId || ''}
                    onChange={(e) => {
                      const empId = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedEmployeeId(empId);
                      if (empId) {
                        fetchAvailableDays(empId);
                      }
                    }}
                    required
                    disabled={loadingEmployees}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_id} - {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || user?.loginId || 'Employee'}
                    disabled
                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Time off Type *</label>
                <select
                  value={applyLeaveData.leaveType}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, leaveType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                >
                  <option value="">Select Time off Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} {availableDays[type.name] !== undefined && `(${availableDays[type.name].toFixed(2)} days available)`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Validity Period *</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={applyLeaveData.startDate}
                      onChange={(e) => setApplyLeaveData({ ...applyLeaveData, startDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={applyLeaveData.endDate}
                      onChange={(e) => setApplyLeaveData({ ...applyLeaveData, endDate: e.target.value })}
                      required
                      min={applyLeaveData.startDate}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Allocation</label>
                <input
                  type="text"
                  value={`${calculatedDays.toFixed(2)} Days`}
                  disabled
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Attachment {applyLeaveData.leaveType === 'Sick time off' && '(For sick leave certificate)'}
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleAttachmentChange}
                  disabled={uploadingAttachment}
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">Accepted formats: PDF, JPG, PNG, GIF, WEBP (Max 10MB)</p>
                {applyLeaveData.attachment && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">✓ Attachment uploaded successfully</p>
                    <a 
                      href={applyLeaveData.attachment} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View uploaded file
                    </a>
                  </div>
                )}
                {uploadingAttachment && (
                  <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason/Notes</label>
                <textarea
                  value={applyLeaveData.reason}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                  placeholder="Optional reason for leave"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyLeave(false);
                    setSelectedEmployeeId(null);
                    setApplyLeaveData({
                      leaveType: '',
                      startDate: '',
                      endDate: '',
                      reason: '',
                      attachment: null
                    });
                    setCalculatedDays(0);
                  }}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8200db' }}
                >
                  {submittingLeave ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
