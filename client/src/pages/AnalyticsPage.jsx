import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errorMessage } from '../api/client';
import { formatPrice, localDate } from '../lib/format';
import Spinner from '../components/Spinner';

const RANGES = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }];
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="h-64">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [turfId, setTurfId] = useState('');

  const turfs = useQuery({
    queryKey: ['my-turfs'],
    queryFn: () => api.get('/turfs').then((r) => r.data.data.turfs),
  });

  
  const analytics = useQuery({
    queryKey: ['analytics', days, turfId],
    queryFn: () =>
      api.get('/manage/analytics', {
        params: { from: localDate(-(days - 1)), to: localDate(), ...(turfId && { turfId }) },
      }).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });

  const d = analytics.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={turfId} onChange={(e) => setTurfId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="">All turfs</option>
            {turfs.data?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <div className="flex overflow-hidden rounded-lg border">
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => setDays(r.days)}
                className={`px-3 py-2 ${days === r.days ? 'bg-green-600 text-white' : 'bg-white hover:bg-gray-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {analytics.isLoading ? <Spinner /> : analytics.isError ? (
        <p className="text-red-600">{errorMessage(analytics.error)}</p>
      ) : d.totals.bookings === 0 && d.totals.cancelled === 0 ? (
        <p className="rounded-xl border bg-white py-12 text-center text-gray-500">No bookings in this period yet.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Revenue" value={formatPrice(d.totals.revenue)} hint={`Last ${d.range.days} days`} />
            <StatCard title="Bookings" value={d.totals.bookings} hint={`${d.totals.online} online · ${d.totals.walkIn} walk-in`} />
            <StatCard title="Avg booking value" value={formatPrice(d.totals.avgBookingValue)} />
            <StatCard title="Cancellation rate" value={`${d.totals.cancellationRate}%`} hint={`${d.totals.cancelled} cancelled`} />
          </div>

          <ChartCard title="Revenue per day">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.daily.map((x) => ({ ...x, rupees: x.revenue / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} fontSize={12} />
                <YAxis tickFormatter={(v) => `₹${v}`} width={64} fontSize={12} />
                <Tooltip labelFormatter={shortDate} formatter={(v) => [formatPrice(v * 100), 'Revenue']} />
                <Line type="monotone" dataKey="rupees" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Busiest hours">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.hourly.map((h) => ({ ...h, label: `${h.hour}:00` }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis allowDecimals={false} width={32} fontSize={12} />
                  <Tooltip formatter={(v) => [v, 'Bookings']} />
                  <Bar dataKey="bookings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <section className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 font-semibold">By turf</h2>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr><th className="py-1 font-medium">Turf</th><th className="py-1 font-medium">Bookings</th><th className="py-1 text-right font-medium">Revenue</th></tr>
                </thead>
                <tbody className="divide-y">
                  {d.turfs.map((t) => (
                    <tr key={t.turfId}>
                      <td className="py-2">{t.name}</td>
                      <td className="py-2">{t.bookings}</td>
                      <td className="py-2 text-right">{formatPrice(t.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}