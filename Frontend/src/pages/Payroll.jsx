import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [showGeneratePayroll, setShowGeneratePayroll] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [generateData, setGenerateData] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchPayrolls();
    fetchEmployees();
  }, [searchTerm, monthFilter, yearFilter]);

  const fetchPayrolls = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (monthFilter) params.month = monthFilter;
      if (yearFilter) params.year = yearFilter;
      
      const response = await api.get('/payroll', { params });
      setPayrolls(response.data);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
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

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/generate', generateData);
      setShowGeneratePayroll(false);
      fetchPayrolls();
      setGenerateData({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate payroll');
    }
  };

  const handleViewPayslip = async (payroll) => {
    try {
      const response = await api.get(`/payroll/payslip/${payroll.id}`);
      setSelectedPayroll(response.data);
      setShowPayslipModal(true);
    } catch (error) {
      // If payslip doesn't exist, generate it first
      try {
        await api.post('/payroll/payslip', { payrollId: payroll.id });
        const response = await api.get(`/payroll/payslip/${payroll.id}`);
        setSelectedPayroll(response.data);
        setShowPayslipModal(true);
      } catch (err) {
        alert('Failed to generate payslip');
      }
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
        <button
          onClick={() => setShowGeneratePayroll(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Generate Payroll
        </button>
      </div>

      {showGeneratePayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Generate Payroll</h2>
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                <select
                  value={generateData.employeeId}
                  onChange={(e) => setGenerateData({ ...generateData, employeeId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_id} - {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
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
                  onClick={() => setShowGeneratePayroll(false)}
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

      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payslip</h2>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Employee Name</p>
                  <p className="font-semibold">{selectedPayroll.first_name} {selectedPayroll.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-semibold">{selectedPayroll.employee_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pay Period</p>
                  <p className="font-semibold">{months[selectedPayroll.month - 1]} {selectedPayroll.year}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Earnings</h3>
                <table className="w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-4 border">Item</th>
                      <th className="text-right py-2 px-4 border">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border">Basic Salary</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.basic_salary || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">House Rent Allowance</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.hra || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Medical Allowance</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.medical_allowance || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Conveyance Allowance</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.conveyance || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Other Allowances</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.other_allowances || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 px-4 border">Total Earnings</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.gross_salary || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Deductions</h3>
                <table className="w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-4 border">Item</th>
                      <th className="text-right py-2 px-4 border">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border">Provident Fund</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.pf || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Professional Tax</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.professional_tax || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Income Tax</td>
                      <td className="py-2 px-4 border text-right">₹0.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Loan Deduction</td>
                      <td className="py-2 px-4 border text-right">₹0.00</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border">Other Deductions</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.other_deductions || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="py-2 px-4 border">Total Deductions</td>
                      <td className="py-2 px-4 border text-right">₹{parseFloat(selectedPayroll.total_deductions || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Net Salary</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{parseFloat(selectedPayroll.net_salary || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Print Payroll
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4 flex space-x-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Months</option>
            {months.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-32"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Month</th>
                <th className="text-left py-3 px-4 font-semibold">Year</th>
                <th className="text-left py-3 px-4 font-semibold">Gross Salary</th>
                <th className="text-left py-3 px-4 font-semibold">Deductions</th>
                <th className="text-left py-3 px-4 font-semibold">Net Salary</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No payroll records found
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{payroll.employee_id}</td>
                    <td className="py-3 px-4">
                      {payroll.first_name} {payroll.last_name}
                    </td>
                    <td className="py-3 px-4">{months[payroll.month - 1]}</td>
                    <td className="py-3 px-4">{payroll.year}</td>
                    <td className="py-3 px-4">₹{parseFloat(payroll.gross_salary).toFixed(2)}</td>
                    <td className="py-3 px-4">₹{parseFloat(payroll.total_deductions).toFixed(2)}</td>
                    <td className="py-3 px-4">₹{parseFloat(payroll.net_salary).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          payroll.status === 'Processed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payroll.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewPayslip(payroll)}
                        className="text-purple-600 hover:underline"
                      >
                        View Payslip
                      </button>
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

export default Payroll;
