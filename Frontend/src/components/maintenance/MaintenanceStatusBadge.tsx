import { Badge } from '../ui/badge';
import type { MaintenanceStatus } from '../../lib/maintenanceApi';

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100/80';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <Badge className={`${getStatusColor(status)} border-transparent font-medium`}>
      {formatStatus(status)}
    </Badge>
  );
}
