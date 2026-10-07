import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useCountdown } from '../hooks/useCountdown';
import { usePayment } from '../hooks/usePayment';
import { STATUS_BADGE, formatClock, formatDay, formatPrice } from '../lib/format';
import Spinner from '../components/Spinner';
import CancelBookingDialog from '../components/CancelBookingDialog';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history', label: 'Past bookings' },
];

const REFUND_LABEL = {
  requested: 'being processed',
  pending: 'processing',
  success: 'refunded',
  failed: 'needs attention, support will contact you',
};

function HoldTimer({ secondsLeft }) {
  const left = useCountdown(secondsLeft);
  return <span className="tabular-nums">{formatClock(left)} left</span>;
}

function PayButton({ bookingId }) {
  const pay = usePayment(bookingId);
  return (
    <>
      <button onClick={() => pay.mutate()} disabled={pay.isPending}
        className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-60">
        {pay.isPending ? 'Processing…' : 'Pay now'}
      </button>
      {pay.isError && <span className="text-xs text-red-600">{errorMessage(pay.error)}</span>}
    </>
  );
}

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1); 
  const [cancelling, setCancelling] = useState(null);

  const list = useQuery({
    queryKey: ['my-bookings', tab, tab === 'history' ? page : 1],
    queryFn: () =>
      api.get('/bookings/mine', {
        params: { scope: tab, page: tab === 'history' ? page : 1, limit: tab === 'upcoming' ? 50 : 10 },
      }).then((r) => r.data.data),
    
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === tab ? prev : undefined),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const release = useMutation({
    mutationFn: (id) => api.delete(`/bookings/${id}`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  const switchTab = (id) => { setTab(id); setPage(1); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My bookings</h1>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? 'border-green-600 font-medium text-green-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {list.isLoading ? <Spinner /> : list.isError ? (
        <p className="text-red-600">{errorMessage(list.error)}</p>
      ) : list.data.bookings.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          {tab === 'upcoming' ? (
            <>Nothing coming up. <Link to="/" className="text-green-700 underline">Find a turf</Link></>
          ) : 'No past bookings yet.'}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {list.data.bookings.map((b) => (
              <li key={b._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <Link to={`/turfs/${b.turfId}`} className="font-semibold hover:underline">{b.turfName}</Link>
                  <p className="text-sm text-gray-600">{formatDay(b.date)} · {b.startTime}–{b.endTime} · {b.unitKey}</p>
                  <p className="text-sm text-gray-600">{formatPrice(b.amount)}</p>
                  {b.inProgress && <p className="text-sm font-medium text-green-700">Happening now</p>}
                  {b.status === 'cancelled' && b.cancelledByRole && (
                    <p className="text-sm text-gray-600">
                      {b.cancelledByRole === 'staff'
                        ? `Cancelled by the venue${b.cancelReason ? `: ${b.cancelReason}` : ''}`
                        : 'Cancelled by you'}
                      {b.refundAmount > 0
                        ? ` · Refund ${formatPrice(b.refundAmount)} (${REFUND_LABEL[b.refundStatus] ?? 'processing'})`
                        : b.cancelledByRole === 'customer' ? ' · No refund' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {b.secondsLeft !== undefined && (
                    <span className="text-sm text-amber-700">
                      {/* key restarts the timer whenever the server sends a fresh value */}
                      <HoldTimer key={b.secondsLeft} secondsLeft={b.secondsLeft} />
                    </span>
                  )}
                  {b.status === 'held' && b.secondsLeft !== undefined && (
                    <>
                      <PayButton bookingId={b._id} />
                      <button onClick={() => release.mutate(b._id)} disabled={release.isPending}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">Release</button>
                    </>
                  )}
                  {b.canCancel && (
                    <button onClick={() => setCancelling(b)}
                      className="rounded-lg border px-2 py-1 text-xs text-red-700 hover:bg-red-50">Cancel</button>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                </div>
              </li>
            ))}
          </ul>

          {tab === 'history' && list.data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-40">← Newer</button>
              <span className="text-gray-600">Page {list.data.page} of {list.data.totalPages}</span>
              <button disabled={page >= list.data.totalPages} onClick={() => setPage(page + 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-40">Older →</button>
            </div>
          )}
        </>
      )}

      {cancelling && <CancelBookingDialog booking={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}