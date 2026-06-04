import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../store/authStore';
import { AuthShell, Field } from './Login';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    try {
      await register(form.name, form.email, form.password);
      navigate('/characters');
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível criar a conta.');
    }
  }

  return (
    <AuthShell title="Registro">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Field label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button className="w-full">Criar conta</Button>
      </form>
    </AuthShell>
  );
}
