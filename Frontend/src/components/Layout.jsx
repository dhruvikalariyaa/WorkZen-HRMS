import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Home', icon: '🏠', roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] },
    { path: '/employees', label: 'Employees', icon: '👥', roles: ['Admin', 'HR Officer', 'Manager'] },
    { path: '/attendance', label: 'Attendance', icon: '📅', roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] },
    { path: '/leaves', label: 'Leave', icon: '📄', roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] },
    { path: '/reports', label: 'Report', icon: '📊', roles: ['Admin', 'HR Officer', 'Manager', 'Employee'] },
    { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['Admin'] },
  ].filter(item => hasRole(item.roles));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-purple-600">WorkZen</h1>
          <p className="text-sm text-gray-500 mt-1">HRMS</p>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors ${
                location.pathname === item.path ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600' : ''
              }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.employee?.first_name?.[0] || user?.loginId?.[0] || user?.email?.[0] || 'U'}
              </div>
              <span className="text-gray-700">{user?.employee?.first_name || user?.loginId || user?.email || 'User'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

