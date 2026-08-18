import { Badge } from '@/components/ui/badge';
import type { LeaseStatus } from '@/lib/leaseApi';

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  const statusStyles: Record<LeaseStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive', className: string }> = {
    PENDING: {
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    },
    ACTIVE: {
      variant: 'default',
      className: 'bg-green-100 text-green-800 hover:bg-green-100',
    },
    EXPIRED: {
      variant: 'outline',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    TERMINATED: {
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
  };

  const style = statusStyles[status] || statusStyles.PENDING;

  return (
    <Badge variant={style.variant} className={style.className}>
      {status}
    </Badge>
  );
}
