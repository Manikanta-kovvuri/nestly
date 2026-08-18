import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { propertyApi } from '../../lib/propertyApi';
import type { Property } from '../../lib/propertyApi';
import { PropertyCard } from '../../components/dashboard/PropertyCard';
import { PropertyGrid } from '../../components/dashboard/PropertyGrid';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { AddPropertyDialog } from '../../components/properties/AddPropertyDialog';
import { Link } from 'react-router-dom';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyApi.getAll();
      setProperties(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load properties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

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
        <PropertyGrid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </PropertyGrid>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={loadProperties} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Properties</h1>
          <p className="mt-1 text-gray-500">Manage your rental properties and units.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-lg font-medium text-gray-900">No properties yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Add your first property to start managing your portfolio.
          </p>
          <Button className="mt-6" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
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

      <AddPropertyDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
        onSuccess={() => {
          setAddDialogOpen(false);
          loadProperties();
        }} 
      />
    </div>
  );
}
