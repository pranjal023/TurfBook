import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STATUS_BADGE, formatDay, formatPrice, localDate } from '../lib/format';
import Field, { inputClass } from '../components/Field';
import Spinner from '../components/Spinner';
import StaffCancelDialog from '../components/StaffCancelDialog';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history', label: 'Past' },
  { id: 'day', label: 'By date' },
];

function WalkInForm({ turf, date }) {
  const queryClient = useQueryClient();
  const [unitKey, setUnitKey] = useState('');
  const [startTime, setStartTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const activeUnit = unitKey || turf.units[0].key;

  const availability = useQuery({
    queryKey: ['availability', turf._id, date],
    queryFn: () => api.get(`/public/turfs/${turf._id}/availability`, { params: { date } }).then((r) => r.data.data),
    refetchInterval: 15_000,
  });


  const freeSlots = (availability.data?.slots ?? []).filter((s) => s.units.find((u) => u.key === activeUnit)?.available);
  const chosen = freeSlots.find((s) => s.startTime === startTime);

  const create = useMutation({
    mutationFn: () =>
      api.post('/manage/bookings', {
        turfId: turf._id, unitKey: activeUnit, date, startTime: chosen.startTime,
        customerName, ...(customerPhone && { customerPhone }),
      }),
    onSuccess: () => { setStartTime(''); setCustomerName(''); setCustomerPhone(''); },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Add walk-in booking: {turf.name}</h2>
      {availability.isError ? (
        <p className="text-sm text-red-600">{errorMessage(availability.error)}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {turf.units.length > 1 && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Area</span>
              <select value={activeUnit} onChange={(e) => { setUnitKey(e.target.value); setStartTime(''); }} className={inputClass}>
                {turf.units.map((u) => <option key={u.key} value={u.key}>{u.name}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Slot</span>
            <select required value={chosen?.startTime ?? ''} onChange={(e) => setStartTime(e.target.value)} className={inputClass}>
              <option value="">{availability.isLoading ? 'Loading…' : freeSlots.length ? 'Choose a slot' : 'No free slots'}</option>
              {freeSlots.map((s) => (
                <option key={s.startTime} value={s.startTime}>
                  {s.startTime}–{s.endTime} · {formatPrice(s.units.find((u) => u.key === activeUnit).price)}
                </option>
              ))}
            </select>
          </label>
          <Field label="Customer name" required minLength={2} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <Field label="Phone (optional)" inputMode="numeric" maxLength={10} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>
      )}
      {create.isError && <p className="text-sm text-red-600">{errorMessage(create.error)}</p>}
      {create.isSuccess && <p className="text-sm text-green-700">Booking added.</p>}
      <button disabled={!chosen || create.isPending}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
        {create.isPending ? 'Saving…' : 'Confirm walk-in'}
      </button>
    </form>
  );
}

const EMPTY = {
  upcoming: 'No upcoming bookings.',
  history: 'No past bookings yet.',
  day: 'No bookings on this day.',
};

export default function BookingsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [turfId, setTurfId] = useState('');
  const [date, setDate] = useState(() => localDate());
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState(null); 

  const turfs = useQuery({
    queryKey: ['my-turfs'],
    queryFn: () => api.get('/turfs').then((r) => r.data.data.turfs),
  });

 
  const bookings = useQuery({
    queryKey: ['staff-bookings', tab, tab === 'day' ? date : page, turfId],
    queryFn: () =>
      api.get('/manage/bookings', {
        params: { ...(tab === 'day' ? { date } : { scope: tab, page }), ...(turfId && { turfId }) },
      }).then((r) => r.data.data),
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === tab ? prev : undefined),
    refetchInterval: 15_000, 
  });

  const selectedTurf = turfs.data?.find((t) => t._id === turfId && t.status === 'active');
  const isPastDate = date < localDate();
  const switchTab = (id) => { setTab(id); setPage(1); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bookings</h1>

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? 'border-green-600 font-medium text-green-800' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {tab === 'day' && (
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        )}
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Turf</span>
          <select value={turfId} onChange={(e) => { setTurfId(e.target.value); setPage(1); }}
            className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="">All turfs</option>
            {turfs.data?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      {bookings.isLoading ? (
        <Spinner />
      ) : bookings.isError ? (
        <p className="text-red-600">{errorMessage(bookings.error)}</p>
      ) : bookings.data.bookings.length === 0 ? (
        <p className="rounded-xl border bg-white py-10 text-center text-gray-500">{EMPTY[tab]}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {['When', 'Turf', 'Area', 'Customer', 'Source', 'Amount', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.data.bookings.map((b) => (
                  <tr key={b._id}>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="block font-medium">{formatDay(b.date)}</span>
                      <span className="text-xs text-gray-500">{b.startTime}–{b.endTime}</span>
                    </td>
                    <td className="px-3 py-2">{b.turfName}</td>
                    <td className="px-3 py-2">{b.unitKey}</td>
                    <td className="px-3 py-2">
                      {b.customerName}
                      {b.customerPhone && <span className="block text-xs text-gray-500">{b.customerPhone}</span>}
                    </td>
                    <td className="px-3 py-2">{b.source === 'walk_in' ? 'Walk-in' : 'Online'}</td>
                    <td className="px-3 py-2">{formatPrice(b.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                      {b.status === 'cancelled' && b.cancelReason && (
                        <span className="mt-1 block max-w-[12rem] text-xs text-gray-500">{b.cancelReason}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {b.canCancel && can('booking:cancel') && (
                        <button onClick={() => setCancelling(b)} className="text-xs text-red-700 underline">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tab !== 'day' && bookings.data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-40">← Prev</button>
              <span className="text-gray-600">Page {bookings.data.page} of {bookings.data.totalPages}</span>
              <button disabled={page >= bookings.data.totalPages} onClick={() => setPage(page + 1)}
                className="rounded-lg border px-3 py-1 disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}

      {tab === 'day' && can('booking:create') &&
        (selectedTurf && !isPastDate ? (
          <WalkInForm key={`${selectedTurf._id}-${date}`} turf={selectedTurf} date={date} />
        ) : (
          <p className="text-sm text-gray-500">
            To add a walk-in booking, pick a single active turf and today or a future date.
          </p>
        ))}

      {cancelling && <StaffCancelDialog booking={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}