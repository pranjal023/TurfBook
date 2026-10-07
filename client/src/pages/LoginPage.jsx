import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/client';
import { landingFor } from '../lib/roles';
import Field from '../components/Field';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });

  const mutation = useMutation({
    mutationFn: () => login(form.email, form.password),
    onSuccess: (user) => navigate(landingFor(user, location.state?.from?.pathname), { replace: true }),
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold">Log in</h1>
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-4"
      >
        <Field label="Email" type="email" required value={form.email} onChange={set('email')} />
        <Field label="Password" type="password" required value={form.password} onChange={set('password')} />
        {mutation.isError && <p className="text-sm text-red-600">{errorMessage(mutation.error)}</p>}
        <button
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        New here? <Link to="/register" className="text-green-700 underline">Create an account</Link>
      </p>
    </div>
  );
}