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
import type { MaintenanceStatus } from '../../lib/maintenanceApi';
import { toast } from '../ui/toast';

interface UpdateMaintenanceStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenanceId: number;
  currentStatus: MaintenanceStatus;
  onSuccess: () => void;
}

export function UpdateMaintenanceStatusDialog({
  open,
  onOpenChange,
  maintenanceId,
  currentStatus,
  onSuccess,
}: UpdateMaintenanceStatusDialogProps) {
  const [loading, setLoading] = useState(false);

  // Determine valid next statuses
  const getNextStatuses = (status: MaintenanceStatus): MaintenanceStatus[] => {
    switch (status) {
      case 'OPEN':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['RESOLVED'];
      case 'RESOLVED':
        return ['CLOSED'];
      case 'CLOSED':
        return [];
      default:
        return [];
    }
  };

  const nextStatuses = getNextStatuses(currentStatus);

  const formatStatus = (status: string) => {
    return status.replace('_', ' ');
  };

  const handleUpdate = async (newStatus: MaintenanceStatus) => {
    try {
      setLoading(true);
      await maintenanceApi.updateStatus(maintenanceId, { status: newStatus });
      toast.add({ title: 'Success', description: 'Status updated successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.add({ title: 'Error', description: err.response?.data?.message || 'Failed to update status.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            Current Status: <span className="font-medium text-gray-900">{formatStatus(currentStatus)}</span>
          </p>
          
          {nextStatuses.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Available Transitions:</p>
              <div className="flex flex-col gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    onClick={() => handleUpdate(status)}
                    disabled={loading}
                    className="w-full justify-start"
                  >
                    Change to {formatStatus(status)}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              This maintenance request is closed and cannot be updated further.
            </p>
          )}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
