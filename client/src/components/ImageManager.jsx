import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;

export default function ImageManager({ turf }) {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState('');

  
  const onDone = (updated) => {
    queryClient.setQueryData(['manage-turf', turf._id], updated);
    queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
    queryClient.invalidateQueries({ queryKey: ['turfs'] });
  };

  const upload = useMutation({
    mutationFn: (files) => {
      const body = new FormData(); 
      files.forEach((file) => body.append('images', file)); 
      return api.post(`/turfs/${turf._id}/images`, body).then((r) => r.data.data.turf);
    },
    onSuccess: onDone,
  });

  const remove = useMutation({
    mutationFn: (imageId) => api.delete(`/turfs/${turf._id}/images/${imageId}`).then((r) => r.data.data.turf),
    onSuccess: onDone,
  });

  const onPick = (e) => {
    const files = [...e.target.files];
    e.target.value = ''; // 
    setLocalError('');
    if (!files.length) return;
    if (files.some((f) => f.size > MAX_BYTES)) return setLocalError('Each image must be under 5 MB.');
    if (turf.images.length + files.length > MAX_IMAGES) return setLocalError(`A turf can have at most ${MAX_IMAGES} images.`);
    upload.mutate(files);
  };

  const error = localError || (upload.isError && errorMessage(upload.error)) || (remove.isError && errorMessage(remove.error));

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <h2 className="font-semibold">Photos</h2>
        <p className="text-xs text-gray-500">The first photo is the cover. JPEG, PNG or WebP, up to 5 MB each.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {turf.images.map((img) => (
          <div key={img._id} className="relative">
            <img src={img.url} alt="" className="h-24 w-32 rounded-lg object-cover" />
            <button onClick={() => remove.mutate(img._id)} disabled={remove.isPending} aria-label="Remove photo"
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white hover:bg-black/80">✕</button>
          </div>
        ))}
        {turf.images.length === 0 && <p className="text-sm text-gray-500">No photos yet.</p>}
      </div>

      <label className="inline-block cursor-pointer rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
        {upload.isPending ? 'Uploading…' : '+ Add photos'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPick} disabled={upload.isPending} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}