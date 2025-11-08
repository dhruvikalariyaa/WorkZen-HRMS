import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeInfo from './pages/EmployeeInfo';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Payslip from './pages/Payslip';
import Profile from './pages/Profile';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'HR Officer', 'Manager', 'Employee']}>
            <Layout>
              <Employees />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/employee-info"
        element={
          <ProtectedRoute>
            <Layout>
              <EmployeeInfo />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Attendance />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/leaves"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'HR Officer', 'Payroll Officer', 'Manager', 'Employee']}>
            <Layout>
              <Leaves />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/payroll"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Payroll Officer']}>
            <Layout>
              <Payroll />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/payslip/:payrollId"
        element={
          <ProtectedRoute>
            <Layout>
              <Payslip />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'HR Officer', 'Payroll Officer']}>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/profile/:employeeId?"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route path="/" element={<Navigate to="/register" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
