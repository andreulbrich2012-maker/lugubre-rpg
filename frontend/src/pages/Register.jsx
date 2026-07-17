import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import LoadingButton from '../components/LoadingButton';
import { useAuth } from '../store/authStore';
import { AuthShell, Field } from './Login';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Nome obrigatorio.';
    if (!form.email.trim()) next.email = 'Email obrigatorio.';
    else if (!emailPattern.test(form.email)) next.email = 'Informe um email valido.';
    if (!form.password) next.password = 'Senha obrigatoria.';
    else if (form.password.length < 8) next.password = 'A senha deve ter pelo menos 8 caracteres.';
    if (!form.confirmPassword) next.confirmPassword = 'Confirme sua senha.';
    else if (form.confirmPassword !== form.password) next.confirmPassword = 'As senhas nao conferem.';
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
      await register(form.name, form.email, form.password);
      setMessage({ type: 'success', text: 'Conta criada com sucesso! Redirecionando para o login...' });
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Erro ao criar conta. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Registro" subtitle="Crie sua conta para guardar fichas e mesas.">
      <form onSubmit={submit} className="space-y-4 motion-safe:animate-[fadeIn_.25s_ease]">
        <Field label="Nome" value={form.name} error={errors.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Email" type="email" value={form.email} error={errors.email} onChange={(email) => setForm({ ...form, email })} />
        <Field label="Senha" type="password" value={form.password} error={errors.password} onChange={(password) => setForm({ ...form, password })} />
        <Field label="Confirmar senha" type="password" value={form.confirmPassword} error={errors.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} />
        {message && <Alert type={message.type}>{message.text}</Alert>}
        <LoadingButton loading={loading} loadingText="Criando conta..." className="w-full">Criar conta</LoadingButton>
        <p className="text-sm text-mist">Ja tem conta? <Link className="text-ember hover:text-white" to="/login">Entrar</Link></p>
      </form>
    </AuthShell>
  );
}
