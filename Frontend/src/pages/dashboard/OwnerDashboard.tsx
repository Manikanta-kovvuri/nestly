import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, IndianRupee, PieChart, Plus } from 'lucide-react';
import { dashboardApi } from '../../lib/dashboardApi';
import type { OwnerDashboardData } from '../../lib/dashboardApi';
import { propertyApi } from '../../lib/propertyApi';
import type { Property } from '../../lib/propertyApi';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { PropertyCard } from '../../components/dashboard/PropertyCard';
import { PropertyGrid } from '../../components/dashboard/PropertyGrid';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export default function OwnerDashboard() {
  const [dashboardData, setDashboardData] = useState<OwnerDashboardData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, propsData] = await Promise.all([
        dashboardApi.getOwnerDashboard(),
        propertyApi.getAll(),
      ]);
      setDashboardData(dashData);
      setProperties(propsData);
    } catch {
      setError('Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatCurrency = (amountInPaise: number) => {
    // The backend stores money in integer paise.
    // 1500000 -> 15000
    const amountInRupees = amountInPaise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amountInRupees);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-6 h-8 w-32" />
          <PropertyGrid>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </PropertyGrid>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={loadDashboard} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Overview of your properties and rental operations.</p>
        </div>
        <Link to="/properties">
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardKpiCard
          title="Tenants"
          value={dashboardData.tenants.total}
          icon={<Users className="h-6 w-6" />}
        />
        <DashboardKpiCard
          title="Rent Collected"
          value={formatCurrency(dashboardData.payments.totalCollected)}
          icon={<IndianRupee className="h-6 w-6" />}
        />
        <DashboardKpiCard
          title="Occupancy Rate"
          value={`${dashboardData.occupancyRate}%`}
          icon={<PieChart className="h-6 w-6" />}
        />
      </div>

      {/* Properties Section */}
      <div>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Properties</h2>

        {properties.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-lg font-medium text-gray-900">No properties yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Add your first property to start managing your portfolio.
            </p>
            <Link to="/properties">
              <Button className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </Link>
          </div>
        ) : (
          <PropertyGrid>
            {properties.map((property) => (
              <Link key={property.id} to={`/properties/${property.id}`} className="block focus:outline-none">
                <PropertyCard property={property} />
              </Link>
            ))}
          </PropertyGrid>
        )}
      </div>
    </div>
  );
}
