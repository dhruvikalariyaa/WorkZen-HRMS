import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [payruns, setPayruns] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [currentPayrollId, setCurrentPayrollId] = useState(null); // Store the current payroll ID to prevent stale data
  const [payslipTab, setPayslipTab] = useState('workedDays');
  const [workedDays, setWorkedDays] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState(null);
  const [warningEmployees, setWarningEmployees] = useState([]);
  const [loadingWarning, setLoadingWarning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [loadingPayrunDetails, setLoadingPayrunDetails] = useState(false);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [computing, setComputing] = useState(false);
  const [validatingPayrun, setValidatingPayrun] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showValidatePayrunConfirm, setShowValidatePayrunConfirm] = useState(false);
  const [payrunToValidate, setPayrunToValidate] = useState(null);
  const [generateData, setGenerateData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'payrun') {
      fetchPayruns();
    }
  }, [activeTab]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payroll/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayruns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payroll/payruns');
      setPayruns(response.data);
    } catch (error) {
      console.error('Failed to fetch payruns:', error);
      toast.error('Failed to load payruns');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrunDetails = async (payrunId) => {
    try {
      setLoadingPayrunDetails(true);
      const response = await api.get(`/payroll/payrun/${payrunId}`);
      setPayrolls(response.data);
      setSelectedPayrun(payrunId);
    } catch (error) {
      console.error('Failed to fetch payrun details:', error);
      toast.error('Failed to load payrun details');
    } finally {
      setLoadingPayrunDetails(false);
    }
  };

  const handleGeneratePayrollClick = (e) => {
    e.preventDefault();
    setShowGenerateConfirm(true);
  };

  const handleGeneratePayrollConfirm = async () => {
    try {
      setLoading(true);
      await api.post('/payroll/generate', generateData);
      setShowGenerateModal(false);
      setShowGenerateConfirm(false);
      toast.success('Payroll generated successfully for all employees');
      if (activeTab === 'payrun') {
        fetchPayruns();
      } else {
        fetchDashboard();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate payroll');
      setShowGenerateConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayrollCancel = () => {
    setShowGenerateConfirm(false);
  };

  const handleValidatePayrunClick = (payrunId) => {
    setPayrunToValidate(payrunId);
    setShowValidatePayrunConfirm(true);
  };

  const handleValidatePayrunConfirm = async () => {
    if (!payrunToValidate) return;
    try {
      setValidatingPayrun(true);
      await api.put(`/payroll/payrun/${payrunToValidate}/validate`);
      toast.success('Payrun validated successfully');
      fetchPayruns();
      if (selectedPayrun === payrunToValidate) {
        fetchPayrunDetails(payrunToValidate);
      }
      setShowValidatePayrunConfirm(false);
      setPayrunToValidate(null);
    } catch (error) {
      toast.error('Failed to validate payrun');
      setShowValidatePayrunConfirm(false);
      setPayrunToValidate(null);
    } finally {
      setValidatingPayrun(false);
    }
  };

  const handleValidatePayrunCancel = () => {
    setShowValidatePayrunConfirm(false);
    setPayrunToValidate(null);
  };

  const handleViewPayslip = async (payroll) => {
    try {
      setLoadingPayslip(true);
      // Store the payroll ID immediately to ensure we use the correct one
      const payrollId = payroll.id;
      setCurrentPayrollId(payrollId);
      
      const response = await api.get(`/payroll/payslip/${payrollId}`);
      setSelectedPayroll(response.data);
      
      // Fetch worked days
      try {
        const workedDaysResponse = await api.get(`/payroll/${payrollId}/worked-days`);
        setWorkedDays(workedDaysResponse.data);
      } catch (error) {
        console.error('Failed to fetch worked days:', error);
      }
      
      setShowPayslipModal(true);
      setPayslipTab('workedDays');
    } catch (error) {
      toast.error('Failed to load payslip');
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handleCompute = async () => {
    if (!selectedPayroll) return;
    
    // Store the current payroll ID to ensure we stay on the same payroll
    const currentPayrollId = selectedPayroll.id;
    
    try {
      setComputing(true);
      // Recalculate payroll
      const response = await api.post('/payroll/generate', {
        employeeId: selectedPayroll.employee_id,
        month: selectedPayroll.month,
        year: selectedPayroll.year
      });
      
      // Use the payroll ID from response (or keep the current one if response doesn't have it)
      const updatedPayrollId = response.data?.id || currentPayrollId;
      
      toast.success('Payroll recomputed successfully');
      
      // Reload payslip using the same payroll ID (don't change to a different payroll)
      const payslipResponse = await api.get(`/payroll/payslip/${updatedPayrollId}`);
      setSelectedPayroll(payslipResponse.data);
      
      // Fetch worked days for the same payroll
      const workedDaysResponse = await api.get(`/payroll/${updatedPayrollId}/worked-days`);
      setWorkedDays(workedDaysResponse.data);
      
      // Switch to Salary Computation tab to show the computed values
      setPayslipTab('salaryComputation');
    } catch (error) {
      toast.error('Failed to compute payroll');
    } finally {
      setComputing(false);
    }
  };

  const handleValidate = async () => {
    // Use currentPayrollId instead of selectedPayroll.id to avoid stale data
    const payrollIdToValidate = currentPayrollId || selectedPayroll?.id;
    
    if (!payrollIdToValidate || validating) {
      console.error('Cannot validate: payrollIdToValidate =', payrollIdToValidate, 'validating =', validating);
      return;
    }
    
    try {
      setValidating(true);
      
      // Log for debugging
      console.log('Validating payroll ID:', payrollIdToValidate, 'Employee:', selectedPayroll?.first_name, selectedPayroll?.last_name);
      
      // Validate the individual employee's payslip using the stored payroll ID
      const response = await api.put(`/payroll/validate/${payrollIdToValidate}`);
      
      if (response.data) {
        toast.success(`Payslip validated successfully for ${selectedPayroll?.first_name || 'employee'}`);
        
        // Refresh the payslip data to get updated validation status
        const updatedPayslip = await api.get(`/payroll/payslip/${payrollIdToValidate}`);
        setSelectedPayroll(updatedPayslip.data);
        
        // Refresh payrun details if we're viewing a payrun to update the status in the table
        if (selectedPayrun) {
          await fetchPayrunDetails(selectedPayrun);
        }
      }
    } catch (error) {
      console.error('Validate error:', error);
      toast.error(error.response?.data?.error || 'Failed to validate payslip');
    } finally {
      setValidating(false);
    }
  };

  const handleNewPayslip = () => {
    setShowPayslipModal(false);
    setSelectedPayroll(null);
    setCurrentPayrollId(null);
    setWorkedDays(null);
    setShowGenerateModal(true);
  };

  const handleWarningClick = async (type) => {
    setWarningType(type);
    setShowWarningModal(true);
    setLoadingWarning(true);
    try {
      const endpoint = type === 'no_bank_account' 
        ? '/payroll/warnings/no-bank-account'
        : '/payroll/warnings/no-manager';
      const response = await api.get(endpoint);
      setWarningEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch warning employees:', error);
      toast.error('Failed to load employee list');
    } finally {
      setLoadingWarning(false);
    }
  };

  const handleEmployeeClick = (employeeId) => {
    // Navigate to employee profile or open in new tab
    window.open(`/profile/${employeeId}`, '_blank');
  };

  if (loading && !dashboardData && !payruns.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#8200db' }}></div>
          <p className="text-gray-600 font-medium">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Generate Payroll Confirmation Modal */}
      {showGenerateConfirm && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 border-2 border-[#8200db]">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#8200db20' }}>
                <svg className="w-5 h-5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Generate Payroll</h3>
                <p className="text-xs text-gray-600 mt-0.5">Generate payroll for all employees</p>
              </div>
            </div>
            
            <div className="mb-4 pb-4 border-b-2 border-gray-200">
              <p className="text-sm text-gray-700">
                Are you sure you want to generate payroll for <span className="font-semibold" style={{ color: '#8200db' }}>{months[generateData.month - 1]} {generateData.year}</span>?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This will create payroll records for all active employees for the selected month and year.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleGeneratePayrollCancel}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayrollConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium disabled:opacity-50 shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#8200db' }}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Payrun Confirmation Modal */}
      {showValidatePayrunConfirm && payrunToValidate && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-4 border-2 border-[#8200db]">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#8200db20' }}>
                <svg className="w-5 h-5" style={{ color: '#8200db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Validate Payrun</h3>
                <p className="text-xs text-gray-600 mt-0.5">Confirm payrun validation</p>
              </div>
            </div>
            
            <div className="mb-4 pb-4 border-b-2 border-gray-200">
              <p className="text-sm text-gray-700">
                Are you sure you want to validate this payrun?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Once validated, the payrun will be marked as approved and cannot be modified.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleValidatePayrunCancel}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleValidatePayrunConfirm}
                disabled={validatingPayrun}
                className="px-4 py-2 rounded-lg text-sm text-white transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#8200db' }}
              >
                {validatingPayrun ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="border-b-2 border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'dashboard'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={activeTab === 'dashboard' ? { backgroundColor: '#8200db' } : {}}
              >
                Dashboard
                {activeTab === 'dashboard' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('payrun')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'payrun'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={activeTab === 'payrun' ? { backgroundColor: '#8200db' } : {}}
              >
                Payrun
                {activeTab === 'payrun' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                )}
              </button>
            </div>
          </div>

          <div className="p-8">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Warnings Section */}
                {dashboardData?.warnings && dashboardData.warnings.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 rounded-lg p-6 shadow-md" style={{ borderColor: '#f59e0b' }}>
                    <div className="flex items-center mb-4">
                      <svg className="w-6 h-6 mr-3" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-xl font-bold" style={{ color: '#f59e0b' }}>Warnings</h3>
                    </div>
                    <ul className="space-y-3">
                      {dashboardData.warnings.map((warning, index) => (
                        <li 
                          key={index} 
                          className="text-gray-700 cursor-pointer hover:underline font-medium p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-all"
                          onClick={() => handleWarningClick(warning.type)}
                        >
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Payrun Section */}
                <div>
                  <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                    <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Recent Payruns</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {dashboardData?.payruns && dashboardData.payruns.length > 0 ? (
                      dashboardData.payruns.map((payrun, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded p-2 hover:shadow-md cursor-pointer transition-all hover:border-[#8200db]"
                          onClick={() => {
                            setActiveTab('payrun');
                            fetchPayrunDetails(payrun.payrun_id);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                Payrun for {months[payrun.month - 1]} {payrun.year}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payrun.employee_count} Payslips
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-700">Net: <span className="font-semibold" style={{ color: '#8200db' }}>₹{parseFloat(payrun.total_net || 0).toFixed(2)}</span></p>
                              <p className="text-xs text-gray-500">Employer Cost: ₹{parseFloat(payrun.total_employer_cost || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white border border-gray-200 rounded p-6 text-center">
                        <p className="text-gray-500 text-xs">No payruns found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payrun Tab */}
            {activeTab === 'payrun' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b-2" style={{ borderColor: '#8200db' }}>
                  <h3 className="text-lg font-semibold" style={{ color: '#8200db' }}>Payrun List</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowGenerateModal(true)}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
                      style={{ backgroundColor: '#8200db' }}
                    >
                      + New Payrun
                    </button>
                    {selectedPayrun && (
                      <button
                        onClick={() => handleValidatePayrunClick(selectedPayrun)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        Validate
                      </button>
                    )}
                  </div>
                </div>

                {/* Payrun Summary Table */}
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: '#8200db' }}>
                          <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Payrun</th>
                          <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Employer Cost</th>
                          <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Gross</th>
                          <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Net</th>
                          <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payruns.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                              No payruns found
                            </td>
                          </tr>
                        ) : (
                          payruns.map((payrun, index) => (
                            <tr
                              key={payrun.payrun_id}
                              className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all ${
                                selectedPayrun === payrun.payrun_id ? 'bg-purple-50' : ''
                              }`}
                              onClick={() => fetchPayrunDetails(payrun.payrun_id)}
                            >
                              <td className="py-2 px-4">
                                <span className={`font-semibold text-sm ${
                                  selectedPayrun === payrun.payrun_id ? 'text-[#8200db]' : 'text-gray-800'
                                }`}>
                                  {payrun.payrun_id}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-right text-sm text-gray-800">
                                ₹{parseFloat(payrun.total_employer_cost || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-4 text-right text-sm text-gray-800">
                                ₹{parseFloat(payrun.total_gross || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-4 text-right font-semibold text-sm" style={{ color: '#8200db' }}>
                                ₹{parseFloat(payrun.total_net || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchPayrunDetails(payrun.payrun_id);
                                  }}
                                  className="px-3 py-1 rounded text-white text-xs font-medium shadow-sm hover:shadow-md transition-all"
                                  style={{ backgroundColor: '#8200db' }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pay Period Details */}
                {loadingPayrunDetails ? (
                  <div className="mt-6 text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mb-3" style={{ borderColor: '#8200db' }}></div>
                    <p className="text-gray-600 text-sm">Loading payrun details...</p>
                  </div>
                ) : selectedPayrun && payrolls.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                      <h3 className="text-lg font-semibold" style={{ color: '#8200db' }}>Pay Period Details</h3>
                    </div>
                    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ backgroundColor: '#8200db' }}>
                              <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Pay Period</th>
                              <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Employees</th>
                              <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Employer Cost</th>
                              <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Basic Wage</th>
                              <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Gross Wage</th>
                              <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Net Wage</th>
                              <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Status</th>
                              <th className="text-center py-2 px-4 font-semibold text-white text-xs uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payrolls.map((payroll, index) => {
                              const totalEmployerCost = parseFloat(payroll.pf_employer || 0) + parseFloat(payroll.gross_salary || 0);
                              return (
                                <tr key={payroll.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <td className="py-2 px-4 text-sm text-gray-800">
                                    {months[payroll.month - 1]} {payroll.year}
                                  </td>
                                  <td className="py-2 px-4 text-sm text-gray-800">
                                    {payroll.first_name} {payroll.last_name}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{totalEmployerCost.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(payroll.basic_salary || 0).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(payroll.gross_salary || 0).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4 text-right font-semibold text-sm" style={{ color: '#8200db' }}>
                                    ₹{parseFloat(payroll.net_salary || 0).toFixed(2)}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        payroll.is_validated
                                          ? 'bg-green-100 text-green-800 border border-green-300'
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                      }`}
                                    >
                                      {payroll.is_validated ? '✓ Validated' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <button
                                      onClick={() => handleViewPayslip(payroll)}
                                      className="px-3 py-1 rounded text-white text-xs font-medium shadow-sm hover:shadow-md transition-all"
                                      style={{ backgroundColor: '#8200db' }}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 border-2" style={{ borderColor: '#8200db' }}>
            <div className="mb-4 pb-3 border-b-2" style={{ borderColor: '#8200db' }}>
              <h2 className="text-lg font-semibold" style={{ color: '#8200db' }}>Generate Payroll</h2>
              <p className="text-xs text-gray-600 mt-0.5">Select month and year to generate payroll</p>
            </div>
            <form onSubmit={handleGeneratePayrollClick} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Month *</label>
                <select
                  value={generateData.month}
                  onChange={(e) => setGenerateData({ ...generateData, month: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year *</label>
                <input
                  type="number"
                  value={generateData.year}
                  onChange={(e) => setGenerateData({ ...generateData, year: parseInt(e.target.value) })}
                  required
                  min="2000"
                  max="2100"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:ring-1 focus:ring-[#8200db] focus:ring-opacity-20 transition-all"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm text-white font-medium shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: '#8200db' }}
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && (
        loadingPayslip ? (
          <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl p-12 shadow-xl border-2" style={{ borderColor: '#8200db' }}>
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 mb-4" style={{ borderColor: '#8200db' }}></div>
                <p className="text-gray-600 font-medium">Loading payslip...</p>
              </div>
            </div>
          </div>
        ) : selectedPayroll ? (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl border-2" style={{ borderColor: '#8200db' }}>
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2" style={{ borderColor: '#8200db' }}>
                <div>
                  <h2 className="text-xl font-semibold mb-1" style={{ color: '#8200db' }}>{selectedPayroll.first_name} {selectedPayroll.last_name}</h2>
                  <p className="text-xs text-gray-600">
                    Payrun: {selectedPayroll.payrun_id || `Payrun ${months[selectedPayroll.month - 1]} ${selectedPayroll.year}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    Period: {new Date(selectedPayroll.year, selectedPayroll.month - 1, 1).toLocaleDateString()} to{' '}
                    {new Date(selectedPayroll.year, selectedPayroll.month, 0).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPayslipModal(false);
                    setCurrentPayrollId(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b-2 border-gray-200">
                <button
                  onClick={handleNewPayslip}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all"
                >
                  New Payslip
                </button>
                <button
                  onClick={handleCompute}
                  disabled={computing}
                  className="px-3 py-1.5 rounded text-xs text-white font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#8200db' }}
                >
                  {computing ? 'Computing...' : 'Compute'}
                </button>
                <button
                  onClick={handleValidate}
                  disabled={selectedPayroll?.is_validated || validating}
                  className={`px-3 py-1.5 rounded text-xs font-medium shadow-sm transition-all ${
                    selectedPayroll?.is_validated
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : validating
                      ? 'bg-green-400 text-white cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                  }`}
                >
                  {validating ? 'Validating...' : selectedPayroll?.is_validated ? '✓ Validated' : 'Validate'}
                </button>
                <button
                  onClick={() => {
                    setShowPayslipModal(false);
                    setCurrentPayrollId(null);
                  }}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium shadow-sm hover:shadow-md transition-all"
                >
                  Print
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b-2 border-gray-200 mb-4">
                <div className="flex">
                  <button
                    onClick={() => setPayslipTab('workedDays')}
                    className={`px-6 py-2.5 font-medium text-sm transition-all relative ${
                      payslipTab === 'workedDays'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    style={payslipTab === 'workedDays' ? { backgroundColor: '#8200db' } : {}}
                  >
                    Worked Days
                    {payslipTab === 'workedDays' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setPayslipTab('salaryComputation')}
                    className={`px-6 py-2.5 font-medium text-sm transition-all relative ${
                      payslipTab === 'salaryComputation'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    style={payslipTab === 'salaryComputation' ? { backgroundColor: '#8200db' } : {}}
                  >
                    Salary Computation
                    {payslipTab === 'salaryComputation' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Worked Days Tab */}
              {payslipTab === 'workedDays' && workedDays && (
                <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#8200db' }}>
                        <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Type</th>
                        <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Days</th>
                        <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-gray-800">Attendance</td>
                        <td className="py-2 px-4 text-right text-xs text-gray-700">
                          {parseFloat(workedDays.attendance_days || 0).toFixed(2)} ({workedDays.working_days_per_week} working days in week)
                        </td>
                        <td className="py-2 px-4 text-right text-sm text-gray-800">
                          ₹{parseFloat(workedDays.attendance_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-gray-800">Paid Time off</td>
                        <td className="py-2 px-4 text-right text-xs text-gray-700">
                          {parseFloat(workedDays.paid_time_off_days || 0).toFixed(2)} ({parseFloat(workedDays.paid_time_off_days || 0).toFixed(0)} Paid leaves/Month)
                        </td>
                        <td className="py-2 px-4 text-right text-sm text-gray-800">
                          ₹{parseFloat(workedDays.paid_time_off_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-gray-800">Unpaid Time off</td>
                        <td className="py-2 px-4 text-right text-xs text-gray-700">
                          {parseFloat(workedDays.unpaid_time_off_days || 0).toFixed(2)} ({parseFloat(workedDays.unpaid_time_off_days || 0).toFixed(0)} Unpaid leaves)
                        </td>
                        <td className="py-2 px-4 text-right text-sm text-red-600">
                          -₹{parseFloat(workedDays.unpaid_time_off_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 font-semibold border-t-2" style={{ borderColor: '#8200db' }}>
                        <td className="py-2 px-4 text-sm" style={{ color: '#8200db' }}>Total Payable Days</td>
                        <td className="py-2 px-4 text-right text-sm" style={{ color: '#8200db' }}>
                          {parseFloat(workedDays.total_payable_days || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-right text-sm" style={{ color: '#8200db' }}>
                          ₹{parseFloat(workedDays.total_payable_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="p-4 bg-gray-50 border-t-2 border-gray-200">
                    <p className="text-xs text-gray-600">
                      Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.
                    </p>
                  </div>
                </div>
              )}

              {/* Salary Computation Tab */}
              {payslipTab === 'salaryComputation' && selectedPayroll && (
                <div>
                  {(() => {
                    const grossSalary = parseFloat(selectedPayroll.gross_salary || 0);
                    const basicSalary = parseFloat(selectedPayroll.basic_salary || 0);
                    
                    // Calculate percentages for earnings (based on gross salary)
                    // If gross salary is 0 or invalid, use sum of components as fallback
                    const totalEarnings = parseFloat(selectedPayroll.basic_salary || 0) +
                                         parseFloat(selectedPayroll.hra || 0) +
                                         parseFloat(selectedPayroll.standard_allowance || 0) +
                                         parseFloat(selectedPayroll.performance_bonus || 0) +
                                         parseFloat(selectedPayroll.leave_travel_allowance || 0) +
                                         parseFloat(selectedPayroll.other_allowances || 0);
                    
                    // Use gross salary as base, but if it's 0 or less than total earnings, use total earnings
                    const earningsBase = grossSalary > 0 ? grossSalary : (totalEarnings > 0 ? totalEarnings : 1);
                    
                    // Calculate percentages for earnings
                    const calculateEarningRate = (amount) => {
                      const amountValue = parseFloat(amount || 0);
                      if (earningsBase <= 0 || amountValue <= 0) return '0.00';
                      
                      // If amount is greater than gross salary, data is likely corrupted
                      // Check if amount exceeds gross salary significantly (more than 10% over)
                      if (amountValue > grossSalary * 1.1 && grossSalary > 0) {
                        return 'N/A'; // Data appears corrupted
                      }
                      
                      const percentage = (amountValue / earningsBase) * 100;
                      
                      // If percentage is unreasonably high (>100%), it indicates data issue
                      if (percentage > 100) {
                        return 'N/A'; // Data appears corrupted
                      }
                      
                      return percentage.toFixed(2);
                    };
                    
                    // Calculate percentages for deductions (based on basic salary for PF, gross for others)
                    const calculateDeductionRate = (amount, isPf = false) => {
                      const base = isPf ? basicSalary : grossSalary;
                      if (base <= 0) return '0.00';
                      const percentage = (parseFloat(amount || 0) / base) * 100;
                      return percentage > 10000 ? '0.00' : percentage.toFixed(2);
                    };

                    return (
                      <>
                        {/* Gross Earnings Section */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                            <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Gross Earnings</h3>
                            <span className="text-xs font-medium text-gray-600">Gross</span>
                          </div>
                          <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                            <table className="w-full">
                              <thead>
                                <tr style={{ backgroundColor: '#8200db' }}>
                                  <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Rule Name</th>
                                  <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Rate %</th>
                                  <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Basic Salary</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.basic_salary)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.basic_salary || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">House Rent Allowance</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.hra)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.hra || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Standard Allowance</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.standard_allowance)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.standard_allowance || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Performance Bonus</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.performance_bonus)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.performance_bonus || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Leave Travel Allowance</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.leave_travel_allowance)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.leave_travel_allowance || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Fixed Allowance</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateEarningRate(selectedPayroll.other_allowances)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-gray-800">
                                    ₹{parseFloat(selectedPayroll.other_allowances || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="bg-gray-100 font-semibold border-t-2" style={{ borderColor: '#8200db' }}>
                                  <td className="py-2 px-4 text-sm" style={{ color: '#8200db' }}>Gross (Total)</td>
                                  <td className="py-2 px-4 text-right text-sm" style={{ color: '#8200db' }}>100.00%</td>
                                  <td className="py-2 px-4 text-right text-sm" style={{ color: '#8200db' }}>
                                    ₹{grossSalary.toFixed(2)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Deductions Section */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4 pb-2 border-b-2" style={{ borderColor: '#8200db' }}>
                            <h3 className="text-base font-semibold" style={{ color: '#8200db' }}>Deductions</h3>
                            <span className="text-xs font-medium text-gray-600">Deductions</span>
                          </div>
                          <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
                            <table className="w-full">
                              <thead>
                                <tr style={{ backgroundColor: '#8200db' }}>
                                  <th className="text-left py-2 px-4 font-semibold text-white text-xs uppercase">Rule Name</th>
                                  <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Rate %</th>
                                  <th className="text-right py-2 px-4 font-semibold text-white text-xs uppercase">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">PF Employee</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateDeductionRate(selectedPayroll.pf_employee, true)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-red-600">
                                    -₹{parseFloat(selectedPayroll.pf_employee || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">PF Employer</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateDeductionRate(selectedPayroll.pf_employer, true)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-red-600">
                                    -₹{parseFloat(selectedPayroll.pf_employer || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-4 text-sm text-gray-800">Professional Tax</td>
                                  <td className="py-2 px-4 text-right text-xs text-gray-700">{calculateDeductionRate(selectedPayroll.professional_tax)}%</td>
                                  <td className="py-2 px-4 text-right text-sm text-red-600">
                                    -₹{parseFloat(selectedPayroll.professional_tax || 0).toFixed(2)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Net Amount */}
                        <div className="mt-6 pt-4 border-t-2 rounded-lg bg-gradient-to-r from-gray-50 to-white p-4" style={{ borderColor: '#8200db' }}>
                          <table className="w-full">
                            <tbody>
                              <tr className="font-semibold text-base">
                                <td className="py-2 px-4" style={{ color: '#8200db' }}>Net Amount</td>
                                <td className="py-2 px-4 text-right" style={{ color: '#8200db' }}>
                                  {grossSalary > 0 ? ((parseFloat(selectedPayroll.net_salary || 0) / grossSalary) * 100).toFixed(2) : '0.00'}%
                                </td>
                                <td className="py-2 px-4 text-right text-base" style={{ color: '#8200db' }}>
                                  ₹{parseFloat(selectedPayroll.net_salary || 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
        ) : null
      )}

      {/* Warning Employees Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-gray-40 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-2" style={{ borderColor: '#8200db' }}>
            <div className="p-8">
              <div className="flex justify-between items-center mb-6 pb-4 border-b-2" style={{ borderColor: '#8200db' }}>
                <h2 className="text-2xl font-bold" style={{ color: '#8200db' }}>
                  {warningType === 'no_bank_account' 
                    ? 'Employees without Bank Account' 
                    : 'Employees without Manager'}
                </h2>
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setWarningEmployees([]);
                    setWarningType(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
                >
                  ✕
                </button>
              </div>

              {loadingWarning ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4" style={{ borderColor: '#8200db' }}></div>
                  <p className="mt-4 text-gray-600 font-medium">Loading...</p>
                </div>
              ) : warningEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg font-medium">No employees found</p>
                </div>
              ) : (
                <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ backgroundColor: '#8200db' }}>
                          <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Employee ID</th>
                          <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Name</th>
                          <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Department</th>
                          <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Position</th>
                          {warningType === 'no_bank_account' && (
                            <>
                              <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Manager</th>
                              <th className="text-left py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Manager Bank Status</th>
                            </>
                          )}
                          <th className="text-center py-4 px-6 font-bold text-white text-sm uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warningEmployees.map((employee, index) => (
                          <tr key={employee.id} className={`border-b-2 border-gray-100 hover:bg-gray-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-4 px-6 font-semibold text-gray-800">{employee.employee_id}</td>
                            <td className="py-4 px-6 font-semibold text-gray-800">
                              {employee.first_name} {employee.last_name}
                            </td>
                            <td className="py-4 px-6 text-gray-700">{employee.department || 'N/A'}</td>
                            <td className="py-4 px-6 text-gray-700">{employee.position || 'N/A'}</td>
                            {warningType === 'no_bank_account' && (
                              <>
                                <td className="py-4 px-6 text-gray-700">
                                  {employee.manager_first_name && employee.manager_last_name ? (
                                    <span>
                                      {employee.manager_first_name} {employee.manager_last_name}
                                      {employee.manager_employee_id && (
                                        <span className="text-gray-500 text-sm ml-1">
                                          ({employee.manager_employee_id})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">No Manager</span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  {employee.manager_id ? (
                                    employee.manager_has_bank_account ? (
                                      <span className="text-green-600 font-semibold">✓ Has Bank Account</span>
                                    ) : (
                                      <span className="text-red-600 font-semibold">✗ No Bank Account</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleEmployeeClick(employee.id)}
                                className="px-4 py-2 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                style={{ backgroundColor: '#8200db' }}
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
