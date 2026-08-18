import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, MoreHorizontal } from 'lucide-react';
import { propertyApi } from '../../lib/propertyApi';
import type { Property } from '../../lib/propertyApi';
import { unitApi } from '../../lib/unitApi';
import type { Unit } from '../../lib/unitApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { UnitStatusBadge } from '../../components/units/UnitStatusBadge';
import { AddUnitDialog } from '../../components/units/AddUnitDialog';
import { EditUnitDialog } from '../../components/units/EditUnitDialog';
import { EditPropertyDialog } from '../../components/properties/EditPropertyDialog';
import { DeleteConfirmDialog } from '../../components/ui/DeleteConfirmDialog';
import { toast } from '../../components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const propertyId = id ? parseInt(id, 10) : 0;

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [isDeletingProperty, setIsDeletingProperty] = useState(false);

  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [deleteUnitOpen, setDeleteUnitOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError(null);
      const [propData, unitsData] = await Promise.all([
        propertyApi.getOne(propertyId),
        unitApi.getAllByProperty(propertyId),
      ]);
      setProperty(propData);
      setUnits(unitsData);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("You don't have permission to access this property.");
      } else if (err.response?.status === 404) {
        setError('Property not found.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteProperty = async () => {
    try {
      setIsDeletingProperty(true);
      await propertyApi.delete(propertyId);
      toast.add({ title: 'Property deleted', description: 'The property has been successfully removed.' });
      navigate('/properties');
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.add({
          title: 'Conflict',
          description: 'Unable to delete this property because it still contains dependent records (units).',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to delete property. Please try again.',
        });
      }
      setDeletePropertyOpen(false);
    } finally {
      setIsDeletingProperty(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    try {
      setIsDeletingUnit(true);
      await unitApi.delete(unitToDelete.id);
      toast.add({ title: 'Unit deleted', description: 'The unit has been successfully removed.' });
      loadData();
      setDeleteUnitOpen(false);
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.add({
          title: 'Conflict',
          description: 'Unable to delete this unit because it still contains dependent records (leases).',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to delete unit. Please try again.',
        });
      }
      setDeleteUnitOpen(false);
    } finally {
      setIsDeletingUnit(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="pt-8">
          <Skeleton className="mb-4 h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error || 'Property not found.'}</p>
        <Link to="/properties">
          <Button variant="outline">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div>
        <Link to="/properties" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Properties
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{property.name}</h1>
          <p className="mt-1 text-gray-500">{property.address}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setEditPropertyOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeletePropertyOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Units Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">Units</h2>
          <Button onClick={() => setAddUnitOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </Button>
        </div>

        {units.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-lg font-medium text-gray-900">No units yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Add a unit to start managing occupancy for this property.
            </p>
            <Button className="mt-6" onClick={() => setAddUnitOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit No</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.unitNo}</TableCell>
                    <TableCell>{unit.floor}</TableCell>
                    <TableCell>
                      <UnitStatusBadge status={unit.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUnit(unit);
                            setEditUnitOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              setUnitToDelete(unit);
                              setDeleteUnitOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EditPropertyDialog
        property={property}
        open={editPropertyOpen}
        onOpenChange={setEditPropertyOpen}
        onSuccess={() => {
          setEditPropertyOpen(false);
          loadData();
        }}
      />
      
      <DeleteConfirmDialog
        open={deletePropertyOpen}
        onOpenChange={setDeletePropertyOpen}
        onConfirm={handleDeleteProperty}
        title="Delete this property?"
        description="This action cannot be completed if the property still contains dependent units or records."
        isDeleting={isDeletingProperty}
      />

      <AddUnitDialog
        propertyId={propertyId}
        open={addUnitOpen}
        onOpenChange={setAddUnitOpen}
        onSuccess={() => {
          setAddUnitOpen(false);
          loadData();
        }}
      />

      <EditUnitDialog
        unit={selectedUnit}
        open={editUnitOpen}
        onOpenChange={setEditUnitOpen}
        onSuccess={() => {
          setEditUnitOpen(false);
          loadData();
        }}
      />

      <DeleteConfirmDialog
        open={deleteUnitOpen}
        onOpenChange={setDeleteUnitOpen}
        onConfirm={handleDeleteUnit}
        title="Delete this unit?"
        description="This action cannot be completed if the unit still contains dependent records like leases."
        isDeleting={isDeletingUnit}
      />
    </div>
  );
}
