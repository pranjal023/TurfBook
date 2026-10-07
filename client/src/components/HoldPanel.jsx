import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useCountdown } from '../hooks/useCountdown';
import { usePayment } from '../hooks/usePayment';
import { formatClock, formatDay, formatPrice } from '../lib/format';

export default function HoldPanel({ hold, onClose }) {
  const { booking, secondsLeft } = hold;
  const queryClient = useQueryClient();
  const left = useCountdown(secondsLeft);
  const pay = usePayment(booking._id);

  const verdict = pay.data;
  const paid = verdict?.bookingStatus === 'confirmed';
  const refunded = verdict?.outcome === 'refunded_late';
  const expired = left === 0 && !paid && !refunded;

  useEffect(() => {
    if (expired) queryClient.invalidateQueries({ queryKey: ['availability'] });
  }, [expired, queryClient]);

  const release = useMutation({
    mutationFn: () => api.delete(`/bookings/${booking._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      onClose();
    },
  });

  const summary = `${booking.turfName} · ${booking.unitKey} · ${formatDay(booking.date)}, ${booking.startTime}–${booking.endTime}`;

  if (paid) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="font-semibold text-green-800">Booking confirmed 🎉</p>
        <p className="mt-1 text-sm text-gray-700">{summary}</p>
        <p className="text-sm text-gray-700">Paid: <b>{formatPrice(booking.amount)}</b></p>
        <div className="mt-3 flex gap-3 text-sm">
          <Link to="/my-bookings" className="text-green-700 underline">View my bookings</Link>
          <button onClick={onClose} className="underline">Book another slot</button>
        </div>
      </div>
    );
  }

  if (refunded) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold">Payment received too late</p>
        <p className="mt-1 text-sm text-gray-700">
          Your hold expired and the slot was booked by someone else. We have started a full refund.
          It usually reaches your account in a few working days.
        </p>
        <button onClick={onClose} className="mt-3 rounded-lg border px-3 py-1.5 text-sm">Pick another slot</button>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${expired ? 'bg-gray-50' : 'border-green-200 bg-green-50'}`}>
      <p className="font-semibold">{expired ? 'Your hold expired' : 'Slot held for you'}</p>
      <p className="mt-1 text-sm text-gray-700">{summary}</p>
      <p className="text-sm text-gray-700">Amount: <b>{formatPrice(booking.amount)}</b></p>

      {expired ? (
        <button onClick={onClose} className="mt-3 rounded-lg border px-3 py-1.5 text-sm">Pick another slot</button>
      ) : (
        <>
          <p className="mt-3 text-sm">
            Complete payment within <b className="tabular-nums text-green-800">{formatClock(left)}</b>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => pay.mutate()} disabled={pay.isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-60">
              {pay.isPending ? 'Processing…' : `Pay ${formatPrice(booking.amount)}`}
            </button>
            <button onClick={() => release.mutate()} disabled={release.isPending || pay.isPending}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-white">
              {release.isPending ? 'Releasing…' : 'Release slot'}
            </button>
            <Link to="/my-bookings" className="px-2 py-1.5 text-sm text-green-700 underline">My bookings</Link>
          </div>
          {pay.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(pay.error)}</p>}
          {verdict && !paid && !refunded && (
  <p className="mt-2 text-sm text-amber-700">
    {verdict.checkoutError
      ? 'Payment was not completed. Your slot is still held, so you can try again.'
      : "We haven't received confirmation from the bank yet. If money was deducted, your booking will confirm automatically within a few minutes. You can check My bookings."}
  </p>
)}
          {release.isError && <p className="mt-2 text-sm text-red-600">{errorMessage(release.error)}</p>}
        </>
      )}
    </div>
  );
}