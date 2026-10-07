import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { landingFor } from '../lib/roles';
import Field from '../components/Field';


export default function RegisterPage({ business = false }) {
  const { registerCustomer, registerBusiness } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', name: '', email: '', phone: '', password: '' });

  const mutation = useMutation({
    mutationFn: () => {
      
      const { businessName, phone, ...rest } = form;
      const payload = { ...rest, ...(phone && { phone }), ...(business && { businessName }) };
      return business ? registerBusiness(payload) : registerCustomer(payload);
    },
    onSuccess: (user) => navigate(landingFor(user), { replace: true }),
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold">{business ? 'List your turf' : 'Create account'}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {business ? 'Register your business and start managing bookings.' : 'Find and book turfs near you.'}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        {business && (
          <Field label="Business name" required value={form.businessName} onChange={set('businessName')} />
        )}
        <Field label="Your name" required value={form.name} onChange={set('name')} />
        <Field label="Email" type="email" required value={form.email} onChange={set('email')} />
        <Field label="Phone (optional)" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} />
        <Field label="Password (min 8 characters)" type="password" required minLength={8} value={form.password} onChange={set('password')} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
        <button
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already registered? <Link to="/login" className="text-green-700 underline">Log in</Link>
      </p>
    </div>
  );
}