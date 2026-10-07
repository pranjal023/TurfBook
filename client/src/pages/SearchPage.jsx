import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { label } from '../lib/format';
import Spinner from '../components/Spinner';
import TurfCard from '../components/TurfCard';

const select = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [geoError, setGeoError] = useState('');

 
  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  
  const meta = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.get('/public/meta').then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  
  const filters = Object.fromEntries(params);
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['turfs', filters],
    queryFn: ({ signal }) =>
      api.get('/public/turfs', { params: filters, signal }).then((r) => r.data.data),
    placeholderData: keepPreviousData, 
  });

  const nearMe = () => {
    setGeoError('');
    navigator.geolocation?.getCurrentPosition(
      (pos) => update({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }),
      () => setGeoError('Could not get your location. Check browser permissions.')
    );
  };

  const page = Number(params.get('page') ?? 1);
  const hasGeo = params.has('lat');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a turf</h1>
        <p className="text-gray-500">Search by name, area or city, and filter by sport.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: q.trim() }); }} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search turfs…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700">Search</button>
        </form>

        <select className={select} value={params.get('city') ?? ''} onChange={(e) => update({ city: e.target.value })}>
          <option value="">All cities</option>
          {meta.data?.cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className={select} value={params.get('sport') ?? ''} onChange={(e) => update({ sport: e.target.value })}>
          <option value="">All sports</option>
          {meta.data?.sports.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>

        <select
          className={select}
          value={params.get('sort') ?? 'newest'}
          disabled={hasGeo}
          onChange={(e) => update({ sort: e.target.value })}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>

        {hasGeo ? (
          <button onClick={() => update({ lat: '', lng: '' })} className="rounded-lg border px-3 py-2 text-sm">
            ✕ Clear near me
          </button>
        ) : (
          <button onClick={nearMe} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            📍 Near me
          </button>
        )}
      </div>
      {geoError && <p className="text-sm text-red-600">{geoError}</p>}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="text-red-600">{errorMessage(error)}</p>
      ) : data.turfs.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No turfs match your filters.</p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {data.total} turf{data.total === 1 ? '' : 's'} found {isFetching && '· updating…'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.turfs.map((t) => <TurfCard key={t.id} turf={t} />)}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button disabled={page <= 1} onClick={() => update({ page: page - 1 })}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-gray-600">Page {data.page} of {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => update({ page: page + 1 })}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}