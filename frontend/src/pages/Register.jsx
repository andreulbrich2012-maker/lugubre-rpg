import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../store/authStore';
import { AuthShell, Field } from './Login';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { register } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    await register(form.name, form.email, form.password);
    navigate('/characters');
  }

  return (
    <AuthShell title="Registro">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Field label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        <Button className="w-full">Criar conta</Button>
      </form>
    </AuthShell>
  );
}
