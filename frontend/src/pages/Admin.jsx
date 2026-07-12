import { useEffect, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import AdminPowerLibraryPage from '../components/admin/AdminPowerLibraryPage';
import AdminFeedbackPage from '../components/feedback/AdminFeedbackPage';
import AdminMonstersPage from '../components/monsters/AdminMonstersPage';
import { api } from '../lib/api';

const attributes = ['forca', 'agilidade', 'intelecto', 'vigor', 'presenca'];

export default function Admin() {
  const [catalog, setCatalog] = useState({ races: [], classes: [], origins: [], skills: [] });
  const [race, setRace] = useState(blankRace());
  const [klass, setKlass] = useState({ name: '', description: '', image: '', progression: [{ level: 1, mana: 0, feature: '' }] });
  const [origin, setOrigin] = useState(blankOrigin());
  const [skill, setSkill] = useState({ name: '', key: '', attribute: 'presenca' });
  const [editor, setEditor] = useState(null);
  const [adminSection, setAdminSection] = useState('catalogs');
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    const [races, classes, origins, skills] = await Promise.all([
      api.get('/catalog/races'),
      api.get('/catalog/classes'),
      api.get('/catalog/origins'),
      api.get('/catalog/skills')
    ]);
    setCatalog({ races: races.data, classes: classes.data, origins: origins.data, skills: skills.data });
  }

  useEffect(() => { load(); }, []);

  async function addRace(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.post('/admin/races', race);
      setRace(blankRace());
      setMessage({ type: 'success', text: 'Raça adicionada com sucesso.' });
    });
  }

  async function addClass(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.post('/admin/classes', klass);
      setKlass({ name: '', description: '', image: '', progression: [{ level: 1, mana: 0, feature: '' }] });
      setMessage({ type: 'success', text: 'Classe adicionada com sucesso.' });
    });
  }

  async function addOrigin(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.post('/admin/origins', origin);
      setOrigin(blankOrigin());
      setMessage({ type: 'success', text: 'Origem adicionada com sucesso.' });
    });
  }

  async function addSkill(event) {
    event.preventDefault();
    const key = skill.key || slug(skill.name);
    await runAction(async () => {
      await api.post('/admin/skills', { ...skill, key });
      setSkill({ name: '', key: '', attribute: 'presenca' });
      setMessage({ type: 'success', text: 'Perícia adicionada com sucesso.' });
    });
  }

  async function remove(endpoint, id) {
    await runAction(async () => {
      await api.delete(`/admin/${endpoint}/${id}`);
      setConfirmDelete(null);
      if (editor?.item?.id === id) setEditor(null);
      setMessage({ type: 'success', text: 'Item deletado com sucesso.' });
    });
  }

  async function saveEditor() {
    await runAction(async () => {
      const { type, item } = editor;
      if (type === 'races') {
        await api.put(`/admin/races/${item.id}`, {
          name: item.name,
          image: item.image || '',
          attributeModifiers: normalizeNumbers(item.attribute_modifiers)
        });
      }
      if (type === 'origins') {
        await api.put(`/admin/origins/${item.id}`, {
          name: item.name,
          description: item.description || '',
          skillModifiers: normalizeNumbers(item.skill_modifiers)
        });
      }
      if (type === 'classes') {
        await api.put(`/admin/classes/${item.id}`, {
          name: item.name,
          description: item.description || '',
          image: item.image || '',
          progression: item.progression || []
        });
      }
      if (type === 'skills') {
        await api.put(`/admin/skills/${item.id}`, {
          name: item.name,
          key: item.key,
          attribute: item.attribute || 'presenca'
        });
      }
      setEditor(null);
      setMessage({ type: 'success', text: 'Item editado com sucesso.' });
    });
  }

  async function runAction(action) {
    setActionLoading(true);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (err) {
      console.error('Erro no painel admin:', err);
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível concluir a ação.' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-4 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl text-ember">Administração</h1>
        <div className="grid grid-cols-2 rounded-md border border-ember/15 bg-black/25 p-1 sm:flex">
          <button type="button" className={`min-h-10 rounded px-3 py-2 text-sm ${adminSection === 'catalogs' ? 'bg-ember/15 text-white' : 'text-mist hover:text-white'}`} onClick={() => setAdminSection('catalogs')}>Catálogos</button>
          <button type="button" className={`min-h-10 rounded px-3 py-2 text-sm ${adminSection === 'monsters' ? 'bg-ember/15 text-white' : 'text-mist hover:text-white'}`} onClick={() => setAdminSection('monsters')}>Monstros</button>
          <button type="button" className={`min-h-10 rounded px-3 py-2 text-sm ${adminSection === 'powers' ? 'bg-ember/15 text-white' : 'text-mist hover:text-white'}`} onClick={() => setAdminSection('powers')}>Biblioteca</button>
          <button type="button" className={`min-h-10 rounded px-3 py-2 text-sm ${adminSection === 'feedbacks' ? 'bg-ember/15 text-white' : 'text-mist hover:text-white'}`} onClick={() => setAdminSection('feedbacks')}>Feedback</button>
        </div>
      </div>

      {adminSection === 'monsters' ? (
        <div className="mt-8"><AdminMonstersPage /></div>
      ) : adminSection === 'powers' ? (
        <div className="mt-8"><AdminPowerLibraryPage /></div>
      ) : adminSection === 'feedbacks' ? (
        <div className="mt-8"><AdminFeedbackPage /></div>
      ) : (
        <>
      {message && <div className="mt-6"><Alert type={message.type}>{message.text}</Alert></div>}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Raças" onSubmit={addRace}>
          <Input placeholder="Nome" value={race.name} onChange={(name) => setRace({ ...race, name })} />
          <ModifierGrid title="Modificadores de atributos" keysList={attributes} values={race.attributeModifiers} onChange={(attributeModifiers) => setRace({ ...race, attributeModifiers })} />
          <Button disabled={actionLoading}>{actionLoading ? 'Salvando...' : 'Adicionar raça'}</Button>
          <List items={catalog.races} endpoint="races" onEdit={(item) => { setMessage(null); setEditor({ type: 'races', item: { ...item, attribute_modifiers: { ...item.attribute_modifiers } } }); }} onRemove={(endpoint, item) => setConfirmDelete({ endpoint, item })} />
        </Panel>

        <Panel title="Classes" onSubmit={addClass}>
          <Input placeholder="Nome" value={klass.name} onChange={(name) => setKlass({ ...klass, name })} />
          <Input placeholder="Descrição curta" value={klass.description} onChange={(description) => setKlass({ ...klass, description })} />
          <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Progressão nível 1" value={klass.progression[0].feature} onChange={(event) => setKlass({ ...klass, progression: [{ level: 1, mana: 0, feature: event.target.value }] })} />
          <Button disabled={actionLoading}>{actionLoading ? 'Salvando...' : 'Adicionar classe'}</Button>
          <List items={catalog.classes} endpoint="classes" onEdit={(item) => { setMessage(null); setEditor({ type: 'classes', item: { ...item } }); }} onRemove={(endpoint, item) => setConfirmDelete({ endpoint, item })} />
        </Panel>

        <Panel title="Origens" onSubmit={addOrigin}>
          <Input placeholder="Nome" value={origin.name} onChange={(name) => setOrigin({ ...origin, name })} />
          <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descrição" value={origin.description} onChange={(event) => setOrigin({ ...origin, description: event.target.value })} />
          <ModifierGrid title="Bônus de perícias" keysList={catalog.skills.map((item) => item.key)} labels={catalog.skills} values={origin.skillModifiers} onChange={(skillModifiers) => setOrigin({ ...origin, skillModifiers })} />
          <Button disabled={actionLoading}>{actionLoading ? 'Salvando...' : 'Adicionar origem'}</Button>
          <List items={catalog.origins} endpoint="origins" onEdit={(item) => { setMessage(null); setEditor({ type: 'origins', item: { ...item, skill_modifiers: { ...(item.skill_modifiers || {}) } } }); }} onRemove={(endpoint, item) => setConfirmDelete({ endpoint, item })} />
        </Panel>

        <Panel title="Perícias" onSubmit={addSkill}>
          <Input placeholder="Nome" value={skill.name} onChange={(name) => setSkill({ ...skill, name })} />
          <Input placeholder="Chave opcional" value={skill.key} onChange={(key) => setSkill({ ...skill, key })} />
          <select className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={skill.attribute} onChange={(event) => setSkill({ ...skill, attribute: event.target.value })}>
            {attributes.map((attr) => <option key={attr} value={attr}>{attr}</option>)}
          </select>
          <Button disabled={actionLoading}>{actionLoading ? 'Salvando...' : 'Adicionar perícia'}</Button>
          <List items={catalog.skills} endpoint="skills" onEdit={(item) => { setMessage(null); setEditor({ type: 'skills', item: { ...item } }); }} onRemove={(endpoint, item) => setConfirmDelete({ endpoint, item })} />
        </Panel>
      </div>

      {editor && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4">
          <section className="gothic-panel max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md p-4 sm:p-6">
            <h2 className="font-display text-3xl text-ember">Editar {editor.item.name}</h2>
            <div className="mt-5 space-y-4">
              <Input placeholder="Nome" value={editor.item.name} onChange={(name) => setEditor({ ...editor, item: { ...editor.item, name } })} />
              {editor.type === 'races' && <Input placeholder="Imagem opcional" value={editor.item.image || ''} onChange={(image) => setEditor({ ...editor, item: { ...editor.item, image } })} />}
              {editor.type === 'origins' && <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={editor.item.description || ''} onChange={(event) => setEditor({ ...editor, item: { ...editor.item, description: event.target.value } })} />}
              {editor.type === 'classes' && (
                <>
                  <Input placeholder="Descrição curta" value={editor.item.description || ''} onChange={(description) => setEditor({ ...editor, item: { ...editor.item, description } })} />
                  <Input placeholder="Imagem opcional" value={editor.item.image || ''} onChange={(image) => setEditor({ ...editor, item: { ...editor.item, image } })} />
                  <ClassProgressionEditor progression={editor.item.progression || []} onChange={(progression) => setEditor({ ...editor, item: { ...editor.item, progression } })} />
                </>
              )}
              {editor.type === 'races' && <ModifierGrid title="Modificadores de atributos" keysList={attributes} values={editor.item.attribute_modifiers || {}} onChange={(attribute_modifiers) => setEditor({ ...editor, item: { ...editor.item, attribute_modifiers } })} />}
              {editor.type === 'origins' && <ModifierGrid title="Bônus de perícias" keysList={catalog.skills.map((item) => item.key)} labels={catalog.skills} values={editor.item.skill_modifiers || {}} onChange={(skill_modifiers) => setEditor({ ...editor, item: { ...editor.item, skill_modifiers } })} />}
              {editor.type === 'skills' && (
                <>
                  <Input placeholder="Chave" value={editor.item.key} onChange={(key) => setEditor({ ...editor, item: { ...editor.item, key } })} />
                  <select className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={editor.item.attribute || 'presenca'} onChange={(event) => setEditor({ ...editor, item: { ...editor.item, attribute: event.target.value } })}>
                    {attributes.map((attr) => <option key={attr} value={attr}>{attr}</option>)}
                  </select>
                </>
              )}
            </div>
            <div className="mt-6 grid gap-2 sm:flex sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setEditor(null)}>Cancelar</Button>
              <Button type="button" disabled={actionLoading} onClick={saveEditor}>{actionLoading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </section>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={`Deletar ${confirmDelete.item.name}?`}
          onCancel={() => setConfirmDelete(null)}
          loading={actionLoading}
          onConfirm={() => remove(confirmDelete.endpoint, confirmDelete.item.id)}
        />
      )}
        </>
      )}
    </main>
  );
}

function Panel({ title, onSubmit, children }) {
  return <form onSubmit={onSubmit} className="gothic-panel rounded-md p-4 space-y-3 sm:p-5"><h2 className="font-display text-2xl">{title}</h2>{children}</form>;
}

function Input({ value, onChange, placeholder }) {
  return <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function ClassProgressionEditor({ progression, onChange }) {
  const rows = progression.length ? progression : [{ level: 1, mana: 0, feature: '' }];

  function update(index, patch) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  function addRow() {
    onChange([...rows, { level: Math.min(20, rows.length + 1), mana: 0, feature: '' }]);
  }

  function removeRow(index) {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    onChange(next.length ? next : [{ level: 1, mana: 0, feature: '' }]);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[.22em] text-ember">Progressão</p>
        <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={addRow}>Adicionar nível</Button>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((row, index) => (
          <div key={`${row.level}-${index}`} className="grid gap-2 rounded-md border border-ember/15 bg-black/20 p-2 sm:grid-cols-[90px_90px_1fr_auto]">
            <input type="number" min="1" max="20" className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={row.level ?? 1} onChange={(event) => update(index, { level: Number(event.target.value) || 1 })} />
            <input type="number" min="0" className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={row.mana ?? 0} onChange={(event) => update(index, { mana: Number(event.target.value) || 0 })} />
            <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Habilidade" value={row.feature || ''} onChange={(event) => update(index, { feature: event.target.value })} />
            <Button type="button" variant="ghost" className="px-3 text-red-200" onClick={() => removeRow(index)}>Remover</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModifierGrid({ title, keysList, labels = [], values, onChange }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[.22em] text-ember">{title}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {keysList.map((key) => {
          const label = labels.find((item) => item.key === key)?.name || key;
          return (
            <label key={key} className="text-sm capitalize text-mist">
              {label}
              <input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={values?.[key] ?? 0} onChange={(event) => onChange({ ...values, [key]: Number(event.target.value) })} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function List({ items, endpoint, onEdit, onRemove }) {
  return (
    <ul className="space-y-2 pt-3">
      {items.map((item) => (
        <li className="rounded-md border border-white/10 bg-black/20 p-2 text-sm text-mist" key={item.id}>
          <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
            <span className="break-words">{item.name}</span>
            <span className="grid gap-2 sm:flex sm:shrink-0 sm:flex-wrap">
              <Button type="button" variant="ghost" className="w-full px-3 py-1.5 text-xs sm:w-auto" onClick={() => onEdit(item)}>
                <span className="inline-flex items-center gap-1"><Edit size={13} /> Editar</span>
              </Button>
              <Button type="button" variant="ghost" className="w-full px-3 py-1.5 text-xs text-red-200 sm:w-auto" onClick={() => onRemove(endpoint, item)}>
                <span className="inline-flex items-center gap-1"><Trash2 size={13} /> Deletar</span>
              </Button>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConfirmDialog({ title, onCancel, onConfirm, loading = false }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <section className="gothic-panel max-h-[90vh] w-full max-w-md overflow-auto rounded-md p-4 sm:p-6">
        <h2 className="font-display text-3xl text-ember">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar este item? Essa ação não poderá ser desfeita.</p>
        <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>Cancelar</Button>
          <Button type="button" disabled={loading} className="border-red-500/70 bg-red-900/70 hover:bg-red-800" onClick={onConfirm}>{loading ? 'Deletando...' : 'Deletar'}</Button>
        </div>
      </section>
    </div>
  );
}

function blankRace() {
  return { name: '', image: '', attributeModifiers: Object.fromEntries(attributes.map((key) => [key, 0])) };
}

function blankOrigin() {
  return { name: '', description: '', skillModifiers: {} };
}

function normalizeNumbers(values = {}) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value) || 0]));
}

function slug(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
