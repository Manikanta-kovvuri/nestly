import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { maintenanceApi } from '../../lib/maintenanceApi';
import { toast } from '../ui/toast';

interface CreateMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateMaintenanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateMaintenanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.add({ title: 'Error', description: 'Title and Description are required.' });
      return;
    }

    try {
      setLoading(true);
      await maintenanceApi.create(formData);
      toast.add({ title: 'Success', description: 'Maintenance issue reported successfully.' });
      onSuccess();
      onOpenChange(false);
      setFormData({ title: '', category: '', description: '' });
    } catch (err: any) {
      console.error(err);
      toast.add({ title: 'Error', description: err.response?.data?.message || 'Failed to report issue.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Maintenance Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="E.g., Leaking Faucet"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Category (Optional)</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="E.g., Plumbing"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Please describe the issue in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              maxLength={1000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Reporting...' : 'Report Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
