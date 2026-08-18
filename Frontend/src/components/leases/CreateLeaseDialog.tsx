import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { leaseApi } from '../../lib/leaseApi';
import { propertyApi } from '../../lib/propertyApi';
import type { Property } from '../../lib/propertyApi';
import { unitApi } from '../../lib/unitApi';
import type { Unit } from '../../lib/unitApi';
import { toast } from '../ui/toast';

const leaseSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmountUI: z.number({ invalid_type_error: 'Rent must be a number' }).positive('Rent must be positive'),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface CreateLeaseDialogProps {
  tenantId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLeaseDialog({ tenantId, open, onOpenChange, onSuccess }: CreateLeaseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingProps, setIsLoadingProps] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      propertyId: '',
      unitId: '',
      startDate: '',
      endDate: '',
      rentAmountUI: undefined,
    },
  });

  const selectedPropertyId = watch('propertyId');

  useEffect(() => {
    if (open) {
      loadProperties();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPropertyId) {
      loadUnits(parseInt(selectedPropertyId, 10));
    } else {
      setUnits([]);
      setValue('unitId', '');
    }
  }, [selectedPropertyId, setValue]);

  const loadProperties = async () => {
    try {
      setIsLoadingProps(true);
      const data = await propertyApi.getAll();
      setProperties(data);
    } catch (err) {
      toast.add({ title: 'Error', description: 'Failed to load properties' });
    } finally {
      setIsLoadingProps(false);
    }
  };

  const loadUnits = async (propertyId: number) => {
    try {
      setIsLoadingUnits(true);
      const data = await unitApi.getAllByProperty(propertyId);
      // Only show VACANT units logically, although we allow any if the backend accepts it.
      // The rules say "Only show units that are logically selectable". So VACANT is best.
      setUnits(data.filter(u => u.status === 'VACANT'));
    } catch (err) {
      toast.add({ title: 'Error', description: 'Failed to load units' });
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const onSubmit = async (data: LeaseFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        tenantId,
        unitId: parseInt(data.unitId, 10),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        rentAmount: Math.round(data.rentAmountUI * 100), // Convert to paise
      };
      
      await leaseApi.create(payload);
      toast.add({ title: 'Lease created', description: 'Lease has been created successfully.' });
      reset();
      onSuccess();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.add({
          title: 'Conflict',
          description: error.response.data?.message || 'Conflict creating lease.',
        });
      } else if (error.response?.status === 400) {
        toast.add({
          title: 'Validation Error',
          description: error.response.data?.message || 'Please check the lease details.',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to create lease. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Lease</DialogTitle>
          <DialogDescription>
            Assign this tenant to a property unit and set the lease terms.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <Controller
                name="propertyId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="propertyId" disabled={isLoadingProps}>
                      <SelectValue placeholder={isLoadingProps ? "Loading..." : "Select property"} />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.propertyId && <p className="text-sm text-red-500">{errors.propertyId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Unit</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="unitId" disabled={!selectedPropertyId || isLoadingUnits}>
                      <SelectValue placeholder={isLoadingUnits ? "Loading..." : "Select unit"} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.length === 0 ? (
                        <SelectItem value="none" disabled>No vacant units</SelectItem>
                      ) : (
                        units.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>Unit {u.unitNo}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unitId && <p className="text-sm text-red-500">{errors.unitId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentAmountUI">Rent Amount (₹)</Label>
            <Input 
              id="rentAmountUI" 
              type="number" 
              step="1"
              placeholder="e.g. 15000"
              {...register('rentAmountUI', { valueAsNumber: true })} 
            />
            <p className="text-xs text-slate-500">Enter the monthly rent in whole Rupees.</p>
            {errors.rentAmountUI && <p className="text-sm text-red-500">{errors.rentAmountUI.message}</p>}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Lease'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
