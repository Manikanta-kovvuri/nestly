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
import { paymentApi } from '../../lib/paymentApi';
import { propertyApi } from '../../lib/propertyApi';
import type { Property } from '../../lib/propertyApi';
import { unitApi } from '../../lib/unitApi';
import type { Unit } from '../../lib/unitApi';
import { leaseApi } from '../../lib/leaseApi';
import type { Lease } from '../../lib/leaseApi';
import { tenantApi } from '../../lib/tenantApi';
import type { Tenant } from '../../lib/tenantApi';
import { toast } from '../ui/toast';

const paymentSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit is required'),
  amountUI: z.number({ invalid_type_error: 'Amount must be a number' }).positive('Amount must be positive'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER'], { required_error: 'Payment method is required' }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecordPaymentDialog({ open, onOpenChange, onSuccess }: RecordPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [activeLease, setActiveLease] = useState<Lease | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      propertyId: '',
      unitId: '',
      amountUI: undefined,
      method: undefined,
    },
  });

  const selectedPropertyId = watch('propertyId');
  const selectedUnitId = watch('unitId');

  useEffect(() => {
    if (open) {
      loadInitialData();
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

  useEffect(() => {
    if (selectedUnitId && leases.length > 0) {
      const uId = parseInt(selectedUnitId, 10);
      const lease = leases.find(l => l.unitId === uId && l.status === 'ACTIVE');
      setActiveLease(lease || null);
      
      if (lease && tenants.length > 0) {
        const tenant = tenants.find(t => t.id === lease.tenantId);
        setActiveTenant(tenant || null);
        setValue('amountUI', lease.rentAmount / 100);
      } else {
        setActiveTenant(null);
        setValue('amountUI', 0); // Need to set it to 0 or clear so it shows it's invalid
      }
    } else {
      setActiveLease(null);
      setActiveTenant(null);
    }
  }, [selectedUnitId, leases, tenants, setValue]);

  const loadInitialData = async () => {
    try {
      setIsLoadingInitial(true);
      const [propsData, leasesData, tenantsData] = await Promise.all([
        propertyApi.getAll(),
        leaseApi.getAll(),
        tenantApi.getAll()
      ]);
      setProperties(propsData);
      setLeases(leasesData);
      setTenants(tenantsData);
    } catch (err) {
      toast.add({ title: 'Error', description: 'Failed to load property data' });
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const loadUnits = async (propertyId: number) => {
    try {
      setIsLoadingUnits(true);
      const data = await unitApi.getAllByProperty(propertyId);
      // Only show occupied units (since vacant units shouldn't have an active lease for rent payment)
      setUnits(data.filter(u => u.status === 'OCCUPIED'));
    } catch (err) {
      toast.add({ title: 'Error', description: 'Failed to load units' });
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!activeLease) {
      toast.add({ title: 'Error', description: 'Selected unit does not have an active lease.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        leaseId: activeLease.id,
        amount: Math.round(data.amountUI * 100), // Convert to paise
        method: data.method,
      };
      
      await paymentApi.create(payload);
      toast.add({ title: 'Payment recorded', description: 'Payment has been recorded successfully.' });
      reset();
      onSuccess();
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.add({
          title: 'Conflict',
          description: 'This payment could not be recorded because the related lease is invalid.',
        });
      } else if (error.response?.status === 400) {
        toast.add({
          title: 'Validation Error',
          description: 'Please check the payment details and try again.',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to record payment. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setActiveLease(null);
      setActiveTenant(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a manual rent payment for an active lease.
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
                    <SelectTrigger id="propertyId" disabled={isLoadingInitial}>
                      <SelectValue placeholder={isLoadingInitial ? "Loading..." : "Select property"} />
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
                        <SelectItem value="none" disabled>No occupied units</SelectItem>
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

          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm text-gray-500">Tenant</div>
            <div className="font-medium text-gray-900">
              {activeTenant ? activeTenant.user.name : (selectedUnitId ? 'No active lease found' : 'Select a unit first')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountUI">Amount (₹)</Label>
              <Input 
                id="amountUI" 
                type="number" 
                step="1"
                placeholder="e.g. 15000"
                disabled={!activeLease}
                {...register('amountUI', { valueAsNumber: true })} 
              />
              {errors.amountUI && <p className="text-sm text-red-500">{errors.amountUI.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!activeLease}>
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.method && <p className="text-sm text-red-500">{errors.method.message}</p>}
            </div>
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
            <Button type="submit" disabled={isSubmitting || !activeLease}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
