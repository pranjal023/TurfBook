import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STATUS_BADGE, formatDay, formatPrice, label, localDate } from '../lib/format';
import Spinner from '../components/Spinner';

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const today = localDate();

  const turfs = useQuery({
    queryKey: ['my-turfs'],
    queryFn: () => api.get('/turfs').then((r) => r.data.data.turfs),
    enabled: can('turf:read'),
  });

  const todays = useQuery({
    queryKey: ['staff-bookings', 'overview-today', today],
    queryFn: () => api.get('/manage/bookings', { params: { date: today } }).then((r) => r.data.data),
    enabled: can('booking:read'),
    refetchInterval: 15_000,
  });


  const upcoming = useQuery({
    queryKey: ['staff-bookings', 'overview-upcoming'],
    queryFn: () => api.get('/manage/bookings', { params: { scope: 'upcoming', limit: 6 } }).then((r) => r.data.data),
    enabled: can('booking:read'),
    refetchInterval: 15_000,
  });

  const loading =
    (turfs.isLoading && can('turf:read')) || (can('booking:read') && (todays.isLoading || upcoming.isLoading));
  if (loading) return <Spinner />;

  // ---- derived numbers, computed on each render ----
  const paidToday = (todays.data?.bookings ?? []).filter((b) => ['confirmed', 'completed'].includes(b.status));
  const revenue = paidToday.reduce((sum, b) => sum + b.amount, 0);
  const online = paidToday.filter((b) => b.source === 'online').length;
  const walkIn = paidToday.length - online;
  const activeTurfs = (turfs.data ?? []).filter((t) => t.status === 'active').length;
  const hasNoTurfs = can('turf:read') && turfs.data?.length === 0;
  const next = upcoming.data?.bookings ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {label(user.role)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {can('turf:write') && (
            <Link to="/dashboard/turfs/new" className="rounded-lg bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700">
              + Add turf
            </Link>
          )}
          {can('booking:read') && (
            <Link to="/dashboard/bookings" className="rounded-lg border bg-white px-3 py-2 hover:bg-gray-50">
              {can('booking:create') ? 'Bookings & walk-ins' : 'Bookings'}
            </Link>
          )}
          <Link to="/" className="rounded-lg border bg-white px-3 py-2 hover:bg-gray-50">View public site</Link>
        </div>
      </div>

      {hasNoTurfs && (
        <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-900">Add your first turf</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-green-800">
            Create a listing with photos, pricing and opening hours. Customers can then find it and book slots.
          </p>
          {can('turf:write') && (
            <Link to="/dashboard/turfs/new" className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Create a turf
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can('turf:read') && (
          <StatCard title="Active turfs" value={activeTurfs} hint={`${turfs.data?.length ?? 0} total`} />
        )}
        {can('booking:read') && (
          <>
            <StatCard title="Bookings today" value={paidToday.length} hint={`${online} online · ${walkIn} walk-in`} />
            <StatCard title="Revenue today" value={formatPrice(revenue)} hint="Confirmed bookings" />
            <StatCard title="Upcoming" value={upcoming.data?.total ?? 0} hint="All dates, still to be played" />
          </>
        )}
      </div>

      {can('booking:read') && (
        <section className="rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">Upcoming bookings</h2>
            <Link to="/dashboard/bookings" className="text-sm text-green-700 underline">See all</Link>
          </div>
          {next.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No upcoming bookings.</p>
          ) : (
            <ul className="divide-y">
              {next.map((b) => (
                <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {b.date === today ? 'Today' : formatDay(b.date)} · {b.startTime}–{b.endTime} · {b.turfName}
                    </p>
                    <p className="text-gray-500">{b.customerName} · {b.unitKey}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">{formatPrice(b.amount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}