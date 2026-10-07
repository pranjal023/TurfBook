import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { formatDay, formatPrice } from '../lib/format';
import Modal from './Modal';
import Spinner from './Spinner';


function describeTiers(tiers) {
  return tiers.map((t, i) => {
    const upper = tiers[i - 1]?.minHours;
    const when = i === 0 ? `${t.minHours}+ hours before` : upper ? `${t.minHours}–${upper} hours before` : `under ${t.minHours} hours`;
    const fixed = i === tiers.length - 1 && t.minHours === 0 ? `under ${tiers[i - 1].minHours} hours before` : when;
    return { when: fixed, text: t.percent === 0 ? 'No refund' : `${t.percent}% refund` };
  });
}

export default function CancelBookingDialog({ booking, onClose }) {
  const queryClient = useQueryClient();

  const preview = useQuery({
    queryKey: ['cancel-preview', booking._id],
    queryFn: () => api.get(`/bookings/${booking._id}/cancellation`).then((r) => r.data.data),
    staleTime: 0,
    gcTime: 0, 
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/bookings/${booking._id}/cancel`).then((r) => r.data.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  // After a successful cancel
  if (cancel.isSuccess) {
    const { amount } = cancel.data.refund;
    return (
      <Modal title="Booking cancelled" onClose={onClose}>
        <p className="text-sm text-gray-700">
          {amount > 0
            ? `A refund of ${formatPrice(amount)} has been started. It usually reaches your account in a few working days.`
            : 'This cancellation was too close to the start time for a refund.'}
        </p>
        <button onClick={onClose} className="mt-4 rounded-lg border px-3 py-1.5 text-sm">Close</button>
      </Modal>
    );
  }

  const p = preview.data;
  return (
    <Modal title="Cancel this booking?" onClose={onClose}>
      <p className="text-sm text-gray-700">
        {booking.turfName} · {formatDay(booking.date)}, {booking.startTime}–{booking.endTime}
      </p>

      {preview.isLoading ? <Spinner /> : preview.isError ? (
        <p className="mt-3 text-sm text-red-600">{errorMessage(preview.error)}</p>
      ) : (
        <>
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
            <p>You paid <b>{formatPrice(p.amount)}</b>. Cancelling now refunds:</p>
            <p className="mt-1 text-xl font-bold">
              {formatPrice(p.refundAmount)} <span className="text-sm font-normal text-gray-500">({p.refundPercent}%)</span>
            </p>
          </div>
          <ul className="mt-3 space-y-0.5 text-xs text-gray-500">
            {describeTiers(p.tiers).map((t) => <li key={t.when}>{t.when}: {t.text}</li>)}
          </ul>
        </>
      )}

      {cancel.isError && <p className="mt-3 text-sm text-red-600">{errorMessage(cancel.error)}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={() => cancel.mutate()} disabled={!p || cancel.isPending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
          {cancel.isPending ? 'Cancelling…' : 'Yes, cancel booking'}
        </button>
        <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Keep booking</button>
      </div>
    </Modal>
  );
}