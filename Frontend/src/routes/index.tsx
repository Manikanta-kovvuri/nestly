import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import DashboardRouter from '../pages/dashboard/DashboardRouter';
import SettingsPlaceholder from '../pages/settings/SettingsPlaceholder';

import Properties from '../pages/properties/Properties';
import PropertyDetail from '../pages/properties/PropertyDetail';
import Tenants from '../pages/tenants/Tenants';
import TenantProfile from '../pages/tenants/TenantProfile';
import Payments from '../pages/payments/Payments';
import PaymentDetail from '../pages/payments/PaymentDetail';
import Maintenance from '../pages/maintenance/Maintenance';
import MaintenanceDetail from '../pages/maintenance/MaintenanceDetail';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── Root redirect ─────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ─── Public routes ─────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ─── Protected routes with Layout ──────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            
            {/* Any authenticated role */}
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/settings" element={<SettingsPlaceholder />} />
            
            {/* Payment & Maintenance available to all roles (but data differs) */}
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/:id" element={<PaymentDetail />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/maintenance/:id" element={<MaintenanceDetail />} />

            {/* Owner/Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route
                path="/units/:id"
                element={<PlaceholderPage title="Unit Detail" description="Unit detail coming soon" />}
              />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenants/:id" element={<TenantProfile />} />
            </Route>

            {/* Tenant only */}
            <Route element={<ProtectedRoute allowedRoles={['TENANT']} />}>
              <Route
                path="/my-home"
                element={<PlaceholderPage title="My Home" description="My Home coming soon" />}
              />
            </Route>

          </Route>
        </Route>

        {/* ─── 404 ────────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
