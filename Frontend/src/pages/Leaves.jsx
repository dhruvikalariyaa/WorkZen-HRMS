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

  const isEmployee = user?.role === 'Employee';
  const canApprove = ['Admin', 'HR Officer', 'Manager', 'Payroll Officer'].includes(user?.role);

  useEffect(() => {
    fetchLeaves();
    fetchLeaveTypes();
    fetchAvailableDays();
  }, [searchTerm, statusFilter, selectedLeaveType]);

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
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (selectedLeaveType) params.leaveType = selectedLeaveType;
      
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
      // Don't auto-select - let user choose which tab they want
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchAvailableDays = async () => {
    try {
      const response = await api.get('/leaves/available-days');
      setAvailableDays(response.data);
    } catch (error) {
      console.error('Failed to fetch available days:', error);
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
      await api.post('/leaves', {
        ...applyLeaveData,
        attachmentUrl: applyLeaveData.attachment
      });
      setShowApplyLeave(false);
      setApplyLeaveData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        attachment: null
      });
      setCalculatedDays(0);
      fetchLeaves();
      fetchAvailableDays();
      toast.success('Leave request submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to apply for leave');
    }
  };

  const handleStatusChange = async (leaveId, status) => {
    try {
      await api.put(`/leaves/${leaveId}/status`, { status });
      fetchLeaves();
      fetchAvailableDays();
      toast.success(`Leave request ${status.toLowerCase()} successfully`);
    } catch (error) {
      toast.error('Failed to update leave status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEmployee ? 'My Time Off' : 'Time Off Management'}
        </h1>
        {isEmployee && (
          <button
            onClick={() => setShowApplyLeave(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold"
          >
            NEW
          </button>
        )}
        {canApprove && (
          <div className="text-sm text-gray-600">
            Select a pending leave request below to approve or reject
          </div>
        )}
      </div>

      {/* Leave Type Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => setSelectedLeaveType('')}
              className={`px-4 py-2 rounded-t-lg font-medium ${
                selectedLeaveType === ''
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All Types
            </button>
            {leaveTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedLeaveType(type.name)}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  selectedLeaveType === type.name
                    ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {type.name}
                {availableDays[type.name] !== undefined && (
                  <span className="ml-2 text-sm font-normal">
                    ({availableDays[type.name].toFixed(2)} Days Available)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                // Check if it's a PDF - check URL extension or Cloudinary raw resource
                const urlLower = viewingAttachment.toLowerCase();
                const isPDF = urlLower.endsWith('.pdf') || 
                             urlLower.includes('/raw/') ||
                             urlLower.includes('resource_type=raw') ||
                             (urlLower.includes('/documents/') && urlLower.includes('.pdf')) ||
                             (urlLower.includes('cloudinary.com') && urlLower.includes('.pdf'));
                
                if (isPDF) {
                  // For Cloudinary PDFs, use the original URL as stored
                  let pdfUrl = viewingAttachment;
                  
                  // Ensure URL has proper protocol
                  if (!pdfUrl.startsWith('http://') && !pdfUrl.startsWith('https://')) {
                    pdfUrl = 'https://' + pdfUrl;
                  }
                  
                  // Check if PDF is stored as image resource (old uploads)
                  // PDFs stored as images in Cloudinary cannot be viewed directly in iframe
                  const isImageResource = pdfUrl.includes('/image/upload/');
                  
                  // Use Google Docs Viewer for image resources or if user prefers it
                  const googleDocsViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
                  
                  // For image resources, always use Google Docs Viewer
                  // For raw resources, allow direct view or Google Docs Viewer
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
                
                // Fix URL for Cloudinary PDFs - use original URL as stored
                let fixedUrl = viewingAttachment;
                
                // Ensure URL has proper protocol
                if (!fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
                  fixedUrl = 'https://' + fixedUrl;
                }
                
                // Don't convert URL - use it as stored in database
                // Existing PDFs uploaded as images should be accessed as images
                // New PDFs will be uploaded as raw resources
                
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Time off Type Request</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <input
                  type="text"
                  value={`${user?.employee?.first_name || ''} ${user?.employee?.last_name || ''}`.trim() || user?.loginId || 'Employee'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time off Type *</label>
                <select
                  value={applyLeaveData.leaveType}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, leaveType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Validity Period *</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={applyLeaveData.startDate}
                      onChange={(e) => setApplyLeaveData({ ...applyLeaveData, startDate: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation</label>
                <input
                  type="text"
                  value={`${calculatedDays.toFixed(2)} Days`}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachment {applyLeaveData.leaveType === 'Sick time off' && '(For sick leave certificate)'}
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleAttachmentChange}
                  disabled={uploadingAttachment}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason/Notes</label>
                <textarea
                  value={applyLeaveData.reason}
                  onChange={(e) => setApplyLeaveData({ ...applyLeaveData, reason: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Optional reason for leave"
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyLeave(false);
                    setApplyLeaveData({
                      leaveType: '',
                      startDate: '',
                      endDate: '',
                      reason: '',
                      attachment: null
                    });
                    setCalculatedDays(0);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaves Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {!isEmployee && <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>}
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Start Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">End Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Time off Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Attachment</th>
                {canApprove && <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 6 : canApprove ? 7 : 6} className="text-center py-8 text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="border-b hover:bg-gray-50">
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        {leave.first_name} {leave.last_name}
                      </td>
                    )}
                    <td className="py-3 px-4">{formatDate(leave.start_date)}</td>
                    <td className="py-3 px-4">{formatDate(leave.end_date)}</td>
                    <td className="py-3 px-4">{leave.leave_type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                    <td className="py-3 px-4">
                      {leave.attachment_url ? (
                        <button
                          onClick={() => setViewingAttachment(leave.attachment_url)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          📎 View
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    {canApprove && (
                      <td className="py-3 px-4">
                        {leave.status === 'Pending' ? (
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleStatusChange(leave.id, 'Approved')}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(leave.id, 'Rejected')}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
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
  );
};

export default Leaves;
