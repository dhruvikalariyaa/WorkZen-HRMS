import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      id: 'employees',
      icon: '👥',
      label: 'Employees',
      path: '/employees',
      roles: ['Admin', 'HR Officer', 'Manager']
    },
    {
      id: 'attendance',
      icon: '📅',
      label: 'Attendance',
      path: '/attendance',
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee']
    },
    {
      id: 'leave',
      icon: '📄',
      label: 'Leave',
      path: '/leaves',
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee']
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings',
      path: '/settings',
      roles: ['Admin']
    },
    {
      id: 'reports',
      icon: '📊',
      label: 'Reports',
      path: '/reports',
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee']
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Profile',
      path: '/profile',
      roles: ['Admin', 'HR Officer', 'Manager', 'Employee']
    }
  ];

  const availableCards = cards.filter(card => card.roles.includes(user?.role));

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableCards.map((card) => (
          <div
            key={card.id}
            onClick={() => navigate(card.path)}
            className="bg-white rounded-lg shadow-md p-8 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800">{card.label}</h3>
            </div>
          </div>
        ))}
      </div>

      <p className="text-gray-600 mt-6 text-sm">
        After login, the user will land on this page. This page will display a summary of the system's key features. 
        Each card will represent a specific module, and clicking on it will navigate the user to that module's page.
      </p>
    </div>
  );
};

export default Dashboard;
