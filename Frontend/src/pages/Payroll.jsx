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
  const [payslipTab, setPayslipTab] = useState('workedDays');
  const [workedDays, setWorkedDays] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState(null);
  const [warningEmployees, setWarningEmployees] = useState([]);
  const [loadingWarning, setLoadingWarning] = useState(false);
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
      const response = await api.get(`/payroll/payrun/${payrunId}`);
      setPayrolls(response.data);
      setSelectedPayrun(payrunId);
    } catch (error) {
      console.error('Failed to fetch payrun details:', error);
      toast.error('Failed to load payrun details');
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/payroll/generate', generateData);
      setShowGenerateModal(false);
      toast.success('Payroll generated successfully for all employees');
      if (activeTab === 'payrun') {
        fetchPayruns();
      } else {
        fetchDashboard();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePayrun = async (payrunId) => {
    try {
      await api.put(`/payroll/payrun/${payrunId}/validate`);
      toast.success('Payrun validated successfully');
      fetchPayruns();
      if (selectedPayrun === payrunId) {
        fetchPayrunDetails(payrunId);
      }
    } catch (error) {
      toast.error('Failed to validate payrun');
    }
  };

  const handleViewPayslip = async (payroll) => {
    try {
      const response = await api.get(`/payroll/payslip/${payroll.id}`);
      setSelectedPayroll(response.data);
      
      // Fetch worked days
      try {
        const workedDaysResponse = await api.get(`/payroll/${payroll.id}/worked-days`);
        setWorkedDays(workedDaysResponse.data);
      } catch (error) {
        console.error('Failed to fetch worked days:', error);
      }
      
      setShowPayslipModal(true);
      setPayslipTab('workedDays');
    } catch (error) {
      toast.error('Failed to load payslip');
    }
  };

  const handleCompute = async () => {
    if (!selectedPayroll) return;
    
    // Store the current payroll ID to ensure we stay on the same payroll
    const currentPayrollId = selectedPayroll.id;
    
    try {
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
    }
  };

  const handleValidate = async () => {
    if (!selectedPayroll) return;
    try {
      await api.put(`/payroll/validate/${selectedPayroll.id}`);
      toast.success('Payslip validated successfully');
      const response = await api.get(`/payroll/payslip/${selectedPayroll.id}`);
      setSelectedPayroll(response.data);
    } catch (error) {
      toast.error('Failed to validate payslip');
    }
  };

  const handleNewPayslip = () => {
    setShowPayslipModal(false);
    setSelectedPayroll(null);
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
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('payrun')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'payrun'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Payrun
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Warnings Section */}
              {dashboardData?.warnings && dashboardData.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Warnings</h3>
                  <ul className="space-y-1">
                    {dashboardData.warnings.map((warning, index) => (
                      <li 
                        key={index} 
                        className="text-yellow-700 cursor-pointer hover:text-yellow-900 hover:underline"
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
                <h3 className="font-semibold text-gray-800 mb-4">Recent Payruns</h3>
                <div className="space-y-2">
                  {dashboardData?.payruns && dashboardData.payruns.length > 0 ? (
                    dashboardData.payruns.map((payrun, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setActiveTab('payrun');
                          fetchPayrunDetails(payrun.payrun_id);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">
                              Payrun for {months[payrun.month - 1]} {payrun.year}
                            </p>
                            <p className="text-sm text-gray-600">
                              {payrun.employee_count} Payslips
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Net: ₹{parseFloat(payrun.total_net || 0).toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Employer Cost: ₹{parseFloat(payrun.total_employer_cost || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No payruns found</p>
                  )}
                </div>
              </div>

              {/* Statistics Section */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Employer Cost</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{parseFloat(dashboardData?.statistics?.monthly_employer_cost || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Monthly</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Employee Count</p>
                    <p className="text-2xl font-bold text-green-600">
                      {dashboardData?.statistics?.employee_count || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Monthly</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payrun Tab */}
          {activeTab === 'payrun' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Payrun List</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Payrun
                  </button>
                  {selectedPayrun && (
                    <button
                      onClick={() => handleValidatePayrun(selectedPayrun)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Validate
                    </button>
                  )}
                </div>
              </div>

              {/* Payrun Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-3 px-4 font-semibold">Payrun</th>
                      <th className="text-right py-3 px-4 font-semibold">Employer Cost</th>
                      <th className="text-right py-3 px-4 font-semibold">Gross</th>
                      <th className="text-right py-3 px-4 font-semibold">Net</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payruns.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">
                          No payruns found
                        </td>
                      </tr>
                    ) : (
                      payruns.map((payrun) => (
                        <tr
                          key={payrun.payrun_id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => fetchPayrunDetails(payrun.payrun_id)}
                        >
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${
                              selectedPayrun === payrun.payrun_id ? 'text-purple-600' : ''
                            }`}>
                              {payrun.payrun_id}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            ₹{parseFloat(payrun.total_employer_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ₹{parseFloat(payrun.total_gross || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            ₹{parseFloat(payrun.total_net || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPayrunDetails(payrun.payrun_id);
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
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

              {/* Pay Period Details */}
              {selectedPayrun && payrolls.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Pay Period Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-3 px-4 font-semibold">Pay Period</th>
                          <th className="text-left py-3 px-4 font-semibold">Employees</th>
                          <th className="text-right py-3 px-4 font-semibold">Employer Cost</th>
                          <th className="text-right py-3 px-4 font-semibold">Basic Wage</th>
                          <th className="text-right py-3 px-4 font-semibold">Gross Wage</th>
                          <th className="text-right py-3 px-4 font-semibold">Net Wage</th>
                          <th className="text-center py-3 px-4 font-semibold">Status</th>
                          <th className="text-center py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrolls.map((payroll) => {
                          const totalEmployerCost = parseFloat(payroll.pf_employer || 0) + parseFloat(payroll.gross_salary || 0);
                          return (
                            <tr key={payroll.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {months[payroll.month - 1]} {payroll.year}
                              </td>
                              <td className="py-3 px-4">
                                {payroll.first_name} {payroll.last_name}
                              </td>
                              <td className="py-3 px-4 text-right">
                                ₹{totalEmployerCost.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                ₹{parseFloat(payroll.basic_salary || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                ₹{parseFloat(payroll.gross_salary || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                ₹{parseFloat(payroll.net_salary || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-sm ${
                                    payroll.is_validated
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {payroll.is_validated ? 'Validated' : 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleViewPayslip(payroll)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Payroll</h2>
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                <select
                  value={generateData.month}
                  onChange={(e) => setGenerateData({ ...generateData, month: parseInt(e.target.value) })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <input
                  type="number"
                  value={generateData.year}
                  onChange={(e) => setGenerateData({ ...generateData, year: parseInt(e.target.value) })}
                  required
                  min="2000"
                  max="2100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedPayroll.first_name} {selectedPayroll.last_name}</h2>
                  <p className="text-gray-600">
                    Payrun: {selectedPayroll.payrun_id || `Payrun ${months[selectedPayroll.month - 1]} ${selectedPayroll.year}`}
                  </p>
                  <p className="text-gray-600">
                    Period: {new Date(selectedPayroll.year, selectedPayroll.month - 1, 1).toLocaleDateString()} to{' '}
                    {new Date(selectedPayroll.year, selectedPayroll.month, 0).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 mb-6">
                <button
                  onClick={handleNewPayslip}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  New Payslip
                </button>
                <button
                  onClick={handleCompute}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Compute
                </button>
                <button
                  onClick={handleValidate}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Validate
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Print
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b mb-6">
                <div className="flex">
                  <button
                    onClick={() => setPayslipTab('workedDays')}
                    className={`px-6 py-3 font-medium ${
                      payslipTab === 'workedDays'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Worked Days
                  </button>
                  <button
                    onClick={() => setPayslipTab('salaryComputation')}
                    className={`px-6 py-3 font-medium ${
                      payslipTab === 'salaryComputation'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Salary Computation
                  </button>
                </div>
              </div>

              {/* Worked Days Tab */}
              {payslipTab === 'workedDays' && workedDays && (
                <div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-semibold">Type</th>
                        <th className="text-right py-3 px-4 font-semibold">Days</th>
                        <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">Attendance</td>
                        <td className="py-3 px-4 text-right">
                          {parseFloat(workedDays.attendance_days || 0).toFixed(2)} ({workedDays.working_days_per_week} working days in week)
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{parseFloat(workedDays.attendance_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Paid Time off</td>
                        <td className="py-3 px-4 text-right">
                          {parseFloat(workedDays.paid_time_off_days || 0).toFixed(2)} ({parseFloat(workedDays.paid_time_off_days || 0).toFixed(0)} Paid leaves/Month)
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{parseFloat(workedDays.paid_time_off_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Unpaid Time off</td>
                        <td className="py-3 px-4 text-right">
                          {parseFloat(workedDays.unpaid_time_off_days || 0).toFixed(2)} ({parseFloat(workedDays.unpaid_time_off_days || 0).toFixed(0)} Unpaid leaves)
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          -₹{parseFloat(workedDays.unpaid_time_off_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-3 px-4">Total Payable Days</td>
                        <td className="py-3 px-4 text-right">
                          {parseFloat(workedDays.total_payable_days || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{parseFloat(workedDays.total_payable_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-sm text-gray-600 mt-4">
                    Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.
                  </p>
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
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Gross Earnings</h3>
                            <span className="text-sm text-gray-500">Gross</span>
                          </div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-left py-3 px-4 font-semibold">Rule Name</th>
                                <th className="text-right py-3 px-4 font-semibold">Rate %</th>
                                <th className="text-right py-3 px-4 font-semibold">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="py-3 px-4">Basic Salary</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.basic_salary)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.basic_salary || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">House Rent Allowance</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.hra)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.hra || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">Standard Allowance</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.standard_allowance)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.standard_allowance || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">Performance Bonus</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.performance_bonus)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.performance_bonus || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">Leave Travel Allowance</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.leave_travel_allowance)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.leave_travel_allowance || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">Fixed Allowance</td>
                                <td className="py-3 px-4 text-right">{calculateEarningRate(selectedPayroll.other_allowances)}%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{parseFloat(selectedPayroll.other_allowances || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                                <td className="py-3 px-4">Gross (Total)</td>
                                <td className="py-3 px-4 text-right">100.00%</td>
                                <td className="py-3 px-4 text-right">
                                  ₹{grossSalary.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Deductions Section */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Deductions</h3>
                            <span className="text-sm text-gray-500">Deductions</span>
                          </div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 border-b">
                                <th className="text-left py-3 px-4 font-semibold">Rule Name</th>
                                <th className="text-right py-3 px-4 font-semibold">Rate %</th>
                                <th className="text-right py-3 px-4 font-semibold">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="py-3 px-4">PF Employee</td>
                                <td className="py-3 px-4 text-right">{calculateDeductionRate(selectedPayroll.pf_employee, true)}%</td>
                                <td className="py-3 px-4 text-right text-red-600">
                                  -₹{parseFloat(selectedPayroll.pf_employee || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">PF Employer</td>
                                <td className="py-3 px-4 text-right">{calculateDeductionRate(selectedPayroll.pf_employer, true)}%</td>
                                <td className="py-3 px-4 text-right text-red-600">
                                  -₹{parseFloat(selectedPayroll.pf_employer || 0).toFixed(2)}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="py-3 px-4">Professional Tax</td>
                                <td className="py-3 px-4 text-right">{calculateDeductionRate(selectedPayroll.professional_tax)}%</td>
                                <td className="py-3 px-4 text-right text-red-600">
                                  -₹{parseFloat(selectedPayroll.professional_tax || 0).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Net Amount */}
                        <div className="mt-6 pt-4 border-t-2 border-gray-300">
                          <table className="w-full">
                            <tbody>
                              <tr className="font-semibold text-lg">
                                <td className="py-3 px-4">Net Amount</td>
                                <td className="py-3 px-4 text-right">
                                  {grossSalary > 0 ? ((parseFloat(selectedPayroll.net_salary || 0) / grossSalary) * 100).toFixed(2) : '0.00'}%
                                </td>
                                <td className="py-3 px-4 text-right">
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
      )}

      {/* Warning Employees Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
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
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {loadingWarning ? (
                <div className="text-center py-8">Loading...</div>
              ) : warningEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No employees found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Department</th>
                        <th className="text-left py-3 px-4 font-semibold">Position</th>
                        {warningType === 'no_bank_account' && (
                          <>
                            <th className="text-left py-3 px-4 font-semibold">Manager</th>
                            <th className="text-left py-3 px-4 font-semibold">Manager Bank Status</th>
                          </>
                        )}
                        <th className="text-center py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warningEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{employee.employee_id}</td>
                          <td className="py-3 px-4">
                            {employee.first_name} {employee.last_name}
                          </td>
                          <td className="py-3 px-4">{employee.department || 'N/A'}</td>
                          <td className="py-3 px-4">{employee.position || 'N/A'}</td>
                          {warningType === 'no_bank_account' && (
                            <>
                              <td className="py-3 px-4">
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
                              <td className="py-3 px-4">
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
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleEmployeeClick(employee.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
