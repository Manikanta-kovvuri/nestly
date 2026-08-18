import { useState } from 'react';
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
import { unitApi } from '../../lib/unitApi';
import { toast } from '../ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const unitSchema = z.object({
  unitNo: z.coerce.number().int().min(1, 'Unit number is required (must be a number)'),
  floor: z.string().min(1, 'Floor is required').max(50, 'Floor must be 50 characters or less'),
  status: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE'] as const),
});

type UnitFormValues = z.infer<typeof unitSchema>;

interface AddUnitDialogProps {
  propertyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddUnitDialog({ propertyId, open, onOpenChange, onSuccess }: AddUnitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { unitNo: '' as any, floor: '', status: 'VACANT' },
  });

  const onSubmit = async (data: UnitFormValues) => {
    try {
      setIsSubmitting(true);
      await unitApi.create(propertyId, data);
      toast.add({ title: 'Unit added', description: 'The new unit has been successfully added.' });
      reset();
      onSuccess();
    } catch (error: any) {
      // Handle 409 Conflict gracefully
      if (error.response?.status === 409) {
        toast.add({
          title: 'Conflict',
          description: 'A unit with this number already exists in this property.',
        });
      } else {
        toast.add({
          title: 'Error',
          description: 'Failed to add unit. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => {
      if (!val) reset();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
          <DialogDescription>
            Enter the details for this new unit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="unitNo">Unit Number</Label>
            <Input id="unitNo" type="number" placeholder="e.g. 101" {...register('unitNo')} />
            {errors.unitNo && <p className="text-sm text-red-500">{errors.unitNo.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor">Floor</Label>
            <Input id="floor" placeholder="e.g. 1st Floor" {...register('floor')} />
            {errors.floor && <p className="text-sm text-red-500">{errors.floor.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VACANT">Vacant</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
