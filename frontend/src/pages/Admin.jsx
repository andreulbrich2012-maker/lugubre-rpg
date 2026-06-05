import { useEffect, useState } from 'react';
import Button from '../components/Button';
import { api } from '../lib/api';

const attributes = ['forca', 'agilidade', 'intelecto', 'vigor', 'presenca'];

export default function Admin() {
  const [catalog, setCatalog] = useState({ races: [], classes: [], origins: [], skills: [] });
  const [race, setRace] = useState(blankRace());
  const [klass, setKlass] = useState({ name: '', description: '', image: '', progression: [{ level: 1, mana: 0, feature: '' }] });
  const [origin, setOrigin] = useState(blankOrigin());
  const [skill, setSkill] = useState({ name: '', key: '', attribute: 'presenca' });
  const [editor, setEditor] = useState(null);

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
    await api.post('/admin/races', race);
    setRace(blankRace());
    load();
  }

  async function addClass(event) {
    event.preventDefault();
    await api.post('/admin/classes', klass);
    setKlass({ name: '', description: '', image: '', progression: [{ level: 1, mana: 0, feature: '' }] });
    load();
  }

  async function addOrigin(event) {
    event.preventDefault();
    await api.post('/admin/origins', origin);
    setOrigin(blankOrigin());
    load();
  }

  async function addSkill(event) {
    event.preventDefault();
    const key = skill.key || slug(skill.name);
    await api.post('/admin/skills', { ...skill, key });
    setSkill({ name: '', key: '', attribute: 'presenca' });
    load();
  }

  async function remove(endpoint, id) {
    await api.delete(`/admin/${endpoint}/${id}`);
    load();
  }

  async function saveEditor() {
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
    load();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl text-ember">Administração</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Raças" onSubmit={addRace}>
          <Input placeholder="Nome" value={race.name} onChange={(name) => setRace({ ...race, name })} />
          <ModifierGrid title="Modificadores de atributos" keysList={attributes} values={race.attributeModifiers} onChange={(attributeModifiers) => setRace({ ...race, attributeModifiers })} />
          <Button>Adicionar raça</Button>
          <List items={catalog.races} endpoint="races" onEdit={(item) => setEditor({ type: 'races', item: { ...item, attribute_modifiers: { ...item.attribute_modifiers } } })} onRemove={remove} />
        </Panel>

        <Panel title="Classes" onSubmit={addClass}>
          <Input placeholder="Nome" value={klass.name} onChange={(name) => setKlass({ ...klass, name })} />
          <Input placeholder="Descrição curta" value={klass.description} onChange={(description) => setKlass({ ...klass, description })} />
          <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Progressão nível 1" value={klass.progression[0].feature} onChange={(event) => setKlass({ ...klass, progression: [{ level: 1, mana: 0, feature: event.target.value }] })} />
          <Button>Adicionar classe</Button>
          <List items={catalog.classes} endpoint="classes" onEdit={(item) => setEditor({ type: 'classes', item: { ...item } })} onRemove={remove} />
        </Panel>

        <Panel title="Origens" onSubmit={addOrigin}>
          <Input placeholder="Nome" value={origin.name} onChange={(name) => setOrigin({ ...origin, name })} />
          <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descrição" value={origin.description} onChange={(event) => setOrigin({ ...origin, description: event.target.value })} />
          <ModifierGrid title="Bônus de perícias" keysList={catalog.skills.map((item) => item.key)} labels={catalog.skills} values={origin.skillModifiers} onChange={(skillModifiers) => setOrigin({ ...origin, skillModifiers })} />
          <Button>Adicionar origem</Button>
          <List items={catalog.origins} endpoint="origins" onEdit={(item) => setEditor({ type: 'origins', item: { ...item, skill_modifiers: { ...(item.skill_modifiers || {}) } } })} onRemove={remove} />
        </Panel>

        <Panel title="Perícias" onSubmit={addSkill}>
          <Input placeholder="Nome" value={skill.name} onChange={(name) => setSkill({ ...skill, name })} />
          <Input placeholder="Chave opcional" value={skill.key} onChange={(key) => setSkill({ ...skill, key })} />
          <select className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={skill.attribute} onChange={(event) => setSkill({ ...skill, attribute: event.target.value })}>
            {attributes.map((attr) => <option key={attr} value={attr}>{attr}</option>)}
          </select>
          <Button>Adicionar perícia</Button>
          <List items={catalog.skills} endpoint="skills" onEdit={(item) => setEditor({ type: 'skills', item: { ...item } })} onRemove={remove} />
        </Panel>
      </div>

      {editor && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4">
          <section className="gothic-panel max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md p-6">
            <h2 className="font-display text-3xl text-ember">Editar {editor.item.name}</h2>
            <div className="mt-5 space-y-4">
              <Input placeholder="Nome" value={editor.item.name} onChange={(name) => setEditor({ ...editor, item: { ...editor.item, name } })} />
              {editor.type === 'origins' && <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={editor.item.description || ''} onChange={(event) => setEditor({ ...editor, item: { ...editor.item, description: event.target.value } })} />}
              {editor.type === 'classes' && <Input placeholder="Descrição curta" value={editor.item.description || ''} onChange={(description) => setEditor({ ...editor, item: { ...editor.item, description } })} />}
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
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditor(null)}>Cancelar</Button>
              <Button type="button" onClick={saveEditor}>Salvar</Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Panel({ title, onSubmit, children }) {
  return <form onSubmit={onSubmit} className="gothic-panel rounded-md p-5 space-y-3"><h2 className="font-display text-2xl">{title}</h2>{children}</form>;
}

function Input({ value, onChange, placeholder }) {
  return <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
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
          <div className="flex items-center justify-between gap-2">
            <span>{item.name}</span>
            <span className="shrink-0 space-x-2">
              <button type="button" className="text-ember" onClick={() => onEdit(item)}>editar</button>
              <button type="button" className="text-red-300" onClick={() => onRemove(endpoint, item.id)}>remover</button>
            </span>
          </div>
        </li>
      ))}
    </ul>
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
