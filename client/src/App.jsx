import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TurfDetailPage from './pages/TurfDetailPage';
import MyBookingsPage from './pages/MyBookingsPage';
import DashboardPage from './pages/DashboardPage';
import TurfsPage from './pages/TurfsPage';
import NewTurfPage from './pages/NewTurfPage';
import EditTurfPage from './pages/EditTurfPage';
import BookingsPage from './pages/BookingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StaffPage from './pages/StaffPage';
import NotFoundPage from './pages/NotFoundPage';

const STAFF = ['owner', 'manager', 'receptionist', 'ground_staff'];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SearchPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="register-business" element={<RegisterPage business />} />
        <Route path="turfs/:id" element={<TurfDetailPage />} />
        <Route path="my-bookings"
          element={<ProtectedRoute roles={['customer']}><MyBookingsPage /></ProtectedRoute>} />

        <Route path="dashboard" element={<ProtectedRoute roles={STAFF}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="turfs" element={<ProtectedRoute permission="turf:read"><TurfsPage /></ProtectedRoute>} />
          <Route path="turfs/new" element={<ProtectedRoute permission="turf:write"><NewTurfPage /></ProtectedRoute>} />
          <Route path="turfs/:id/edit" element={<ProtectedRoute permission="turf:write"><EditTurfPage /></ProtectedRoute>} />
          <Route path="bookings" element={<ProtectedRoute permission="booking:read"><BookingsPage /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute permission="analytics:view"><AnalyticsPage /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute permission="staff:read"><StaffPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}