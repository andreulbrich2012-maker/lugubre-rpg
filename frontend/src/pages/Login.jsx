import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Alert from '../components/Alert';
import LoadingButton from '../components/LoadingButton';
import { useAuth } from '../store/authStore';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const next = {};
    if (!form.email.trim()) next.email = 'Email obrigatório.';
    else if (!emailPattern.test(form.email)) next.email = 'Informe um email válido.';
    if (!form.password) next.password = 'Senha obrigatória.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    if (!validate()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
      setTimeout(() => navigate('/dashboard'), 350);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Email ou senha incorretos.' });
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Entrar" subtitle="Volte para suas fichas, campanhas e pactos pendentes.">
      <form onSubmit={submit} className="space-y-4 motion-safe:animate-[fadeIn_.25s_ease]">
        <Field label="Email" type="email" value={form.email} error={errors.email} onChange={(email) => setForm({ ...form, email })} />
        <Field label="Senha" type="password" value={form.password} error={errors.password} onChange={(password) => setForm({ ...form, password })} />
        {message && <Alert type={message.type}>{message.text}</Alert>}
        <LoadingButton loading={loading} loadingText="Entrando..." className="w-full">Acessar</LoadingButton>
        <p className="text-sm text-mist">Sem conta? <Link className="inline-flex min-h-11 items-center text-ember underline hover:text-bone" to="/register">Registrar</Link></p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="grid min-h-[calc(100vh-144px)] place-items-center px-3 py-8 sm:px-4 sm:py-12">
      <section className="gothic-panel w-full max-w-md p-4 sm:p-6">
        <h1 className="font-display text-3xl text-bone sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-mist">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function Field({ label, value, onChange, type = 'text', error }) {
  const valid = value && !error;
  // Vidro acusa o estado: rubi no erro, verde de Gaia quando valido.
  const state = error ? '!border-blood' : valid ? '!border-[var(--p-gaia)]' : '';

  return (
    <label className="block text-sm text-mist">
      {label}
      <input
        className={`field ${state}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-bone">{error}</span>}
    </label>
  );
}
