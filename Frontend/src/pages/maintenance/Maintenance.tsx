import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye } from 'lucide-react';
import { maintenanceApi } from '../../lib/maintenanceApi';
import type { MaintenanceDetail as IMaintenance } from '../../lib/maintenanceApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { MaintenanceStatusBadge } from '../../components/maintenance/MaintenanceStatusBadge';
import { CreateMaintenanceDialog } from '../../components/maintenance/CreateMaintenanceDialog';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../components/ui/toast';

export default function Maintenance() {
  const { user } = useAuthStore();
  const isTenant = user?.role === 'TENANT';
  const isOwner = user?.role === 'OWNER';

  const [requests, setRequests] = useState<IMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await maintenanceApi.getAll();
      setRequests(data);
    } catch (err: any) {
      console.error(err);
      toast.add({ title: 'Error', description: 'Failed to load maintenance requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getEmptyStateMessage = () => {
    if (isTenant) return "You haven't reported any maintenance issues.";
    if (isOwner) return "No maintenance requests for your properties.";
    return "No maintenance requests found.";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Maintenance</h1>
          <p className="text-gray-500">
            {isTenant ? 'Report and track your maintenance requests.' : 'Manage maintenance requests across your properties.'}
          </p>
        </div>
        {isTenant && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Requests</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            {getEmptyStateMessage()}
          </p>
          {isTenant && (
            <Button className="mt-6" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Report Issue
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Unit</th>
                  <th className="px-6 py-4 font-medium">Reported Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-900">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {req.title.length > 30 ? req.title.substring(0, 30) + '...' : req.title}
                    </td>
                    <td className="px-6 py-4">{req.category || '-'}</td>
                    <td className="px-6 py-4">
                      Unit {req.unit?.unitNo} ({req.unit?.property?.name})
                    </td>
                    <td className="px-6 py-4">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <MaintenanceStatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/maintenance/${req.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {requests.map((req) => (
              <div key={req.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{req.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Unit {req.unit?.unitNo} ({req.unit?.property?.name})
                    </p>
                  </div>
                  <MaintenanceStatusBadge status={req.status} />
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  <Link to={`/maintenance/${req.id}`}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isTenant && (
        <CreateMaintenanceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
