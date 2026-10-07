import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import Spinner from '../components/Spinner';
import TurfForm from '../components/TurfForm';
import ImageManager from '../components/ImageManager';

export default function EditTurfPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const queryClient = useQueryClient();
  const [formVersion, setFormVersion] = useState(0);
  const [saved, setSaved] = useState(false);

  const turfQuery = useQuery({
    queryKey: ['manage-turf', id],
    queryFn: () => api.get(`/turfs/${id}`).then((r) => r.data.data.turf),
    staleTime: 0,
  });

  const save = useMutation({
    mutationFn: (payload) => api.patch(`/turfs/${id}`, payload).then((r) => r.data.data.turf),
    onSuccess: (turf) => {
      queryClient.setQueryData(['manage-turf', id], turf);
      queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
      queryClient.invalidateQueries({ queryKey: ['turfs'] });
      queryClient.invalidateQueries({ queryKey: ['turf', id] });
      setFormVersion((v) => v + 1); 
      setSaved(true);
    },
  });

  if (turfQuery.isLoading) return <Spinner />;
  if (turfQuery.isError) return <p className="text-red-600">{errorMessage(turfQuery.error)}</p>;
  const turf = turfQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit: {turf.name}</h1>
        <Link to="/dashboard/turfs" className="text-sm text-green-700 underline">← Back to turfs</Link>
      </div>

      {state?.justCreated && !saved && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Turf created! Add some photos below. Customers see them first.
        </p>
      )}
      {saved && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Changes saved.</p>}

      <ImageManager turf={turf} />

      {/* key: when it changes, React discards the old form and mounts a fresh one from the saved data.
          Photo uploads do NOT change it, so unsaved edits survive an upload. */}
      <TurfForm
        key={formVersion}
        initial={turf}
        isEdit
        onSubmit={(payload) => { setSaved(false); save.mutate(payload); }}
        isPending={save.isPending}
        error={save.error}
      />
    </div>
  );
}