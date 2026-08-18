import { useAuthStore } from '../../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';

export default function SettingsPlaceholder() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input disabled value={user?.name || ''} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input disabled value={user?.email || ''} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input disabled value={user?.role || ''} />
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Profile editing will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
