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
    if (!form.email.trim()) next.email = 'Email obrigatorio.';
    else if (!emailPattern.test(form.email)) next.email = 'Informe um email valido.';
    if (!form.password) next.password = 'Senha obrigatoria.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    if (!validate()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos obrigatorios.' });
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
        <p className="text-sm text-mist">Sem conta? <Link className="text-ember hover:text-white" to="/register">Registrar</Link></p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="grid min-h-[calc(100vh-144px)] place-items-center px-3 py-8 sm:px-4 sm:py-12">
      <section className="gothic-panel w-full max-w-md rounded-md p-4 shadow-2xl sm:p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-ember/70">Lugubre RPG</p>
        <h1 className="mt-2 font-display text-3xl text-ember sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-mist">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function Field({ label, value, onChange, type = 'text', error }) {
  const valid = value && !error;
  const state = error
    ? 'border-red-400/70 focus:border-red-300'
    : valid
      ? 'border-emerald-500/60 focus:border-emerald-300'
      : 'border-ember/20 focus:border-ember';

  return (
    <label className="block text-sm text-mist">
      {label}
      <input
        className={`mt-1 w-full rounded-md border bg-black/30 px-3 py-2 outline-none transition-colors ${state}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </label>
  );
}
