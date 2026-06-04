import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Button from '../components/Button';
import { useAuth } from '../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    try {
      await login(form.email, form.password);
      navigate('/characters');
    } catch {
      setError('Credenciais inválidas.');
    }
  }

  return (
    <AuthShell title="Entrar">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Field label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button className="w-full">Acessar</Button>
        <p className="text-sm text-mist">Sem conta? <Link className="text-ember" to="/register">Registrar</Link></p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, children }) {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <section className="gothic-panel rounded-md p-6">
        <h1 className="font-display text-3xl text-ember">{title}</h1>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block text-sm text-mist">
      {label}
      <input className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2 outline-none focus:border-ember" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
