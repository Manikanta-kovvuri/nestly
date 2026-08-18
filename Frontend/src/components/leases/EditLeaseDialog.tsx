import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { leaseApi } from '../../lib/leaseApi';
import type { Lease } from '../../lib/leaseApi';
import { toast } from '../ui/toast';

const leaseUpdateSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmountUI: z.number({ invalid_type_error: 'Rent must be a number' }).positive('Rent must be positive'),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type LeaseUpdateFormData = z.infer<typeof leaseUpdateSchema>;

interface EditLeaseDialogProps {
  lease: Lease | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditLeaseDialog({ lease, open, onOpenChange, onSuccess }: EditLeaseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaseUpdateFormData>({
    resolver: zodResolver(leaseUpdateSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      rentAmountUI: undefined,
    },
  });

  useEffect(() => {
    if (lease && open) {
      // Backend returns full ISO string or Date string. We only need YYYY-MM-DD for <input type="date">
      const start = new Date(lease.startDate).toISOString().split('T')[0];
      const end = new Date(lease.endDate).toISOString().split('T')[0];
      reset({
        startDate: start,
        endDate: end,
        rentAmountUI: lease.rentAmount / 100, // Convert from paise
      });
    }
  }, [lease, open, reset]);

  const onSubmit = async (data: LeaseUpdateFormData) => {
    if (!lease) return;
    try {
      setIsSubmitting(true);
      const payload = {
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        rentAmount: Math.round(data.rentAmountUI * 100), // Convert to paise
      };
      
      await leaseApi.update(lease.id, payload);
      toast.add({ title: 'Lease updated', description: 'Lease details have been saved.' });
      onSuccess();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.add({
          title: 'Validation Error',
          description: error.response.data?.message || 'Please check the lease details.',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to update lease. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Lease</DialogTitle>
          <DialogDescription>
            Update the terms for this lease.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input id="edit-startDate" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input id="edit-endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-rentAmountUI">Rent Amount (₹)</Label>
            <Input 
              id="edit-rentAmountUI" 
              type="number" 
              step="1"
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
