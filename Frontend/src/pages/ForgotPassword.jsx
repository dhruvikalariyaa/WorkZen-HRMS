import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loginIdOrEmail, setLoginIdOrEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { loginIdOrEmail });
      
      if (response.data.emailSent) {
        setSuccess(response.data.message || 'Password reset email has been sent to your email address. Please check your inbox.');
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        // User not found or email not configured
        setSuccess(response.data.message || 'If the account exists, a password reset email has been sent.');
      }
    } catch (error) {
      // Handle email sending failure - might still have credentials in response
      if (error.response?.data?.password) {
        setError(
          `${error.response.data.error || 'Failed to send email'}. ` +
          `Your new password is: ${error.response.data.password}. ` +
          `Please login and change your password immediately.`
        );
      } else {
        setError(error.response?.data?.error || 'Failed to send reset link. Please try again or contact your HR department.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b-2 border-gray-200">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#8200db' }}>Forgot Password</h1>
              <p className="text-sm text-gray-600">
                Enter your Login ID or Email to receive a password reset link
              </p>
            </div>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="loginIdOrEmail" className="block text-xs font-medium text-gray-700 mb-2">
                  Login ID or Email
                </label>
                <input
                  id="loginIdOrEmail"
                  type="text"
                  value={loginIdOrEmail}
                  onChange={(e) => setLoginIdOrEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-[#8200db] focus:outline-none transition-colors"
                  placeholder="Enter Login ID or Email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8200db' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm hover:underline" style={{ color: '#8200db' }}>
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

