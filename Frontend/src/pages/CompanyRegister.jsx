import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CompanyRegister = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    taxId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyExists, setCompanyExists] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkCompanyExists();
  }, []);

  const checkCompanyExists = async () => {
    try {
      const response = await api.get('/company/check');
      if (response.data.registered) {
        setCompanyExists(true);
      }
    } catch (error) {
      // If API doesn't exist or error, continue with registration
      console.error('Failed to check company:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/company/register', formData);
      toast.success('Company registered successfully! Now you can register users.');
      navigate('/register');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to register company');
    } finally {
      setLoading(false);
    }
  };

  if (companyExists) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b-2 border-gray-200 text-center">
              <h1 className="text-2xl font-bold mb-4" style={{ color: '#8200db' }}>Company Already Registered</h1>
              <p className="text-gray-600 mb-6 text-sm">
                Company information has already been set up. You can now register users.
              </p>
              <Link
                to="/register"
                className="inline-block text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: '#8200db' }}
              >
                Go to User Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b-2 border-gray-200">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#8200db' }}>Company Registration</h1>
              <p className="text-sm text-gray-600">Register your company first</p>
            </div>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="companyName" className="block text-xs font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors resize-none"
                  placeholder="Enter company address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors"
                    placeholder="company@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="taxId" className="block text-xs font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  id="taxId"
                  name="taxId"
                  type="text"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors"
                  placeholder="Tax ID / GST Number"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8200db' }}
              >
                {loading ? 'Registering...' : 'Register Company'}
              </button>

              <div className="text-center text-sm text-gray-600">
                Already registered?{' '}
                <Link to="/register" className="hover:underline font-medium" style={{ color: '#8200db' }}>
                  Go to User Registration
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyRegister;

