// src/components/auth/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import DashboardLayout from '../layout/DashboardLayout';

export default function ProtectedRoute({ children }) {
  if (!auth.currentUser) {
    return <Navigate to="/" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}