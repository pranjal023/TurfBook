import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STATUS_BADGE, formatPrice, label } from '../lib/format';
import Spinner from '../components/Spinner';

export default function TurfsPage() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can('turf:write');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-turfs'],
    queryFn: () => api.get('/turfs').then((r) => r.data.data.turfs),
  });


  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
    queryClient.invalidateQueries({ queryKey: ['turfs'] });
    queryClient.invalidateQueries({ queryKey: ['meta'] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/turfs/${id}`, { status }),
    onSettled: refresh,
  });
  const archive = useMutation({
    mutationFn: (id) => api.delete(`/turfs/${id}`),
    onSettled: refresh,
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{errorMessage(error)}</p>;

  const mutationError = setStatus.error ?? archive.error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your turfs</h1>
        {canWrite && (
          <Link to="/dashboard/turfs/new" className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
            + Add turf
          </Link>
        )}
      </div>
      {mutationError && <p className="text-sm text-red-600">{errorMessage(mutationError)}</p>}

      {data.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          No turfs yet.{canWrite && ' Add your first one to start taking bookings.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((t) => (
            <div key={t._id} className="overflow-hidden rounded-xl border bg-white">
              {t.images[0] ? (
                <img src={t.images[0].url} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center bg-green-50 text-4xl">⚽</div>
              )}
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                </div>
                <p className="text-sm text-gray-500">{t.address.city} · {t.sports.map(label).join(', ')}</p>
                <p className="text-sm text-gray-600">{t.units.length} unit(s) · from {formatPrice(t.minPrice)}</p>
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {canWrite && (
                    <>
                      <Link to={`/dashboard/turfs/${t._id}/edit`} className="rounded-lg border px-2 py-1 hover:bg-gray-50">Edit</Link>
                      <button
                        onClick={() => setStatus.mutate({ id: t._id, status: t.status === 'active' ? 'inactive' : 'active' })}
                        className="rounded-lg border px-2 py-1 hover:bg-gray-50">
                        {t.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => window.confirm(`Archive "${t.name}"? It disappears from search and your list.`) && archive.mutate(t._id)}
                        className="rounded-lg border px-2 py-1 text-red-700 hover:bg-red-50">
                        Archive
                      </button>
                    </>
                  )}
                  {t.status === 'active' && (
                    <Link to={`/turfs/${t._id}`} className="px-2 py-1 text-green-700 underline">Public page</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}