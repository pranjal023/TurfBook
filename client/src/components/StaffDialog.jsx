import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import { label } from '../lib/format';
import Field, { inputClass } from './Field';
import Modal from './Modal';


export default function StaffDialog({ member, onClose }) {
  const isEdit = Boolean(member);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: member?.name ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    role: member?.role ?? 'receptionist',
    password: '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));


  const roles = useQuery({
    queryKey: ['staff-roles'],
    queryFn: () => api.get('/staff/roles').then((r) => r.data.data.roles),
    staleTime: 10 * 60_000,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), role: form.role, ...(form.phone && { phone: form.phone }) };
      return isEdit
        ? api.patch(`/staff/${member._id}`, { ...body, ...(form.password && { password: form.password }) })
        : api.post('/staff', { ...body, email: form.email, password: form.password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    },
  });

  return (
    <Modal title={isEdit ? `Edit ${member.name}` : 'Add staff member'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
        <Field label="Full name" required minLength={2} value={form.name} onChange={set('name')} />
        <Field label="Email (their login)" type="email" required disabled={isEdit} value={form.email} onChange={set('email')} />
        <Field label="Phone (optional)" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} />

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Role</span>
          <select value={form.role} onChange={set('role')} className={inputClass}>
            {(roles.data ?? []).map((r) => <option key={r.role} value={r.role}>{label(r.role)}</option>)}
          </select>
        </label>

        <Field label={isEdit ? 'Reset password (optional)' : 'Temporary password'} type="password"
          required={!isEdit} minLength={8} maxLength={72} autoComplete="new-password"
          value={form.password} onChange={set('password')} />
        <p className="text-xs text-gray-500">
          {isEdit
            ? 'Setting a new password signs them out everywhere.'
            : 'Share the email and this password with your staff member. Minimum 8 characters.'}
        </p>

        {save.isError && <p className="text-sm text-red-600">{errorMessage(save.error)}</p>}
        <div className="flex gap-2 pt-1">
          <button disabled={save.isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
            {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}