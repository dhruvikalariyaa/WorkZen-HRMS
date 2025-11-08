import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user } = useAuth();
  const { employeeId: urlEmployeeId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resume'); // Default to resume tab
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  // Form states
  const [basicInfo, setBasicInfo] = useState({
    firstName: '',
    lastName: '',
    loginId: '',
    email: '',
    phoneNumber: '',
    company: '',
    department: '',
    managerId: '',
  });

  const [privateInfo, setPrivateInfo] = useState({
    dateOfBirth: '',
    mailingAddress: '',
    nationality: '',
    maritalStatus: '',
    gender: '',
    dateOfJoining: '',
    bankAccountNumber: '',
    bankName: '',
    ifscCode: '',
    panNumber: '',
    uanNumber: '',
    bicCode: ''
  });

  const [resumeData, setResumeData] = useState({
    about: '',
    jobLove: '',
    interests: '',
    skills: [],
    certifications: []
  });

  const [salaryInfo, setSalaryInfo] = useState({
    wageType: 'Fixed',
    monthlyWage: '',
    yearlyWage: '',
    basicSalary: '',
    basicSalaryPercentage: 60,
    hra: '',
    hraPercentage: 10,
    standardAllowance: '',
    standardAllowancePercentage: 0.5,
    performanceBonus: '',
    performanceBonusPercentage: 8.33,
    leaveTravelAllowance: '',
    leaveTravelAllowancePercentage: 8.33,
    fixedAllowance: '',
    fixedAllowancePercentage: 0,
    pfEmployee: '',
    pfEmployeePercentage: 12,
    pfEmployer: '',
    pfEmployerPercentage: 12,
    professionalTax: 200
  });

  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState({
    certificationName: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: ''
  });

  useEffect(() => {
    if (user) {
      // Determine which employee ID to use
      let targetEmployeeId = null;
      
      if (urlEmployeeId) {
        // If URL has employeeId parameter, use that (viewing another employee)
        targetEmployeeId = urlEmployeeId;
        setSelectedEmployeeId(targetEmployeeId);
        fetchProfileData(targetEmployeeId);
        
        // Always fetch employees for manager dropdown (if Admin/HR Officer)
        if (['Admin', 'HR Officer'].includes(user?.role)) {
          fetchEmployees();
        }
      } else if (user?.employee?.id) {
        // If user has their own employee record, use that
        targetEmployeeId = user.employee.id;
        setSelectedEmployeeId(targetEmployeeId);
        fetchProfileData(targetEmployeeId);
        
        // Always fetch employees for manager dropdown (if Admin/HR Officer)
        if (['Admin', 'HR Officer'].includes(user?.role)) {
          fetchEmployees();
        }
      } else {
        // User doesn't have employee record - show My Profile with user info
        setLoading(false);
        setSelectedEmployeeId(null); // No employee record, but show user profile
        if (['Admin', 'HR Officer'].includes(user?.role)) {
          fetchEmployees();
        }
      }
    }
  }, [user, urlEmployeeId, navigate]);

  const fetchProfileData = async (employeeId) => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/profile/${employeeId}`);
      const data = response.data;
      
      setProfileData(data);
      
      // Set basic info
      setBasicInfo({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        loginId: data.login_id || '',
        email: data.email || data.user_email || '',
        phoneNumber: data.phone_number || '',
        company: data.company_name || '',
        department: data.department || '',
        managerId: data.manager_id || '',
      });

      // Set private info
      // Format date for HTML date input (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
          // If already in YYYY-MM-DD format, return as is
          if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
          }
          // Parse the date string (handles various formats)
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          // Get date components in local timezone
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Error formatting date:', dateString, error);
          return '';
        }
      };

      setPrivateInfo({
        dateOfBirth: formatDateForInput(data.date_of_birth) || '',
        mailingAddress: data.address || '',
        nationality: data.nationality || '',
        maritalStatus: data.marital_status || '',
        gender: data.gender || '',
        dateOfJoining: formatDateForInput(data.hire_date) || '',
        bankAccountNumber: data.bank_account_number || '',
        bankName: data.bank_name || '',
        ifscCode: data.ifsc_code || '',
        panNumber: data.pan_number || '',
        uanNumber: data.uan_number || '',
        bicCode: data.bic_code || ''
      });

      // Set resume data
      setResumeData({
        about: data.about || '',
        jobLove: data.job_love || '',
        interests: data.interests || '',
        skills: data.skills || [], // This is now an array of objects with id and skill_name
        certifications: data.certifications || []
      });

      // Set salary info (if available)
      if (data.salaryInfo) {
        setSalaryInfo({
          wageType: data.salaryInfo.wage_type || 'Fixed',
          monthlyWage: data.salaryInfo.monthly_wage || '',
          yearlyWage: data.salaryInfo.yearly_wage || '',
          basicSalary: data.salaryInfo.basic_salary || '',
          basicSalaryPercentage: data.salaryInfo.basic_salary_percentage || 60,
          hra: data.salaryInfo.hra || '',
          hraPercentage: data.salaryInfo.hra_percentage || 10,
          standardAllowance: data.salaryInfo.standard_allowance || '',
          standardAllowancePercentage: data.salaryInfo.standard_allowance_percentage || 0.5,
          performanceBonus: data.salaryInfo.performance_bonus || '',
          performanceBonusPercentage: data.salaryInfo.performance_bonus_percentage || 8.33,
          leaveTravelAllowance: data.salaryInfo.leave_travel_allowance || '',
          leaveTravelAllowancePercentage: data.salaryInfo.leave_travel_allowance_percentage || 8.33,
          fixedAllowance: data.salaryInfo.fixed_allowance || '',
          fixedAllowancePercentage: data.salaryInfo.fixed_allowance_percentage || 0,
          pfEmployee: data.salaryInfo.pf_employee || '',
          pfEmployeePercentage: data.salaryInfo.pf_employee_percentage || 12,
          pfEmployer: data.salaryInfo.pf_employer || '',
          pfEmployerPercentage: data.salaryInfo.pf_employer_percentage || 12,
          professionalTax: data.salaryInfo.professional_tax || 200
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file || !selectedEmployeeId) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(`/upload/employee/${selectedEmployeeId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfileData({ ...profileData, profile_image_url: response.data.imageUrl });
      toast.success('Profile image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!selectedEmployeeId) return;

    setSaving(true);
    try {
      const updateData = {
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName,
        phoneNumber: basicInfo.phoneNumber,
      };
      
      // Only include managerId if user has permission (Admin/HR Officer)
      if (['Admin', 'HR Officer'].includes(user?.role)) {
        updateData.managerId = basicInfo.managerId || null;
      }
      
      await api.put(`/profile/${selectedEmployeeId}`, updateData);
      toast.success('Basic information saved successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save basic information');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivateInfo = async () => {
    if (!selectedEmployeeId) return;

    setSaving(true);
    try {
      await api.put(`/profile/${selectedEmployeeId}`, {
        dateOfBirth: privateInfo.dateOfBirth,
        address: privateInfo.mailingAddress,
        nationality: privateInfo.nationality,
        maritalStatus: privateInfo.maritalStatus,
        gender: privateInfo.gender,
        bankAccountNumber: privateInfo.bankAccountNumber,
        bankName: privateInfo.bankName,
        ifscCode: privateInfo.ifscCode,
        panNumber: privateInfo.panNumber,
        uanNumber: privateInfo.uanNumber,
        bicCode: privateInfo.bicCode
      });
      toast.success('Private information saved successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save private information');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResume = async () => {
    if (!selectedEmployeeId) return;

    setSaving(true);
    try {
      await api.put(`/profile/${selectedEmployeeId}`, {
        about: resumeData.about,
        jobLove: resumeData.jobLove,
        interests: resumeData.interests
      });
      toast.success('Resume information saved successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save resume information');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !selectedEmployeeId) return;

    try {
      await api.post(`/profile/${selectedEmployeeId}/skills`, {
        skillName: newSkill.trim()
      });
      setNewSkill('');
      toast.success('Skill added successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!selectedEmployeeId) return;
    
    if (!skillId || skillId === 'undefined' || skillId === undefined) {
      toast.error('Invalid skill ID. Please refresh the page and try again.');
      console.error('Skill ID is undefined:', skillId, 'Skill object:', resumeData.skills);
      return;
    }

    try {
      await api.delete(`/profile/${selectedEmployeeId}/skills/${skillId}`);
      toast.success('Skill deleted successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete skill');
    }
  };

  const handleAddCertification = async () => {
    if (!newCertification.certificationName.trim() || !selectedEmployeeId) return;

    try {
      await api.post(`/profile/${selectedEmployeeId}/certifications`, newCertification);
      setNewCertification({
        certificationName: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: ''
      });
      toast.success('Certification added successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add certification');
    }
  };

  const handleDeleteCertification = async (certId) => {
    if (!selectedEmployeeId) return;

    try {
      await api.delete(`/profile/${selectedEmployeeId}/certifications/${certId}`);
      toast.success('Certification deleted successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete certification');
    }
  };

  const handleSalaryWageChange = (value, preserveFixedPercentage = false) => {
    const monthlyWage = parseFloat(value) || 0;
    const yearlyWage = monthlyWage * 12;
    
    // Calculate basic salary (based on percentage)
    const basicSalary = monthlyWage * (salaryInfo.basicSalaryPercentage / 100);
    
    // Calculate HRA (based on percentage of basic salary)
    const hra = basicSalary * (salaryInfo.hraPercentage / 100);
    
    // Calculate Standard Allowance
    const standardAllowance = monthlyWage * (salaryInfo.standardAllowancePercentage / 100);
    
    // Calculate Performance Bonus
    const performanceBonus = basicSalary * (salaryInfo.performanceBonusPercentage / 100);
    
    // Calculate Leave Travel Allowance
    const leaveTravelAllowance = basicSalary * (salaryInfo.leaveTravelAllowancePercentage / 100);
    
    // Calculate Fixed Allowance
    let fixedAllowance, fixedAllowancePercentage;
    if (preserveFixedPercentage && salaryInfo.fixedAllowancePercentage) {
      // If preserving fixed percentage, calculate fixed allowance from percentage
      fixedAllowancePercentage = parseFloat(salaryInfo.fixedAllowancePercentage);
      fixedAllowance = monthlyWage * (fixedAllowancePercentage / 100);
    } else {
      // Calculate Fixed Allowance (remaining)
      const totalComponents = basicSalary + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
      fixedAllowance = monthlyWage - totalComponents;
      fixedAllowancePercentage = monthlyWage > 0 ? (fixedAllowance / monthlyWage) * 100 : 0;
    }
    
    // Calculate PF
    const pfEmployee = basicSalary * (salaryInfo.pfEmployeePercentage / 100);
    const pfEmployer = basicSalary * (salaryInfo.pfEmployerPercentage / 100);

    setSalaryInfo({
      ...salaryInfo,
      monthlyWage: value,
      yearlyWage: yearlyWage.toFixed(2),
      basicSalary: basicSalary.toFixed(2),
      hra: hra.toFixed(2),
      standardAllowance: standardAllowance.toFixed(2),
      performanceBonus: performanceBonus.toFixed(2),
      leaveTravelAllowance: leaveTravelAllowance.toFixed(2),
      fixedAllowance: fixedAllowance.toFixed(2),
      fixedAllowancePercentage: fixedAllowancePercentage.toFixed(2),
      pfEmployee: pfEmployee.toFixed(2),
      pfEmployer: pfEmployer.toFixed(2)
    });
  };

  const handleSaveSalaryInfo = async () => {
    if (!selectedEmployeeId) return;

    // Validate monthlyWage before sending
    const monthlyWage = parseFloat(salaryInfo.monthlyWage);
    if (!salaryInfo.monthlyWage || isNaN(monthlyWage) || monthlyWage < 0) {
      toast.error('Please enter a valid monthly wage');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/profile/${selectedEmployeeId}/salary`, {
        wageType: salaryInfo.wageType,
        monthlyWage: monthlyWage,
        basicSalaryPercentage: salaryInfo.basicSalaryPercentage,
        hraPercentage: salaryInfo.hraPercentage,
        standardAllowance: salaryInfo.standardAllowance || '',
        standardAllowancePercentage: salaryInfo.standardAllowancePercentage,
        performanceBonusPercentage: salaryInfo.performanceBonusPercentage,
        leaveTravelAllowancePercentage: salaryInfo.leaveTravelAllowancePercentage,
        fixedAllowancePercentage: salaryInfo.fixedAllowancePercentage,
        pfEmployeePercentage: salaryInfo.pfEmployeePercentage,
        pfEmployerPercentage: salaryInfo.pfEmployerPercentage,
        professionalTax: salaryInfo.professionalTax
      });
      toast.success('Salary information saved successfully');
      fetchProfileData(selectedEmployeeId);
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to save salary information';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
      navigate(`/profile/${employeeId}`);
      fetchProfileData(employeeId);
    }
  };

  const canViewSalaryInfo = ['Admin', 'Payroll Officer'].includes(user?.role);
  const canSelectEmployee = ['Admin', 'HR Officer'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user doesn't have employee record, show My Profile with user information
  if (!selectedEmployeeId && !user?.employee?.id) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          {canSelectEmployee && employees.length > 0 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleEmployeeSelect(e.target.value);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- View Other Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_id} - {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Profile Header */}
          <div className="flex items-start space-x-6 mb-6 pb-6 border-b">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold shadow-sm">
                {user?.employee?.first_name?.[0] || user?.loginId?.[0] || user?.email?.[0] || 'U'}
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={user?.employee?.first_name ? `${user.employee.first_name} ${user.employee.last_name || ''}`.trim() : user?.loginId || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login ID</label>
                <input
                  type="text"
                  value={user?.loginId || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={user?.role || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 border-b mb-6">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'resume'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'private'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Private Info
            </button>
            {canViewSalaryInfo && (
              <button
                onClick={() => setActiveTab('salary')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'salary'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Salary Info
              </button>
            )}
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'security'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Security
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'resume' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
                  <textarea
                    value={resumeData.about}
                    onChange={(e) => setResumeData({ ...resumeData, about: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Tell us about yourself..."
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What I love about my job</label>
                  <textarea
                    value={resumeData.jobLove}
                    onChange={(e) => setResumeData({ ...resumeData, jobLove: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="What do you love about your job?"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">My Interests and hobbies</label>
                  <textarea
                    value={resumeData.interests}
                    onChange={(e) => setResumeData({ ...resumeData, interests: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Your interests and hobbies..."
                    disabled={!user?.employee?.id}
                  />
                </div>
                {user?.employee?.id && (
                  <button
                    onClick={handleSaveResume}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                {!user?.employee?.id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {
                        ['Admin', 'HR Officer'].includes(user?.role) 
                          ? 'You need to create your employee profile to save this information. Go to Employees page to create your profile.'
                          : 'You need an employee profile to save this information. Contact your administrator.'
                      }
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && user?.employee?.id && handleAddSkill()}
                      placeholder="Add skill"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={!user?.employee?.id}
                    />
                    <button
                      onClick={handleAddSkill}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      disabled={!user?.employee?.id}
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {resumeData.skills.map((skill, index) => (
                      <div key={skill.id || index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span>{skill.skill_name || skill}</span>
                        {user?.employee?.id && (
                          <button
                            onClick={() => {
                              if (skill.id) {
                                handleDeleteSkill(skill.id);
                              } else {
                                console.error('Skill ID missing:', skill);
                                toast.error('Skill ID is missing. Please refresh the page.');
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {resumeData.skills.length === 0 && (
                      <p className="text-sm text-gray-500">No skills added yet</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certification</label>
                  <div className="space-y-2 mb-2">
                    <input
                      type="text"
                      value={newCertification.certificationName}
                      onChange={(e) => setNewCertification({ ...newCertification, certificationName: e.target.value })}
                      placeholder="Certification Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={!user?.employee?.id}
                    />
                    <input
                      type="text"
                      value={newCertification.issuingOrganization}
                      onChange={(e) => setNewCertification({ ...newCertification, issuingOrganization: e.target.value })}
                      placeholder="Issuing Organization"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={!user?.employee?.id}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={newCertification.issueDate}
                        onChange={(e) => setNewCertification({ ...newCertification, issueDate: e.target.value })}
                        placeholder="Issue Date"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={!user?.employee?.id}
                      />
                      <input
                        type="date"
                        value={newCertification.expiryDate}
                        onChange={(e) => setNewCertification({ ...newCertification, expiryDate: e.target.value })}
                        placeholder="Expiry Date"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        disabled={!user?.employee?.id}
                      />
                    </div>
                    {user?.employee?.id && (
                      <button
                        onClick={handleAddCertification}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add Certification
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {resumeData.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div>
                          <span className="font-medium">{cert.certification_name}</span>
                          {cert.issuing_organization && (
                            <span className="text-sm text-gray-600 ml-2">- {cert.issuing_organization}</span>
                          )}
                        </div>
                        {user?.employee?.id && (
                          <button
                            onClick={() => handleDeleteCertification(cert.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {resumeData.certifications.length === 0 && (
                      <p className="text-sm text-gray-500">No certifications added yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'private' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={privateInfo.dateOfBirth}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Residing Address</label>
                  <textarea
                    value={privateInfo.mailingAddress}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, mailingAddress: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                  <input
                    type="text"
                    value={privateInfo.nationality}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                  <select
                    value={privateInfo.maritalStatus}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, maritalStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  >
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={privateInfo.gender}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                  <input
                    type="date"
                    value={privateInfo.dateOfJoining}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
                {user?.employee?.id && (
                  <button
                    onClick={handleSavePrivateInfo}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                {!user?.employee?.id && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {
                        ['Admin', 'HR Officer'].includes(user?.role) 
                          ? 'You need to create your employee profile to save this information. Go to Employees page to create your profile.'
                          : 'You need an employee profile to save this information. Contact your administrator.'
                      }
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-2">Bank Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={privateInfo.bankAccountNumber}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={privateInfo.bankName}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={privateInfo.ifscCode}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN No.</label>
                  <input
                    type="text"
                    value={privateInfo.panNumber}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, panNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UAN No.</label>
                  <input
                    type="text"
                    value={privateInfo.uanNumber}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, uanNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BIC Code</label>
                  <input
                    type="text"
                    value={privateInfo.bicCode}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, bicCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!user?.employee?.id}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'salary' && canViewSalaryInfo && (
            <div className="space-y-6">
              {!user?.employee?.id && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {
                        ['Admin', 'HR Officer'].includes(user?.role) 
                          ? 'Salary information is only available for employees with employee profiles. Go to Employees page to create your employee profile.'
                          : 'Salary information is only available for employees with employee profiles. Contact your administrator to create your employee profile.'
                      }
                    </p>
                  </div>
                  <div className="text-center py-12">
                    <p className="text-gray-500">No salary information available. Employee profile required.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Login ID</label>
                <input
                  type="text"
                  value={user?.loginId || 'N/A'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || 'N/A'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={user?.role || 'N/A'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              {!user?.employee?.id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> {
                      ['Admin', 'HR Officer'].includes(user?.role) 
                        ? 'You don\'t have an employee profile yet. Go to Employees page to create your employee profile for additional information.'
                        : 'You don\'t have an employee profile yet. Contact your administrator to create your employee profile for additional information.'
                    }
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-4">
                To change your password, please use the Change Password feature in the settings menu.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {canSelectEmployee && selectedEmployeeId !== user?.employee?.id 
            ? 'Employee Profile' 
            : 'My Profile'}
        </h1>
        {canSelectEmployee && employees.length > 0 && (
          <select
            value={selectedEmployeeId || ''}
            onChange={(e) => handleEmployeeSelect(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_id} - {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Profile Header */}
        <div className="flex items-start space-x-6 mb-6 pb-6 border-b">
          <div className="relative">
            {profileData?.profile_image_url ? (
              <img
                src={profileData.profile_image_url}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">👤</span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={uploadingImage}
              />
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </label>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">My Name</label>
              <input
                type="text"
                value={basicInfo.firstName}
                onChange={(e) => setBasicInfo({ ...basicInfo, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login ID</label>
              <input
                type="text"
                value={basicInfo.loginId}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={basicInfo.email}
                onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input
                type="tel"
                value={basicInfo.phoneNumber}
                onChange={(e) => setBasicInfo({ ...basicInfo, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={basicInfo.company}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={basicInfo.department}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              {['Admin', 'HR Officer'].includes(user?.role) ? (
                <select
                  value={basicInfo.managerId || ''}
                  onChange={(e) => setBasicInfo({ ...basicInfo, managerId: e.target.value || '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Manager</option>
                  {employees
                    .filter(emp => emp.id !== selectedEmployeeId) // Exclude current employee
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_id} - {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={
                    profileData?.manager_first_name && profileData?.manager_last_name
                      ? `${profileData.manager_first_name} ${profileData.manager_last_name}`
                      : 'No Manager'
                  }
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              )}
            </div>
          </div>
          
          {/* Save Button for Basic Info */}
          {(selectedEmployeeId || user?.employee?.id) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveBasicInfo}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Basic Info'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b mb-6">
          <button
            onClick={() => setActiveTab('resume')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'resume'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Resume
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'private'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Private Info
          </button>
          {canViewSalaryInfo && (
            <button
              onClick={() => setActiveTab('salary')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'salary'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Salary Info
            </button>
          )}
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'security'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Security
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'resume' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
                <textarea
                  value={resumeData.about}
                  onChange={(e) => setResumeData({ ...resumeData, about: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What I love about my job</label>
                <textarea
                  value={resumeData.jobLove}
                  onChange={(e) => setResumeData({ ...resumeData, jobLove: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="What do you love about your job?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">My Interests and hobbies</label>
                <textarea
                  value={resumeData.interests}
                  onChange={(e) => setResumeData({ ...resumeData, interests: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Your interests and hobbies..."
                />
              </div>
              <button
                onClick={handleSaveResume}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Add skill"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {resumeData.skills.map((skill, index) => (
                    <div key={skill.id || index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span>{skill.skill_name || skill}</span>
                      <button
                        onClick={() => {
                          if (skill.id) {
                            handleDeleteSkill(skill.id);
                          } else {
                            console.error('Skill ID missing:', skill);
                            toast.error('Skill ID is missing. Please refresh the page.');
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Certification</label>
                <div className="space-y-2 mb-2">
                  <input
                    type="text"
                    value={newCertification.certificationName}
                    onChange={(e) => setNewCertification({ ...newCertification, certificationName: e.target.value })}
                    placeholder="Certification Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newCertification.issuingOrganization}
                    onChange={(e) => setNewCertification({ ...newCertification, issuingOrganization: e.target.value })}
                    placeholder="Issuing Organization"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={newCertification.issueDate}
                      onChange={(e) => setNewCertification({ ...newCertification, issueDate: e.target.value })}
                      placeholder="Issue Date"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="date"
                      value={newCertification.expiryDate}
                      onChange={(e) => setNewCertification({ ...newCertification, expiryDate: e.target.value })}
                      placeholder="Expiry Date"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleAddCertification}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Certification
                  </button>
                </div>
                <div className="space-y-2">
                  {resumeData.certifications.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div>
                        <span className="font-medium">{cert.certification_name}</span>
                        {cert.issuing_organization && (
                          <span className="text-sm text-gray-600 ml-2">- {cert.issuing_organization}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCertification(cert.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'private' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={privateInfo.dateOfBirth}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Residing Address</label>
                <textarea
                  value={privateInfo.mailingAddress}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, mailingAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                <input
                  type="text"
                  value={privateInfo.nationality}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                <select
                  value={privateInfo.maritalStatus}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, maritalStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={privateInfo.gender}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining</label>
                <input
                  type="date"
                  value={privateInfo.dateOfJoining}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-2">Bank Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={privateInfo.bankAccountNumber}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, bankAccountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={privateInfo.bankName}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                <input
                  type="text"
                  value={privateInfo.ifscCode}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, ifscCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN No.</label>
                <input
                  type="text"
                  value={privateInfo.panNumber}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, panNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">UAN No.</label>
                <input
                  type="text"
                  value={privateInfo.uanNumber}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, uanNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BIC Code</label>
                <input
                  type="text"
                  value={privateInfo.bicCode}
                  onChange={(e) => setPrivateInfo({ ...privateInfo, bicCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleSavePrivateInfo}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'salary' && canViewSalaryInfo && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Salary components are automatically calculated based on the monthly wage and percentages. 
                The total of all components should not exceed the defined wage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Wage Type</label>
                <select
                  value={salaryInfo.wageType}
                  onChange={(e) => setSalaryInfo({ ...salaryInfo, wageType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Wage</label>
                <input
                  type="number"
                  value={salaryInfo.monthlyWage}
                  onChange={(e) => handleSalaryWageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Wage</label>
                <input
                  type="number"
                  value={salaryInfo.yearlyWage}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Salary Components</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                    <input
                      type="number"
                      value={salaryInfo.basicSalary}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.basicSalaryPercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, basicSalaryPercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Basic salary from company and employee is based on monthly wage</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">House Rent Allowance</label>
                    <input
                      type="number"
                      value={salaryInfo.hra}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.hraPercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, hraPercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">HRA provided to employee, calculated as % of basic salary</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Standard Allowance</label>
                    <input
                      type="number"
                      value={salaryInfo.standardAllowance}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.standardAllowancePercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, standardAllowancePercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">A standard allowance is a predetermined fixed amount</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Performance Bonus</label>
                    <input
                      type="number"
                      value={salaryInfo.performanceBonus}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.performanceBonusPercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, performanceBonusPercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Variable amount paid during payroll, calculated as % of basic salary</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Leave Travel Allowance</label>
                    <input
                      type="number"
                      value={salaryInfo.leaveTravelAllowance}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.leaveTravelAllowancePercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, leaveTravelAllowancePercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">LTA is paid by the company, calculated as % of basic salary</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Allowance</label>
                    <input
                      type="number"
                      value={salaryInfo.fixedAllowance}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.fixedAllowancePercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        const updatedSalaryInfo = { ...salaryInfo, fixedAllowancePercentage: percent };
                        setSalaryInfo(updatedSalaryInfo);
                        if (updatedSalaryInfo.monthlyWage) {
                          // Calculate fixed allowance from the new percentage
                          const monthlyWage = parseFloat(updatedSalaryInfo.monthlyWage) || 0;
                          const fixedAllowance = monthlyWage * (percent / 100);
                          setSalaryInfo({
                            ...updatedSalaryInfo,
                            fixedAllowance: fixedAllowance.toFixed(2)
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Fixed allowance portion determined after calculating all components</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Provident Fund (PF) Contribution</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                    <input
                      type="number"
                      value={salaryInfo.pfEmployee}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.pfEmployeePercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, pfEmployeePercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employer</label>
                    <input
                      type="number"
                      value={salaryInfo.pfEmployer}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Percentage</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={salaryInfo.pfEmployerPercentage}
                      onChange={(e) => {
                        const percent = parseFloat(e.target.value) || 0;
                        setSalaryInfo({ ...salaryInfo, pfEmployerPercentage: percent });
                        if (salaryInfo.monthlyWage) handleSalaryWageChange(salaryInfo.monthlyWage);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">PF is calculated based on the basic salary</p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Tax Deductions</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professional Tax</label>
                <input
                  type="number"
                  value={salaryInfo.professionalTax}
                  onChange={(e) => setSalaryInfo({ ...salaryInfo, professionalTax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Professional Tax deducted from the Gross salary</p>
              </div>
            </div>

            <button
              onClick={handleSaveSalaryInfo}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Salary Info'}
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Login ID</label>
              <input
                type="text"
                value={basicInfo.loginId}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={basicInfo.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <p className="text-sm text-gray-500">
              To change your password, please use the Change Password feature in the settings menu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
