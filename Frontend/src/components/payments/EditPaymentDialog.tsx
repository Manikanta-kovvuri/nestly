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
import type { Payment } from '../../lib/paymentApi';
import { toast } from '../ui/toast';

const updatePaymentSchema = z.object({
  amountUI: z.number({ invalid_type_error: 'Amount must be a number' }).positive('Amount must be positive').optional(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'PAID', 'FAILED']).optional(),
});

type UpdatePaymentFormData = z.infer<typeof updatePaymentSchema>;

interface EditPaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPaymentDialog({ payment, open, onOpenChange, onSuccess }: EditPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UpdatePaymentFormData>({
    resolver: zodResolver(updatePaymentSchema),
    defaultValues: {
      amountUI: undefined,
      method: undefined,
      status: undefined,
    },
  });

  useEffect(() => {
    if (payment && open) {
      reset({
        amountUI: payment.amount / 100,
        method: payment.method,
        status: payment.status,
      });
    }
  }, [payment, open, reset]);

  const onSubmit = async (data: UpdatePaymentFormData) => {
    if (!payment) return;
    try {
      setIsSubmitting(true);
      const payload: any = {};
      
      if (data.amountUI) {
        payload.amount = Math.round(data.amountUI * 100);
      }
      if (data.method) {
        payload.method = data.method;
      }
      if (data.status) {
        payload.status = data.status;
      }
      
      await paymentApi.update(payment.id, payload);
      toast.add({ title: 'Payment updated', description: 'Payment details have been saved.' });
      onSuccess();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.add({
          title: 'Validation Error',
          description: 'Please check the payment details and try again.',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to update payment. Please try again.',
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
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update the recorded payment details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amountUI">Amount (₹)</Label>
            <Input 
              id="edit-amountUI" 
              type="number" 
              step="1"
              {...register('amountUI', { valueAsNumber: true })} 
            />
            {errors.amountUI && <p className="text-sm text-red-500">{errors.amountUI.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-method">Payment Method</Label>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="edit-method">
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

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
