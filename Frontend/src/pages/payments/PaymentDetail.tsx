import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Receipt, Building2, User, Calendar } from 'lucide-react';
import { paymentApi } from '../../lib/paymentApi';
import type { PaymentDetail as IPaymentDetail } from '../../lib/paymentApi';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EditPaymentDialog } from '../../components/payments/EditPaymentDialog';
import { PaymentStatusBadge } from '../../components/payments/PaymentStatusBadge';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../components/ui/toast';

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isTenant = user?.role === 'TENANT';

  const [payment, setPayment] = useState<IPaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const paymentId = parseInt(id, 10);
      const data = await paymentApi.getById(paymentId);
      setPayment(data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404 || err.response?.status === 403) {
        toast.add({ title: 'Not found', description: 'Payment not found or access denied.' });
        navigate('/payments');
      } else {
        setError('Unable to load payment details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

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
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="rounded-xl border bg-white p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">{error || 'Payment not found'}</p>
        <Button onClick={loadData} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" className="-ml-4 mb-4 text-gray-500 hover:text-gray-900">
          <Link to="/payments" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Payment #PAY-{payment.id.toString().padStart(4, '0')}
            </h1>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="text-sm text-gray-500">
            Recorded on {new Date(payment.createdAt).toLocaleString()}
          </p>
        </div>
        {!isTenant && (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Payment
          </Button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Payment Information */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Receipt className="mr-2 h-5 w-5 text-gray-400" />
            Payment Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Method</p>
              <p className="text-base font-medium text-gray-900">{formatMethod(payment.method)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Paid Date</p>
              <p className="text-base font-medium text-gray-900">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Tenant & Lease Information */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="mr-2 h-5 w-5 text-gray-400" />
            Tenant Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tenant Name</p>
              <p className="text-base font-medium text-gray-900">{payment.lease?.tenant?.user?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Tenant Email</p>
              <p className="text-base text-gray-900">{payment.lease?.tenant?.user?.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Property & Unit Information */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-gray-400" />
            Property Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Property Name</p>
              <p className="text-base font-medium text-gray-900">{payment.lease?.unit?.property?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Unit Number</p>
              <p className="text-base text-gray-900">Unit {payment.lease?.unit?.unitNo || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Property Address</p>
              <p className="text-sm text-gray-700">{payment.lease?.unit?.property?.address || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Lease Context */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-gray-400" />
            Lease Context
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Lease Status</p>
              <p className="text-base font-medium text-gray-900">{payment.lease?.status || 'Unknown'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="text-sm text-gray-900">{payment.lease?.startDate ? new Date(payment.lease.startDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">End Date</p>
                <p className="text-sm text-gray-900">{payment.lease?.endDate ? new Date(payment.lease.endDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Monthly Rent</p>
              <p className="text-base font-medium text-gray-900">{payment.lease?.rentAmount ? formatCurrency(payment.lease.rentAmount) : 'N/A'}</p>
            </div>
          </div>
        </div>

      </div>

      <EditPaymentDialog
        payment={payment}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
