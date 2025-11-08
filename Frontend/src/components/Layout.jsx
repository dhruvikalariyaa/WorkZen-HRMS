import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Layout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);

  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] 
    },
    { 
      path: '/employees', 
      label: 'Employees', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.312-.5-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.312.5-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ), 
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] 
    },
    { 
      path: '/attendance', 
      label: 'Attendance', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), 
      roles: ['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee'] 
    },
    { 
      path: '/leaves', 
      label: 'Time Off', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ), 
      roles: ['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee'] 
    },
    { 
      path: '/payroll', 
      label: 'Payroll', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      roles: ['Admin', 'Payroll Officer'] 
    },
    { 
      path: '/reports', 
      label: 'Reports', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ), 
      roles: ['Admin', 'HR Officer', 'Payroll Officer'] 
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ), 
      roles: ['Admin'] 
    },
  ].filter(item => hasRole(item.roles));

  useEffect(() => {
    fetchCompanyLogo();
    
    // Listen for logo update events
    const handleLogoUpdate = () => {
      fetchCompanyLogo();
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const fetchCompanyLogo = async () => {
    try {
      console.log('Fetching company logo...');
      const response = await api.get('/settings/company/logo');
      console.log('Company logo response:', response.data);
      console.log('Logo URL:', response.data?.logo_url);
      
      if (response.data?.logo_url && response.data.logo_url.trim() !== '') {
        console.log('Setting company logo:', response.data.logo_url);
        setCompanyLogo(response.data.logo_url);
      } else {
        console.log('No logo URL found in response or logo_url is empty');
        setCompanyLogo(null);
      }
    } catch (error) {
      console.error('Failed to fetch company logo:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error details:', error.response?.data);
      console.error('Error message:', error.message);
      setCompanyLogo(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          {companyLogo && companyLogo.trim() !== '' ? (
            <Link to="/dashboard" className="flex items-center justify-center cursor-pointer">
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-16 w-auto object-contain max-w-[180px]"
                onError={(e) => {
                  console.error('Failed to load logo image:', companyLogo);
                  console.error('Image error details:', e);
                  setCompanyLogo(null);
                }}
                onLoad={() => {
                  console.log('Logo image loaded successfully:', companyLogo);
                }}
              />
            </Link>
          ) : (
            <Link to="/dashboard" className="text-center cursor-pointer block">
              <h1 className="text-2xl font-bold text-purple-600">WorkZen</h1>
              <p className="text-sm text-gray-500 mt-1">HRMS</p>
            </Link>
          )}
        </div>
        <nav className="flex-1 mt-2 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-purple-50 text-purple-600 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`mr-3 ${location.pathname === item.path ? 'text-purple-600' : 'text-gray-500'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-2 flex justify-between items-center h-[110px]">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="relative profile-menu-container">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                {user?.employee?.first_name?.[0] || user?.loginId?.[0] || user?.email?.[0] || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-s font-medium text-gray-900">
                  {user?.employee?.first_name || user?.loginId || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.employee?.first_name || user?.loginId || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Navigate to user's own profile
                    // If they have employee record, show full employee profile
                    // Otherwise, show user account profile
                    if (user?.employee?.id) {
                      navigate(`/profile/${user.employee.id}`);
                    } else {
                      navigate('/profile');
                    }
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

