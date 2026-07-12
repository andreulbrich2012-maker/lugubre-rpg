import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Alert from '../Alert';
import Button from '../Button';
import LoadingButton from '../LoadingButton';
import { api } from '../../lib/api';
import { PowerCard, powerElements, powerTypes } from '../../pages/PowerLibrary';

const blankPower = {
  name: '',
  type: 'magia',
  element: 'Érebo',
  description: '',
  manaCost: 0,
  damageFormula: '',
  range: '',
  duration: '',
  requirement: '',
  recommendedClass: '',
  recommendedLevel: 1,
  imageUrl: ''
};

export default function AdminPowerLibraryPage() {
  const [powers, setPowers] = useState([]);
  const [form, setForm] = useState(blankPower);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState('');

  async function load() {
    const { data } = await api.get('/powers');
    setPowers(data || []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(power) {
    setEditingId(power.id);
    setForm({
      name: power.name || '',
      type: power.type || 'magia',
      element: power.element || 'Érebo',
      description: power.description || '',
      manaCost: power.mana_cost || 0,
      damageFormula: power.damage_formula || '',
      range: power.range || '',
      duration: power.duration || '',
      requirement: power.requirement || '',
      recommendedClass: power.recommended_class || '',
      recommendedLevel: power.recommended_level || 1,
      imageUrl: power.image_url || ''
    });
    setMessage(null);
  }

  function reset() {
    setForm(blankPower);
    setEditingId(null);
  }

  async function save(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (editingId) await api.put(`/admin/powers/${editingId}`, form);
      else await api.post('/admin/powers', form);
      setMessage({ type: 'success', text: editingId ? 'Magia/poder editado.' : 'Magia/poder criado.' });
      reset();
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar.' });
    } finally {
      setLoading(false);
    }
  }

  async function remove(power) {
    setDeletingId(power.id);
    setMessage(null);
    try {
      await api.delete(`/admin/powers/${power.id}`);
      setConfirmDelete(null);
      setPowers((current) => current.filter((item) => item.id !== power.id));
      if (editingId === power.id) reset();
      setMessage({ type: 'success', text: 'Magia/poder deletado.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel deletar.' });
    } finally {
      setDeletingId('');
    }
  }

  const patch = (value) => setForm((current) => ({ ...current, ...value }));

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={save} className="gothic-panel rounded-md p-4 sm:p-5">
        <h2 className="font-display text-3xl text-ember">{editingId ? 'Editar magia/poder' : 'Nova magia/poder'}</h2>
        <div className="mt-5 grid gap-3">
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Nome" value={form.name} onChange={(event) => patch({ name: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={form.type} onChange={(event) => patch({ type: event.target.value })}>
              {powerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={form.element} onChange={(event) => patch({ element: event.target.value })} disabled={form.type !== 'magia'}>
              {powerElements.map((element) => <option key={element} value={element}>{element}</option>)}
            </select>
          </div>
          <textarea className="min-h-28 rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Descrição" value={form.description} onChange={(event) => patch({ description: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Mana" value={form.manaCost} onChange={(manaCost) => patch({ manaCost })} />
            <NumberField label="Nível recomendado" value={form.recommendedLevel} onChange={(recommendedLevel) => patch({ recommendedLevel })} />
          </div>
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Dano/fórmula, ex: 1d10+2" value={form.damageFormula} onChange={(event) => patch({ damageFormula: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Alcance" value={form.range} onChange={(event) => patch({ range: event.target.value })} />
            <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Duração" value={form.duration} onChange={(event) => patch({ duration: event.target.value })} />
          </div>
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Requisito" value={form.requirement} onChange={(event) => patch({ requirement: event.target.value })} />
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Classe recomendada" value={form.recommendedClass} onChange={(event) => patch({ recommendedClass: event.target.value })} />
          <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Imagem opcional" value={form.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} />
          {message && <Alert type={message.type}>{message.text}</Alert>}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <LoadingButton loading={loading} loadingText="Salvando..." className="w-full sm:w-auto">{editingId ? 'Salvar edição' : 'Criar'}</LoadingButton>
            {editingId && <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={reset}>Cancelar edição</Button>}
          </div>
        </div>
      </form>

      <section className="gothic-panel rounded-md p-4 sm:p-5">
        <h2 className="font-display text-3xl text-ember">Biblioteca cadastrada</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {powers.map((power) => (
            <PowerCard
              key={power.id}
              power={power}
              onDetails={() => startEdit(power)}
              adminActions={(
                <>
                  <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => startEdit(power)}><Edit size={15} /> Editar</Button>
                  <Button type="button" variant="ghost" className="w-full text-red-200 sm:w-auto" onClick={() => setConfirmDelete(power)}><Trash2 size={15} /> Deletar</Button>
                </>
              )}
            />
          ))}
          {!powers.length && <p className="rounded-md border border-dashed border-ember/20 p-6 text-center text-mist">Nenhum item cadastrado.</p>}
        </div>
      </section>
      {confirmDelete && (
        <ConfirmDialog
          title={`Deletar ${confirmDelete.name}?`}
          loading={deletingId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="text-sm text-mist">
      {label}
      <input type="number" min="0" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm, loading = false }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <section className="gothic-panel max-h-[90vh] w-full max-w-md overflow-auto rounded-md p-4 sm:p-6">
        <h2 className="font-display text-3xl text-ember">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar este item? Essa acao nao podera ser desfeita.</p>
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" disabled={loading} className="w-full sm:w-auto" onClick={onCancel}>Cancelar</Button>
          <Button type="button" disabled={loading} className="w-full border-red-500/70 bg-red-900/70 hover:bg-red-800 sm:w-auto" onClick={onConfirm}>{loading ? 'Deletando...' : 'Deletar'}</Button>
        </div>
      </section>
    </div>
  );
}
