import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatPrice, label, localDate } from '../lib/format';
import Spinner from '../components/Spinner';
import HoldPanel from '../components/HoldPanel';

export default function TurfDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

 
  const [date, setDate] = useState(() => localDate());
  const [unitKey, setUnitKey] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [hold, setHold] = useState(null);

  
  const turfQuery = useQuery({
    queryKey: ['turf', id],
    queryFn: () => api.get(`/public/turfs/${id}`).then((r) => r.data.data.turf),
  });
  const turf = turfQuery.data;

  
  const availability = useQuery({
    queryKey: ['availability', id, date],
    queryFn: () =>
      api.get(`/public/turfs/${id}/availability`, { params: { date } }).then((r) => r.data.data),
    enabled: Boolean(turf && date),
    staleTime: 5_000,
    refetchInterval: 15_000, 
  });

  const holdMutation = useMutation({
    mutationFn: (body) => api.post('/bookings', body).then((r) => r.data.data),
    onSuccess: (data) => { setHold(data); setStartTime(null); },
 
        onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); 
    },
  });

  if (turfQuery.isLoading) return <Spinner />;
  if (turfQuery.isError) return <p className="text-red-600">{errorMessage(turfQuery.error)}</p>;

  
  const activeKey = unitKey ?? turf.units[0].key;
  const rows = (availability.data?.slots ?? []).map((s) => ({
    ...s,
    unit: s.units.find((u) => u.key === activeKey),
  }));
 
  const chosen = rows.find((r) => r.startTime === startTime && r.unit?.available);

  const isStaff = user && user.role !== 'customer';

  const onHold = () => {
    if (!user) return navigate('/login', { state: { from: location } });
    holdMutation.mutate({ turfId: id, unitKey: activeKey, date, startTime: chosen.startTime });
  };

  const images = turf.images ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* LEFT: information */}
      <div className="space-y-4 lg:col-span-2">
        {images.length > 0 ? (
          <div className="space-y-2">
            <img src={images[imageIndex].url} alt={turf.name} className="h-64 w-full rounded-xl object-cover" />
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <img key={img._id} src={img.url} alt="" onClick={() => setImageIndex(i)}
                    className={`h-14 w-20 shrink-0 cursor-pointer rounded-lg object-cover ${i === imageIndex ? 'ring-2 ring-green-600' : 'opacity-70'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl bg-green-50 text-6xl">⚽</div>
        )}

        <div>
          <h1 className="text-2xl font-bold">{turf.name}</h1>
          <p className="text-sm text-gray-500">by {turf.business.name}</p>
          <p className="mt-1 text-sm text-gray-600">
            {[turf.address.line1, turf.address.area, turf.address.city, turf.address.pincode].filter(Boolean).join(', ')}
          </p>
        </div>

        {turf.description && <p className="text-sm text-gray-700">{turf.description}</p>}

        <div className="flex flex-wrap gap-1">
          {turf.sports.map((s) => (
            <span key={s} className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800">{label(s)}</span>
          ))}
        </div>
        {turf.facilities.length > 0 && (
          <p className="text-sm text-gray-600"><b>Facilities:</b> {turf.facilities.map(label).join(' · ')}</p>
        )}
        <p className="text-sm text-gray-600">
          <b>Open:</b> {turf.openTime} – {turf.closeTime} · {turf.slotDurationMinutes}-minute slots
        </p>
      </div>

      {/* RIGHT: booking */}
      <div className="space-y-4 lg:col-span-3">
        <div className="space-y-4 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Book a slot</h2>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Date</span>
            <input type="date" value={date} min={localDate()} max={localDate(60)}
              onChange={(e) => { setDate(e.target.value); setStartTime(null); }}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2" />
          </label>

          {turf.units.length > 1 && (
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Choose area</p>
              <div className="flex flex-wrap gap-2">
                {turf.units.map((u) => (
                  <button key={u.key} onClick={() => { setUnitKey(u.key); setStartTime(null); }}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${u.key === activeKey ? 'border-green-600 bg-green-50 font-medium text-green-800' : 'hover:bg-gray-50'}`}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availability.isLoading ? (
            <Spinner />
          ) : availability.isError ? (
            <p className="text-sm text-red-600">{errorMessage(availability.error)}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rows.map((r) => {
                const free = r.unit.available;
                const selected = chosen?.startTime === r.startTime;
                return (
                  <button key={r.startTime} disabled={!free} onClick={() => setStartTime(r.startTime)}
                    className={`rounded-lg border px-2 py-2 text-left text-sm transition
                      ${selected ? 'border-green-600 bg-green-600 text-white'
                        : free ? 'hover:border-green-600 hover:bg-green-50'
                        : 'cursor-not-allowed bg-gray-100 text-gray-400 line-through'}`}>
                    <div className="font-medium">{r.startTime} – {r.endTime}</div>
                    <div className={`text-xs ${selected ? 'text-green-100' : 'text-gray-500'}`}>{formatPrice(r.unit.price)}</div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <button onClick={onHold} disabled={!chosen || holdMutation.isPending || isStaff}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {holdMutation.isPending ? 'Holding…'
                : !user ? 'Log in to hold this slot'
                : chosen ? `Hold ${chosen.startTime} · ${formatPrice(chosen.unit.price)}`
                : 'Select a slot'}
            </button>
            {isStaff && <span className="text-sm text-gray-500">Business accounts book walk-ins from the dashboard.</span>}
          </div>
          {holdMutation.isError && <p className="text-sm text-red-600">{errorMessage(holdMutation.error)}</p>}
        </div>

        {/* key={booking id}: a NEW hold gets a fresh panel with a fresh countdown */}
        {hold && <HoldPanel key={hold.booking._id} hold={hold} onClose={() => setHold(null)} />}
      </div>
    </div>
  );
}