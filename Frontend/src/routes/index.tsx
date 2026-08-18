import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import DashboardRouter from '../pages/dashboard/DashboardRouter';
import SettingsPlaceholder from '../pages/settings/SettingsPlaceholder';

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
            <Route
              path="/payments"
              element={<PlaceholderPage title="Payments" description="Payments coming soon" />}
            />
            <Route
              path="/maintenance"
              element={<PlaceholderPage title="Maintenance" description="Maintenance coming soon" />}
            />
            <Route
              path="/maintenance/:id"
              element={<PlaceholderPage title="Maintenance Detail" description="Maintenance Detail coming soon" />}
            />

            {/* Owner/Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
              <Route
                path="/properties"
                element={<PlaceholderPage title="Properties" description="Properties coming soon" />}
              />
              <Route
                path="/properties/:id"
                element={<PlaceholderPage title="Property Detail" description="Property detail coming soon" />}
              />
              <Route
                path="/units/:id"
                element={<PlaceholderPage title="Unit Detail" description="Unit detail coming soon" />}
              />
              <Route
                path="/tenants"
                element={<PlaceholderPage title="Tenants" description="Tenants coming soon" />}
              />
              <Route
                path="/tenants/:id"
                element={<PlaceholderPage title="Tenant Profile" description="Tenant profile coming soon" />}
              />
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
