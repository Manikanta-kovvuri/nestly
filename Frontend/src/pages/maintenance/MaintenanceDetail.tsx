import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Building2, User, FileText } from 'lucide-react';
import { maintenanceApi } from '../../lib/maintenanceApi';
import type { MaintenanceDetail as IMaintenanceDetail } from '../../lib/maintenanceApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { MaintenanceStatusBadge } from '../../components/maintenance/MaintenanceStatusBadge';
import { UpdateMaintenanceStatusDialog } from '../../components/maintenance/UpdateMaintenanceStatusDialog';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../components/ui/toast';

export default function MaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isTenant = user?.role === 'TENANT';

  const [request, setRequest] = useState<IMaintenanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const reqId = parseInt(id, 10);
      const data = await maintenanceApi.getById(reqId);
      setRequest(data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        toast.add({ title: 'Not found', description: 'Request not found or access denied.' });
        navigate('/maintenance');
      } else {
        setError('Unable to load maintenance details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error || 'Request not found'}</p>
        <Button onClick={loadData} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" className="-ml-4 mb-4 text-gray-500 hover:text-gray-900">
          <Link to="/maintenance" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Maintenance
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {request.title}
            </h1>
            <MaintenanceStatusBadge status={request.status} />
          </div>
          <p className="text-sm text-gray-500">
            Reported on {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
        {!isTenant && (
          <Button onClick={() => setStatusDialogOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Update Status
          </Button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Issue Details */}
        <div className="md:col-span-2 rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="mr-2 h-5 w-5 text-gray-400" />
            Issue Details
          </h2>
          <div>
            <p className="text-sm text-gray-500 mb-1">Category</p>
            <p className="text-base text-gray-900">{request.category || 'Uncategorized'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap border border-gray-100">
              {request.description}
            </div>
          </div>
        </div>

        {/* Reporter Context */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 h-5 w-5 text-gray-400" />
            Reporter Context
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Reported By</p>
              <p className="text-base font-medium text-gray-900">{request.reportedBy?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="text-base text-gray-900">{request.reportedBy?.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Property & Unit Context */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-gray-400" />
            Property Context
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Property</p>
              <p className="text-base font-medium text-gray-900">{request.unit?.property?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Unit Number</p>
              <p className="text-base text-gray-900">Unit {request.unit?.unitNo || 'Unknown'}</p>
            </div>
          </div>
        </div>

      </div>

      {!isTenant && (
        <UpdateMaintenanceStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          maintenanceId={request.id}
          currentStatus={request.status}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
