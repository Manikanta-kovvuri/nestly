import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function DashboardPlaceholder() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Nestly</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            You are logged in as <span className="font-semibold text-primary">{user?.name}</span> ({user?.role}).
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Dashboard metrics and components will be implemented in the next milestone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
