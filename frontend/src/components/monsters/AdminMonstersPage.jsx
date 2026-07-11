import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Button from '../Button';
import EntityImage from '../EntityImage';
import { api } from '../../lib/api';
import MonsterForm from './MonsterForm';
import { blankMonster, formToMonsterPayload, monsterToForm } from './monsterUtils';

export default function AdminMonstersPage() {
  const [monsters, setMonsters] = useState([]);
  const [form, setForm] = useState(blankMonster());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    const { data } = await api.get('/monsters');
    setMonsters(data);
  }

  useEffect(() => { load(); }, []);

  async function saveMonster(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = formToMonsterPayload(form);
      if (editingId) {
        await api.put(`/admin/monsters/${editingId}`, payload);
        setMessage({ type: 'success', text: 'Monstro editado.' });
      } else {
        await api.post('/admin/monsters', payload);
        setMessage({ type: 'success', text: 'Monstro criado.' });
      }
      setForm(blankMonster());
      setEditingId('');
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar o monstro. Confira os dados e fórmulas.' });
    } finally {
      setLoading(false);
    }
  }

  async function removeMonster(monster) {
    try {
      await api.delete(`/admin/monsters/${monster.id}`);
      setConfirmDelete(null);
      setMessage({ type: 'success', text: 'Monstro deletado com sucesso.' });
      if (editingId === monster.id) {
        setEditingId('');
        setForm(blankMonster());
      }
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível deletar o monstro.' });
    }
  }

  function editMonster(monster) {
    setEditingId(monster.id);
    setForm(monsterToForm(monster));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <MonsterForm
        form={form}
        setForm={setForm}
        editing={Boolean(editingId)}
        message={message}
        loading={loading}
        onSubmit={saveMonster}
        onCancel={() => { setEditingId(''); setForm(blankMonster()); setMessage(null); }}
      />

      <section className="gothic-panel rounded-md p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl text-ember">Monstros cadastrados</h2>
          <p className="text-sm text-mist">{monsters.length} registros</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {monsters.map((monster) => (
            <article key={monster.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
                <EntityImage src={monster.image_url} label="Monstro" name={monster.name} className="aspect-square w-full" compact />
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-ember/70">{monster.category}</p>
                  <h3 className="font-display text-2xl text-white">{monster.name}</h3>
                  <p className="text-sm text-mist">Vida {monster.min_health} a {monster.max_health} · Armadura {monster.armor}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-mist">{monster.description || 'Sem descrição.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="px-3 py-1.5 text-sm" onClick={() => editMonster(monster)}>
                      <span className="inline-flex items-center gap-2"><Edit size={15} /> Editar</span>
                    </Button>
                    <Button type="button" variant="ghost" className="px-3 py-1.5 text-sm text-red-200" onClick={() => setConfirmDelete(monster)}>
                      <span className="inline-flex items-center gap-2"><Trash2 size={15} /> Deletar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title={`Deletar ${confirmDelete.name}?`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeMonster(confirmDelete)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <section className="gothic-panel w-full max-w-md rounded-md p-6">
        <h2 className="font-display text-3xl text-ember">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar este item? Essa ação não poderá ser desfeita.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" className="border-red-500/70 bg-red-900/70 hover:bg-red-800" onClick={onConfirm}>Deletar</Button>
        </div>
      </section>
    </div>
  );
}
