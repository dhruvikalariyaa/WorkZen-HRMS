import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

const Payslip = () => {
  const { payrollId } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslip();
  }, [payrollId]);

  const fetchPayslip = async () => {
    try {
      const response = await api.get(`/payroll/payslip/${payrollId}`);
      setPayslip(response.data);
    } catch (error) {
      console.error('Failed to fetch payslip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!payslip) {
    return <div className="text-center py-12">Payslip not found</div>;
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8 print:p-4">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-2xl font-bold text-gray-800">Payslip</h1>
          <button
            onClick={handlePrint}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Print Payslip
          </button>
        </div>

        {/* Company Info */}
        <div className="text-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold text-purple-600">WorkZen HRMS</h2>
          <p className="text-gray-600">Salary Statement</p>
        </div>

        {/* Employee Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Employee Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-semibold">
                {payslip.first_name} {payslip.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Employee ID</p>
              <p className="font-semibold">{payslip.employee_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Department</p>
              <p className="font-semibold">{payslip.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Position</p>
              <p className="font-semibold">{payslip.position || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Period</p>
              <p className="font-semibold">
                {months[payslip.month - 1]} {payslip.year}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Earnings</h3>
          <div className="border rounded-lg">
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">Basic Salary</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.basic_salary).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">HRA</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.hra || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Conveyance</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.conveyance || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Medical Allowance</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.medical_allowance || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Other Allowances</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.other_allowances || 0).toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-2 px-4">Gross Salary</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.gross_salary).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Deductions</h3>
          <div className="border rounded-lg">
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">Provident Fund (PF)</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.pf || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Professional Tax</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.professional_tax || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Income Tax</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.income_tax || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Loan Deduction</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.loan_deduction || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Other Deductions</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.other_deductions || 0).toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-2 px-4">Total Deductions</td>
                  <td className="py-2 px-4 text-right">₹{parseFloat(payslip.total_deductions).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Pay */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-800">Net Pay</span>
            <span className="text-2xl font-bold text-purple-600">
              ₹{parseFloat(payslip.net_salary).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payslip;

