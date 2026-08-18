import { Badge } from '../ui/badge';
import type { UnitStatus } from '../../lib/unitApi';

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  if (status === 'VACANT') {
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Vacant</Badge>;
  }
  if (status === 'OCCUPIED') {
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Occupied</Badge>;
  }
  if (status === 'MAINTENANCE') {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Maintenance</Badge>;
  }
  return null;
}
