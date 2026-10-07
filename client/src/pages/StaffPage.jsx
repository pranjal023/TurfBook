import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { label } from '../lib/format';
import Spinner from '../components/Spinner';
import StaffDialog from '../components/StaffDialog';

const ROLE_BADGE = {
  owner: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  receptionist: 'bg-green-100 text-green-800',
  ground_staff: 'bg-amber-100 text-amber-800',
};

export default function StaffPage() {
  const { can } = useAuth();
  const canManage = can('staff:manage');
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); 

  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then((r) => r.data.data.staff),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/staff/${id}`, { isActive }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  if (staff.isLoading) return <Spinner />;
  if (staff.isError) return <p className="text-red-600">{errorMessage(staff.error)}</p>;

  const deactivate = (m) =>
    window.confirm(`Deactivate ${m.name}? They are signed out immediately and cannot log in.`) &&
    toggle.mutate({ id: m._id, isActive: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        {canManage && (
          <button onClick={() => setDialog({ member: null })}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
            + Add staff
          </button>
        )}
      </div>
      {!canManage && <p className="text-sm text-gray-500">Only the business owner can add or change staff.</p>}
      {toggle.isError && <p className="text-sm text-red-600">{errorMessage(toggle.error)}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              {['Name', 'Role', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.data.map((m) => (
              <tr key={m._id} className={m.isActive ? '' : 'bg-gray-50 text-gray-500'}>
                <td className="px-3 py-2">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.email}{m.phone && ` · ${m.phone}`}</p>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[m.role]}`}>{label(m.role)}</span>
                </td>
                <td className="px-3 py-2">{m.isActive ? 'Active' : 'Deactivated'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {canManage && m.role !== 'owner' && (
                    <div className="flex justify-end gap-3 text-xs">
                      <button onClick={() => setDialog({ member: m })} className="underline">Edit</button>
                      {m.isActive ? (
                        <button onClick={() => deactivate(m)} className="text-red-700 underline">Deactivate</button>
                      ) : (
                        <button onClick={() => toggle.mutate({ id: m._id, isActive: true })} className="text-green-700 underline">
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <StaffDialog key={dialog.member?._id ?? 'new'} member={dialog.member} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}