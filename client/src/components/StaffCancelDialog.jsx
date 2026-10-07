import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { formatPrice } from '../lib/format';
import Modal from './Modal';

export default function StaffCancelDialog({ booking, onClose }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const refundable = booking.source === 'online' && booking.status === 'confirmed';

  const cancel = useMutation({
    mutationFn: () => api.post(`/manage/bookings/${booking._id}/cancel`, { reason }).then((r) => r.data.data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  if (cancel.isSuccess) {
    return (
      <Modal title="Booking cancelled" onClose={onClose}>
        <p className="text-sm text-gray-700">
          {cancel.data.refund.amount > 0
            ? `The customer is being refunded ${formatPrice(cancel.data.refund.amount)} in full.`
            : 'Cancelled. There was no online payment to refund.'}
        </p>
        <button onClick={onClose} className="mt-4 rounded-lg border px-3 py-1.5 text-sm">Close</button>
      </Modal>
    );
  }

  return (
    <Modal title="Cancel booking" onClose={onClose}>
      <p className="text-sm text-gray-700">
        {booking.customerName} · {booking.startTime}–{booking.endTime} · {booking.unitKey}
      </p>
      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
        {refundable
          ? `The customer paid online, so they will be refunded ${formatPrice(booking.amount)} in full.`
          : 'No online payment is attached to this booking, so nothing will be refunded.'}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); cancel.mutate(); }} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Reason (shown to the customer)</span>
          <textarea required minLength={3} maxLength={200} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Ground closed for maintenance" />
        </label>
        {cancel.isError && <p className="text-sm text-red-600">{errorMessage(cancel.error)}</p>}
        <div className="flex gap-2">
          <button disabled={cancel.isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            {cancel.isPending ? 'Cancelling…' : 'Cancel booking'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Back</button>
        </div>
      </form>
    </Modal>
  );
}