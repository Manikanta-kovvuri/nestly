import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Play, Square, Building2 } from 'lucide-react';
import { tenantApi } from '../../lib/tenantApi';
import type { Tenant } from '../../lib/tenantApi';
import { leaseApi } from '../../lib/leaseApi';
import type { Lease } from '../../lib/leaseApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EditTenantDialog } from '../../components/tenants/EditTenantDialog';
import { CreateLeaseDialog } from '../../components/leases/CreateLeaseDialog';
import { EditLeaseDialog } from '../../components/leases/EditLeaseDialog';
import { LeaseStatusBadge } from '../../components/leases/LeaseStatusBadge';
import { toast } from '../../components/ui/toast';

export default function TenantProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [createLeaseOpen, setCreateLeaseOpen] = useState(false);
  const [editLeaseOpen, setEditLeaseOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const tenantId = parseInt(id, 10);
      
      const tenantData = await tenantApi.getById(tenantId);
      setTenant(tenantData);

      // Fetch all leases (scoped to owner by backend)
      const allLeases = await leaseApi.getAll();
      const tenantLeasesBasic = allLeases.filter(l => l.tenantId === tenantId);
      
      // Fetch full details for these specific leases to get Unit and Property relations
      // since the list endpoint does not include them.
      const fullLeases = await Promise.all(
        tenantLeasesBasic.map(l => leaseApi.getById(l.id))
      );
      
      // Sort so ACTIVE/PENDING are at the top
      fullLeases.sort((a, b) => {
        if (a.status === 'ACTIVE') return -1;
        if (b.status === 'ACTIVE') return 1;
        if (a.status === 'PENDING') return -1;
        if (b.status === 'PENDING') return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });

      setLeases(fullLeases);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        toast.add({ title: 'Not found', description: 'Tenant not found or access denied.' });
        navigate('/tenants');
      } else {
        setError('Unable to load tenant profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleActivateLease = async (leaseId: number) => {
    try {
      await leaseApi.activate(leaseId);
      toast.add({ title: 'Lease activated', description: 'The lease is now active.' });
      loadData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.add({ title: 'Conflict', description: 'This unit already has an active lease.' });
      } else {
        toast.add({ title: 'Error', description: 'Failed to activate lease.' });
      }
    }
  };

  const handleTerminateLease = async (leaseId: number) => {
    if (!window.confirm("Terminate this lease? The unit will become VACANT.")) return;
    try {
      await leaseApi.terminate(leaseId);
      toast.add({ title: 'Lease terminated', description: 'The lease has been terminated.' });
      loadData();
    } catch (err: any) {
      toast.add({ title: 'Error', description: 'Failed to terminate lease.' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error || 'Tenant not found'}</p>
        <Button onClick={loadData} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" className="-ml-4 mb-4 text-gray-500 hover:text-gray-900">
          <Link to="/tenants" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tenants
          </Link>
        </Button>
      </div>

      {/* Tenant Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{tenant.user.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{tenant.user.email}</p>
          <p className="text-xs text-gray-400 mt-2">Added on {new Date(tenant.createdAt).toLocaleDateString()}</p>
        </div>
        <Button variant="outline" onClick={() => setEditTenantOpen(true)}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit Tenant
        </Button>
      </div>

      {/* Leases Section */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-gray-50/50 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Leases & Rentals</h2>
            <p className="text-sm text-gray-500 mt-1">Manage rental agreements for this tenant.</p>
          </div>
          <Button onClick={() => setCreateLeaseOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            Create Lease
          </Button>
        </div>

        <div className="p-6">
          {leases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No lease associated with this tenant.</p>
              <Button onClick={() => setCreateLeaseOpen(true)} variant="outline" className="mt-4">
                Create Lease
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {leases.map(lease => (
                <div key={lease.id} className="border rounded-lg p-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/30 transition-colors hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <LeaseStatusBadge status={lease.status} />
                      <span className="text-sm font-medium text-gray-900">
                        {lease.unit?.property?.name || 'Unknown Property'} — Unit {lease.unit?.unitNo}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rent</p>
                        <p className="font-semibold text-gray-900">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lease.rentAmount / 100)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Start Date</p>
                        <p className="text-gray-900">{new Date(lease.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">End Date</p>
                        <p className="text-gray-900">{new Date(lease.endDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Created</p>
                        <p className="text-gray-900">{new Date(lease.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 md:flex-col lg:flex-row justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedLease(lease);
                        setEditLeaseOpen(true);
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    
                    {lease.status === 'PENDING' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleActivateLease(lease.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Activate
                      </Button>
                    )}
                    
                    {lease.status === 'ACTIVE' && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleTerminateLease(lease.id)}
                      >
                        <Square className="mr-2 h-4 w-4 fill-current" />
                        Terminate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditTenantDialog 
        tenant={tenant}
        open={editTenantOpen}
        onOpenChange={setEditTenantOpen}
        onSuccess={loadData}
      />

      <CreateLeaseDialog
        tenantId={tenant.id}
        open={createLeaseOpen}
        onOpenChange={setCreateLeaseOpen}
        onSuccess={loadData}
      />

      <EditLeaseDialog
        lease={selectedLease}
        open={editLeaseOpen}
        onOpenChange={setEditLeaseOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
