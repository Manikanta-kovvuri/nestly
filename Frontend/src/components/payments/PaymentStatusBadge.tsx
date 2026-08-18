import { Badge } from '@/components/ui/badge';
import type { PaymentStatus } from '@/lib/paymentApi';

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const statusStyles: Record<PaymentStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive', className: string }> = {
    PENDING: { variant: 'outline', className: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
    PAID: { variant: 'outline', className: 'text-green-600 border-green-200 bg-green-50' },
    FAILED: { variant: 'destructive', className: '' },
  };

  const { variant, className } = statusStyles[status] || { variant: 'default', className: '' };

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}
