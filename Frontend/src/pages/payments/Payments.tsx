import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../../lib/paymentApi';
import type { Payment } from '../../lib/paymentApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { RecordPaymentDialog } from '../../components/payments/RecordPaymentDialog';
import { PaymentStatusBadge } from '../../components/payments/PaymentStatusBadge';
import { useAuthStore } from '../../store/authStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const { user } = useAuthStore();
  const isTenant = user?.role === 'TENANT';

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paymentApi.getAll();
      // Sort so newest are on top
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(paise / 100);
  };

  const formatMethod = (method: string) => {
    const map: Record<string, string> = {
      'CASH': 'Cash',
      'BANK_TRANSFER': 'Bank Transfer',
      'UPI': 'UPI',
      'CARD': 'Card',
      'OTHER': 'Other'
    };
    return map[method] || method;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          {!isTenant && <Skeleton className="h-10 w-32" />}
        </div>
        <div className="rounded-md border p-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={loadPayments} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500">
            Track rent payments and payment history.
          </p>
        </div>
        {!isTenant && (
          <Button onClick={() => setRecordDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    {isTenant ? (
                      <p className="text-sm text-gray-500">No payment history yet.</p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">No payments recorded yet.</p>
                        <p className="text-sm text-gray-500">Record a rent payment to start building payment history.</p>
                        <Button variant="outline" size="sm" onClick={() => setRecordDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Record Payment
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-sm text-gray-500">
                    #PAY-{payment.id.toString().padStart(4, '0')}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{formatMethod(payment.method)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Link to={`/payments/${payment.id}`}>View Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        onSuccess={loadPayments}
      />
    </div>
  );
}
