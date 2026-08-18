import { useState } from 'react';
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
import { propertyApi } from '../../lib/propertyApi';
import { toast } from '../ui/toast';

const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name must be 100 characters or less'),
  address: z.string().min(1, 'Address is required').max(255, 'Address must be 255 characters or less'),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPropertyDialog({ open, onOpenChange, onSuccess }: AddPropertyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: { name: '', address: '' },
  });

  const onSubmit = async (data: PropertyFormValues) => {
    try {
      setIsSubmitting(true);
      await propertyApi.create(data);
      toast.add({ title: 'Property created', description: 'Your new property has been added successfully.' });
      reset();
      onSuccess();
    } catch (error) {
      toast.add({
        title: 'Error',
        description: 'Failed to create property. Please try again.',
      });
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
          <DialogTitle>Add Property</DialogTitle>
          <DialogDescription>
            Enter the details of your new property below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" placeholder="e.g. Greenwood Apartments" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="e.g. 123 Main Street" {...register('address')} />
            {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" className="mr-2" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Property'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
