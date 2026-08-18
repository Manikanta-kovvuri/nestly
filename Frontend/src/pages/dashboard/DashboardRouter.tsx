import { useAuthStore } from '../../store/authStore';
import OwnerDashboard from './OwnerDashboard';
import DashboardPlaceholder from './DashboardPlaceholder';

export default function DashboardRouter() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'OWNER') {
    return <OwnerDashboard />;
  }

  // Fallback for tenants and admins for now
  return <DashboardPlaceholder />;
}
