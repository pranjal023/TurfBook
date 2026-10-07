import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import TurfForm from '../components/TurfForm';

export default function NewTurfPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload) => api.post('/turfs', payload).then((r) => r.data.data.turf),
    onSuccess: (turf) => {
      queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
      queryClient.invalidateQueries({ queryKey: ['turfs'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
      
      navigate(`/dashboard/turfs/${turf._id}/edit`, { state: { justCreated: true }, replace: true });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add a turf</h1>
      <TurfForm onSubmit={create.mutate} isPending={create.isPending} error={create.error} />
    </div>
  );
}