import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Helper function to format date for HTML date input (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    // If it's an ISO string, extract just the date part
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    // If it's already in YYYY-MM-DD format, return as is
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
  }
  // If it's a Date object, format it
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
};

// Helper function to format date for display (MM/DD/YYYY)
const formatDateForDisplay = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${month}/${day}/${year}`;
  } catch (error) {
    return '';
  }
};

// Validation functions for Indian banking standards
const validateIFSC = (ifsc) => {
  if (!ifsc || ifsc.trim() === '') return { isValid: true, message: '' }; // Optional field
  const trimmedIfsc = ifsc.trim().toUpperCase();
  
  // Check for invalid characters first
  if (!/^[A-Z0-9]+$/.test(trimmedIfsc)) {
    return { isValid: false, message: 'IFSC code can only contain letters and numbers' };
  }
  
  // Check length
  if (trimmedIfsc.length !== 11) {
    return { isValid: false, message: `IFSC code must be exactly 11 characters (currently ${trimmedIfsc.length})` };
  }
  
  // Check format: 4 letters, 0, then 6 alphanumeric
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(trimmedIfsc)) {
    return { isValid: false, message: 'IFSC format: 4 letters, 0, then 6 alphanumeric (e.g., HDFC0001234)' };
  }
  return { isValid: true, message: '' };
};

const validatePAN = (pan) => {
  if (!pan || pan.trim() === '') return { isValid: true, message: '' }; // Optional field
  const trimmedPan = pan.trim().toUpperCase();
  
  // Check length first
  if (trimmedPan.length !== 10) {
    return { isValid: false, message: `PAN must be exactly 10 characters (currently ${trimmedPan.length})` };
  }
  
  // Check format: 5 letters, 4 digits, 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(trimmedPan)) {
    return { isValid: false, message: 'PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)' };
  }
  return { isValid: true, message: '' };
};

const validateUAN = (uan) => {
  if (!uan || uan.trim() === '') return { isValid: true, message: '' }; // Optional field
  const trimmedUan = uan.trim();
  
  // Check for non-digits
  if (!/^[0-9]+$/.test(trimmedUan)) {
    return { isValid: false, message: 'UAN must contain only digits' };
  }
  
  // Check length
  if (trimmedUan.length !== 12) {
    return { isValid: false, message: `UAN must be exactly 12 digits (currently ${trimmedUan.length})` };
  }
  return { isValid: true, message: '' };
};

const validateBIC = (bic) => {
  if (!bic || bic.trim() === '') return { isValid: true, message: '' }; // Optional field
  const trimmedBic = bic.trim().toUpperCase();
  
  // Check length
  if (trimmedBic.length !== 8 && trimmedBic.length !== 11) {
    return { isValid: false, message: `BIC/SWIFT code must be 8 or 11 characters (currently ${trimmedBic.length})` };
  }
  
  // Check format
  const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  if (!bicRegex.test(trimmedBic)) {
    return { isValid: false, message: 'BIC/SWIFT format invalid (e.g., HDFCINBB or HDFCINBB123)' };
  }
  return { isValid: true, message: '' };
};

const validateAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.trim() === '') return { isValid: true, message: '' }; // Optional field
  const trimmedAccount = accountNumber.trim();
  
  // Check for invalid characters
  if (!/^[A-Z0-9]+$/i.test(trimmedAccount)) {
    return { isValid: false, message: 'Account number can only contain letters and numbers' };
  }
  
  // Check length
  if (trimmedAccount.length < 9 || trimmedAccount.length > 18) {
    return { isValid: false, message: `Account number must be 9-18 characters (currently ${trimmedAccount.length})` };
  }
  return { isValid: true, message: '' };
};

const EmployeeInfo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [employeeId, setEmployeeId] = useState(location.state?.employeeId || null);
  const fromRegistration = location.state?.fromRegistration;

  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    department: '',
    hireDate: '',
    salary: '',
    role: 'Employee',
    managerId: ''
  });
  const [employees, setEmployees] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'resume', 'private', 'salary'
  const [showDeleteSkillConfirm, setShowDeleteSkillConfirm] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [showDeleteCertificationConfirm, setShowDeleteCertificationConfirm] = useState(false);
  const [certificationToDelete, setCertificationToDelete] = useState(null);

  // Resume data
  const [resumeData, setResumeData] = useState({
    about: '',
    jobLove: '',
    interests: '',
    skills: [],
    certifications: []
  });

  // Private info data
  const [privateInfo, setPrivateInfo] = useState({
    nationality: '',
    maritalStatus: '',
    bankAccountNumber: '',
    bankName: '',
    ifscCode: '',
    panNumber: '',
    uanNumber: '',
    bicCode: ''
  });

  // Validation errors for private info
  const [privateInfoErrors, setPrivateInfoErrors] = useState({
    bankAccountNumber: '',
    ifscCode: '',
    panNumber: '',
    uanNumber: '',
    bicCode: ''
  });

  // Salary info data
  const [salaryInfo, setSalaryInfo] = useState({
    wageType: 'Fixed',
    monthlyWage: '',
    yearlyWage: '',
    basicSalary: '',
    basicSalaryPercentage: 60,
    hra: '',
    hraPercentage: 6,
    standardAllowance: '',
    standardAllowancePercentage: 0,
    performanceBonus: '',
    performanceBonusPercentage: 0,
    leaveTravelAllowance: '',
    leaveTravelAllowancePercentage: 0,
    fixedAllowance: '',
    fixedAllowancePercentage: 23.50,
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
    if (employeeId) {
      fetchEmployee();
    } else if (fromRegistration) {
      // Get current user's employee info
      fetchCurrentEmployee();
    }
    // Fetch employees list for manager dropdown
    fetchEmployees();
  }, [employeeId]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/employees/${employeeId}`);
      const emp = response.data;
      setFormData({
        employeeId: emp.employee_id || '',
        firstName: emp.first_name || '',
        lastName: emp.last_name || '',
        email: emp.email || '',
        phoneNumber: emp.phone_number || '',
        dateOfBirth: formatDateForInput(emp.date_of_birth),
        gender: emp.gender || '',
        address: emp.address || '',
        department: emp.department || '',
        hireDate: formatDateForInput(emp.hire_date),
        salary: emp.salary || '',
        role: emp.role || 'Employee',
        managerId: emp.manager_id || ''
      });
      setProfileImageUrl(emp.profile_image_url || null);
      setUserRole(emp.role || 'Employee');
      
      // Get user_id for role update
      if (emp.user_id) {
        setUserId(emp.user_id);
      }

      // Fetch profile data (resume, private info, salary info)
      try {
        const profileResponse = await api.get(`/profile/${employeeId}`);
        const data = profileResponse.data;
        
        // Set private info
        setPrivateInfo({
          nationality: data.nationality || '',
          maritalStatus: data.marital_status || '',
          bankAccountNumber: data.bank_account_number || '',
          bankName: data.bank_name || '',
          ifscCode: data.ifsc_code || '',
          panNumber: data.pan_number || '',
          uanNumber: data.uan_number || '',
          bicCode: data.bic_code || ''
        });
        
        // Clear validation errors when loading data
        setPrivateInfoErrors({
          bankAccountNumber: '',
          ifscCode: '',
          panNumber: '',
          uanNumber: '',
          bicCode: ''
        });

        // Set resume data
        setResumeData({
          about: data.about || '',
          jobLove: data.job_love || '',
          interests: data.interests || '',
          skills: data.skills || [],
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
      } catch (profileError) {
        console.error('Failed to fetch profile data:', profileError);
        // Continue even if profile data fetch fails
      }
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      toast.error('Failed to load employee information');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEmployee = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user?.employee) {
        const emp = response.data.user.employee;
        // Set the employee ID so we can save data later
        setEmployeeId(emp.id);
        setFormData({
          employeeId: emp.employee_id || '',
          firstName: emp.first_name || '',
          lastName: emp.last_name || '',
          email: emp.email || response.data.user.email || '',
          phoneNumber: emp.phone_number || '',
          dateOfBirth: formatDateForInput(emp.date_of_birth),
          gender: emp.gender || '',
          address: emp.address || '',
          department: emp.department || '',
          hireDate: formatDateForInput(emp.hire_date),
          salary: emp.salary || ''
        });
        
        // Also fetch profile data (resume, private info, salary info)
        try {
          const profileResponse = await api.get(`/profile/${emp.id}`);
          const data = profileResponse.data;
          
          // Set private info
          setPrivateInfo({
            nationality: data.nationality || '',
            maritalStatus: data.marital_status || '',
            bankAccountNumber: data.bank_account_number || '',
            bankName: data.bank_name || '',
            ifscCode: data.ifsc_code || '',
            panNumber: data.pan_number || '',
            uanNumber: data.uan_number || '',
            bicCode: data.bic_code || ''
          });
          
          // Clear validation errors when loading data
          setPrivateInfoErrors({
            bankAccountNumber: '',
            ifscCode: '',
            panNumber: '',
            uanNumber: '',
            bicCode: ''
          });

          // Set resume data
          setResumeData({
            about: data.about || '',
            jobLove: data.job_love || '',
            interests: data.interests || '',
            skills: data.skills || [],
            certifications: data.certifications || []
          });
        } catch (profileError) {
          console.error('Failed to fetch profile data:', profileError);
        }
      }
    } catch (error) {
      console.error('Failed to fetch current employee:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setProfileImageUrl(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage || !employeeId) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', profileImage);

      const response = await api.post(`/upload/employee/${employeeId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfileImageUrl(response.data.imageUrl);
      setProfileImage(null);
      toast.success('Profile image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (employeeId) {
        await api.put(`/employees/${employeeId}`, {
          ...formData,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
          department: formData.department,
          hireDate: formData.hireDate,
          salary: formData.salary,
          managerId: formData.managerId || null
        });
        
        // Update role if changed and user is Admin
        let roleUpdated = false;
        if (user?.role === 'Admin' && userId && formData.role && formData.role !== userRole) {
          try {
            await api.put(`/auth/users/${userId}/role`, { role: formData.role });
            roleUpdated = true;
          } catch (roleError) {
            console.error('Failed to update role:', roleError);
            toast.warning('Employee updated but role update failed. Please try updating role separately.');
            setLoading(false);
            return;
          }
        }
        
        if (roleUpdated) {
          toast.success(`Employee updated successfully! Role changed from ${userRole} to ${formData.role}.`);
        } else {
          toast.success('Employee updated successfully!');
        }
        navigate('/employees');
      } else {
        // Create new employee (Employee ID will be auto-generated by backend)
        // Build request body, explicitly excluding employeeId
        const requestBody = {
          firstName: formData.firstName,
          lastName: formData.lastName
        };
        
        // Only include optional fields if they have values
        if (formData.email && formData.email.trim() !== '') {
          requestBody.email = formData.email.trim();
        }
        if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
          requestBody.phoneNumber = formData.phoneNumber.trim();
        }
        if (formData.dateOfBirth) {
          requestBody.dateOfBirth = formData.dateOfBirth;
        }
        if (formData.gender) {
          requestBody.gender = formData.gender;
        }
        if (formData.address && formData.address.trim() !== '') {
          requestBody.address = formData.address.trim();
        }
        if (formData.department) {
          requestBody.department = formData.department;
        }
        if (formData.hireDate) {
          requestBody.hireDate = formData.hireDate;
        }
        if (formData.salary) {
          requestBody.salary = formData.salary;
        }
        if (formData.role) {
          requestBody.role = formData.role;
        }
        if (formData.managerId) {
          requestBody.managerId = formData.managerId;
        }
        
        const response = await api.post('/employees', requestBody);

        // Show Employee ID, Login ID and Password if generated
        const message = `Employee created successfully!\n\nEmployee ID: ${response.data.employee_id || 'N/A'}\nLogin ID: ${response.data.loginId || 'N/A'}\nPassword: ${response.data.password || 'N/A'}\n\nPlease share these credentials with the employee. They must change password on first login.`;
        toast.success(message, { autoClose: 6000 });
      }
      navigate('/employees');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save employee information');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for Resume
  const handleSaveResume = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await api.put(`/profile/${employeeId}`, {
        about: resumeData.about,
        jobLove: resumeData.jobLove,
        interests: resumeData.interests
      });
      toast.success('Resume information saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save resume information');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !employeeId) return;
    try {
      await api.post(`/profile/${employeeId}/skills`, {
        skillName: newSkill.trim()
      });
      setNewSkill('');
      toast.success('Skill added successfully');
      // Refresh profile data
      const profileResponse = await api.get(`/profile/${employeeId}`);
      setResumeData({
        ...resumeData,
        skills: profileResponse.data.skills || []
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleDeleteSkillClick = (skillId, skillName) => {
    setSkillToDelete({ id: skillId, name: skillName });
    setShowDeleteSkillConfirm(true);
  };

  const handleDeleteSkillConfirm = async () => {
    if (!employeeId || !skillToDelete?.id) return;
    try {
      await api.delete(`/profile/${employeeId}/skills/${skillToDelete.id}`);
      toast.success('Skill deleted successfully');
      // Refresh profile data
      const profileResponse = await api.get(`/profile/${employeeId}`);
      setResumeData({
        ...resumeData,
        skills: profileResponse.data.skills || []
      });
      setShowDeleteSkillConfirm(false);
      setSkillToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete skill');
      setShowDeleteSkillConfirm(false);
      setSkillToDelete(null);
    }
  };

  const handleDeleteSkillCancel = () => {
    setShowDeleteSkillConfirm(false);
    setSkillToDelete(null);
  };

  const handleAddCertification = async () => {
    if (!newCertification.certificationName.trim() || !employeeId) return;
    try {
      await api.post(`/profile/${employeeId}/certifications`, newCertification);
      setNewCertification({
        certificationName: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: ''
      });
      toast.success('Certification added successfully');
      // Refresh profile data
      const profileResponse = await api.get(`/profile/${employeeId}`);
      setResumeData({
        ...resumeData,
        certifications: profileResponse.data.certifications || []
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add certification');
    }
  };

  const handleDeleteCertificationClick = (certId, certName) => {
    setCertificationToDelete({ id: certId, name: certName });
    setShowDeleteCertificationConfirm(true);
  };

  const handleDeleteCertificationConfirm = async () => {
    if (!employeeId || !certificationToDelete?.id) return;
    try {
      await api.delete(`/profile/${employeeId}/certifications/${certificationToDelete.id}`);
      toast.success('Certification deleted successfully');
      // Refresh profile data
      const profileResponse = await api.get(`/profile/${employeeId}`);
      setResumeData({
        ...resumeData,
        certifications: profileResponse.data.certifications || []
      });
      setShowDeleteCertificationConfirm(false);
      setCertificationToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete certification');
      setShowDeleteCertificationConfirm(false);
      setCertificationToDelete(null);
    }
  };

  const handleDeleteCertificationCancel = () => {
    setShowDeleteCertificationConfirm(false);
    setCertificationToDelete(null);
  };

  // Handlers for Private Info
  const validateField = (field, value) => {
    let validation = { isValid: true, message: '' };
    switch (field) {
      case 'bankAccountNumber':
        validation = validateAccountNumber(value);
        break;
      case 'ifscCode':
        validation = validateIFSC(value);
        break;
      case 'panNumber':
        validation = validatePAN(value);
        break;
      case 'uanNumber':
        validation = validateUAN(value);
        break;
      case 'bicCode':
        validation = validateBIC(value);
        break;
      default:
        break;
    }
    return validation;
  };

  const handlePrivateInfoChange = (field, value) => {
    // Update the field value
    setPrivateInfo(prev => ({ ...prev, [field]: value }));
    
    // Validate immediately on change
    const validation = validateField(field, value);
    
    // Update error state - this will trigger re-render if error changes
    setPrivateInfoErrors(prev => ({
      ...prev,
      [field]: validation.isValid ? '' : validation.message
    }));
  };

  const handlePrivateInfoBlur = (field, value) => {
    // Trim whitespace on blur
    const trimmedValue = value.trim();
    if (trimmedValue !== value) {
      setPrivateInfo({ ...privateInfo, [field]: trimmedValue });
    }
    
    // Validate on blur
    const validation = validateField(field, trimmedValue);
    setPrivateInfoErrors({
      ...privateInfoErrors,
      [field]: validation.isValid ? '' : validation.message
    });
  };

  const handleSavePrivateInfo = async () => {
    if (!employeeId) {
      toast.error('Employee ID not found. Please refresh the page and try again.');
      return;
    }
    
    // Validate all fields before saving
    const accountValidation = validateAccountNumber(privateInfo.bankAccountNumber);
    const ifscValidation = validateIFSC(privateInfo.ifscCode);
    const panValidation = validatePAN(privateInfo.panNumber);
    const uanValidation = validateUAN(privateInfo.uanNumber);
    const bicValidation = validateBIC(privateInfo.bicCode);
    
    const errors = {
      bankAccountNumber: accountValidation.isValid ? '' : accountValidation.message,
      ifscCode: ifscValidation.isValid ? '' : ifscValidation.message,
      panNumber: panValidation.isValid ? '' : panValidation.message,
      uanNumber: uanValidation.isValid ? '' : uanValidation.message,
      bicCode: bicValidation.isValid ? '' : bicValidation.message
    };
    
    setPrivateInfoErrors(errors);
    
    // Check if there are any validation errors
    const hasErrors = Object.values(errors).some(error => error !== '');
    if (hasErrors) {
      toast.error('Please fix all validation errors before saving');
      return;
    }
    
    setSaving(true);
    try {
      // Trim all values before saving
      await api.put(`/profile/${employeeId}`, {
        nationality: privateInfo.nationality?.trim() || '',
        maritalStatus: privateInfo.maritalStatus?.trim() || '',
        bankAccountNumber: privateInfo.bankAccountNumber?.trim().toUpperCase() || '',
        bankName: privateInfo.bankName?.trim() || '',
        ifscCode: privateInfo.ifscCode?.trim().toUpperCase() || '',
        panNumber: privateInfo.panNumber?.trim().toUpperCase() || '',
        uanNumber: privateInfo.uanNumber?.trim() || '',
        bicCode: privateInfo.bicCode?.trim().toUpperCase() || ''
      });
      // Clear validation errors on successful save
      setPrivateInfoErrors({
        bankAccountNumber: '',
        ifscCode: '',
        panNumber: '',
        uanNumber: '',
        bicCode: ''
      });
      toast.success('Private information saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save private information');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Salary Info
  const handleSalaryWageChange = (value) => {
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
    
    // Calculate Fixed Allowance (remaining)
    const totalComponents = basicSalary + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
    const fixedAllowance = monthlyWage - totalComponents;
    const fixedAllowancePercentage = monthlyWage > 0 ? (fixedAllowance / monthlyWage) * 100 : 0;
    
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
    if (!employeeId) return;
    const monthlyWage = parseFloat(salaryInfo.monthlyWage);
    if (!salaryInfo.monthlyWage || isNaN(monthlyWage) || monthlyWage < 0) {
      toast.error('Please enter a valid monthly wage');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/profile/${employeeId}/salary`, {
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
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to save salary information';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const canEditAll = ['Admin', 'HR Officer'].includes(user?.role);
  const canViewSalaryInfo = ['Admin', 'Payroll Officer'].includes(user?.role);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Employee Information</h1>

      {/* Delete Skill Confirmation Modal */}
      {showDeleteSkillConfirm && skillToDelete && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Skill</h3>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the skill <span className="font-semibold">{skillToDelete.name}</span>?
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteSkillCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSkillConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Certification Confirmation Modal */}
      {showDeleteCertificationConfirm && certificationToDelete && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Delete Certification</h3>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the certification <span className="font-semibold">{certificationToDelete.name}</span>?
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCertificationCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCertificationConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Profile Image Upload */}
        {employeeId && (
          <div className="mb-6 pb-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
            <div className="flex items-center space-x-4">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mb-2"
                />
                {profileImage && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs - Only show when editing existing employee */}
        {employeeId && (
          <div className="flex space-x-4 border-b mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'basic'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Basic Info
            </button>
            <button
              type="button"
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
              type="button"
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
                type="button"
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
          </div>
        )}

        {/* Basic Info Tab */}
        {(activeTab === 'basic' || !employeeId) && (
          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {canEditAll && employeeId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  disabled={true}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            )}
            {canEditAll && !employeeId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                <input
                  type="text"
                  value="Auto-generated"
                  disabled={true}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 italic text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">Employee ID will be automatically generated</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
             </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === 'Male'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Male
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Female
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="Other"
                    checked={formData.gender === 'Other'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Other
                </label>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {canEditAll && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Enter monthly salary"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Monthly salary amount</p>
                </div>

                {/* Manager field */}
                {canEditAll && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                    <select
                      name="managerId"
                      value={formData.managerId || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Manager</option>
                      {employees
                        .filter(emp => !employeeId || emp.id !== parseInt(employeeId)) // Exclude current employee
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employee_id} - {emp.first_name} {emp.last_name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the manager for this employee
                    </p>
                  </div>
                )}

                {/* Role field - show when creating new employee or when Admin editing existing employee */}
                {((!employeeId && canEditAll) || (employeeId && user?.role === 'Admin')) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Role {!employeeId ? '*' : ''}
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required={!employeeId}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Employee">Employee</option>
                      <option value="HR Officer">HR Officer</option>
                      <option value="Payroll Officer">Payroll Officer</option>
                      <option value="Manager">Manager</option>
                      {user?.role === 'Admin' && (
                        <option value="Admin">Admin</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {employeeId 
                        ? 'Change user role (Admin only)' 
                        : 'Select the role for this user account'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
        )}

        {/* Resume Tab */}
        {employeeId && activeTab === 'resume' && (
          <div className="space-y-6">
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
                              handleDeleteSkillClick(skill.id, skill.skill_name || skill);
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
                      <div key={cert.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800">{cert.certification_name}</span>
                            {cert.issuing_organization && (
                              <span className="text-sm text-gray-600">- {cert.issuing_organization}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {cert.issue_date && (
                              <span className="text-gray-700 font-medium">{formatDateForDisplay(cert.issue_date)}</span>
                            )}
                            {cert.expiry_date && (
                               <span className="text-gray-700 font-medium">{formatDateForDisplay(cert.expiry_date)}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCertificationClick(cert.id, cert.certification_name)}
                          className="text-red-600 hover:text-red-800 ml-3 flex-shrink-0"
                          title="Delete certification"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Private Info Tab */}
        {employeeId && activeTab === 'private' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
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
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 mb-2">Bank Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={privateInfo.bankAccountNumber}
                    onChange={(e) => handlePrivateInfoChange('bankAccountNumber', e.target.value)}
                    onBlur={(e) => handlePrivateInfoBlur('bankAccountNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      privateInfoErrors.bankAccountNumber 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="9-18 alphanumeric characters"
                  />
                  {privateInfoErrors.bankAccountNumber && (
                    <p className="mt-1 text-sm text-red-600">{privateInfoErrors.bankAccountNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={privateInfo.bankName}
                    onChange={(e) => setPrivateInfo({ ...privateInfo, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={privateInfo.ifscCode}
                    onChange={(e) => handlePrivateInfoChange('ifscCode', e.target.value.toUpperCase())}
                    onBlur={(e) => handlePrivateInfoBlur('ifscCode', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      privateInfoErrors.ifscCode 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="HDFC0001234"
                    maxLength={11}
                  />
                  {privateInfoErrors.ifscCode && (
                    <p className="mt-1 text-sm text-red-600">{privateInfoErrors.ifscCode}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PAN No.</label>
                  <input
                    type="text"
                    value={privateInfo.panNumber}
                    onChange={(e) => handlePrivateInfoChange('panNumber', e.target.value.toUpperCase())}
                    onBlur={(e) => handlePrivateInfoBlur('panNumber', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      privateInfoErrors.panNumber 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  {privateInfoErrors.panNumber && (
                    <p className="mt-1 text-sm text-red-600">{privateInfoErrors.panNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UAN No.</label>
                  <input
                    type="text"
                    value={privateInfo.uanNumber}
                    onChange={(e) => handlePrivateInfoChange('uanNumber', e.target.value.replace(/\D/g, ''))}
                    onBlur={(e) => handlePrivateInfoBlur('uanNumber', e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      privateInfoErrors.uanNumber 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="12 digits"
                    maxLength={12}
                  />
                  {privateInfoErrors.uanNumber && (
                    <p className="mt-1 text-sm text-red-600">{privateInfoErrors.uanNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">BIC Code</label>
                  <input
                    type="text"
                    value={privateInfo.bicCode}
                    onChange={(e) => handlePrivateInfoChange('bicCode', e.target.value.toUpperCase())}
                    onBlur={(e) => handlePrivateInfoBlur('bicCode', e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      privateInfoErrors.bicCode 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="HDFCINBB or HDFCINBB123"
                    maxLength={11}
                  />
                  {privateInfoErrors.bicCode && (
                    <p className="mt-1 text-sm text-red-600">{privateInfoErrors.bicCode}</p>
                  )}
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
          </div>
        )}

        {/* Salary Info Tab - Only visible to Admin and Payroll Officer */}
        {employeeId && activeTab === 'salary' && canViewSalaryInfo && (
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
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
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
      </div>
    </div>
  );
};

export default EmployeeInfo;

