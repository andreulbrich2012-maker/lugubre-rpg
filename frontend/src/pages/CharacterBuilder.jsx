import { ArrowLeft, ArrowRight, Save, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import EntityImage from '../components/EntityImage';
import { api } from '../lib/api';

const attributeKeys = ['forca', 'agilidade', 'presenca', 'intelecto', 'vigor'];
const attributeLabels = { forca: 'Força', agilidade: 'Agilidade', intelecto: 'Intelecto', vigor: 'Vigor', presenca: 'Presença' };
const baseAttributes = Object.fromEntries(attributeKeys.map((key) => [key, 2]));
const steps = ['Jogador', 'Personagem', 'Foto', 'Raça', 'Classe', 'Origem', 'Atributos', 'Inventário', 'Resumo'];
const initial = {
  playerName: '',
  characterName: '',
  photo: '',
  raceId: '',
  classId: '',
  originId: '',
  origin: '',
  level: 1,
  lifeCurrent: 63,
  lifeMax: 63,
  sanityCurrent: 52,
  sanityMax: 52,
  mana: 10,
  manaMax: 10,
  defense: 10,
  attributes: baseAttributes,
  skills: {},
  inventory: [],
  attacks: [],
  spells: []
};

export default function CharacterBuilder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [catalog, setCatalog] = useState({ races: [], classes: [], origins: [] });
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();

  const selectedRace = catalog.races.find((race) => race.id === form.raceId);
  const finalAttributes = useMemo(() => {
    const modifiers = selectedRace?.attribute_modifiers || {};
    return Object.fromEntries(attributeKeys.map((key) => [key, Number(baseAttributes[key] || 2) + Number(modifiers[key] || 0)]));
  }, [selectedRace]);

  useEffect(() => {
    Promise.all([api.get('/catalog/races'), api.get('/catalog/classes'), api.get('/catalog/origins')])
      .then(([races, classes, origins]) => setCatalog({ races: races.data, classes: classes.data, origins: origins.data }));
    if (id) api.get(`/characters/${id}`).then(({ data }) => setForm({
      playerName: data.player_name,
      characterName: data.character_name,
      photo: data.photo || '',
      raceId: data.race_id || '',
      classId: data.class_id || '',
      originId: data.origin_id || '',
      origin: data.origin || '',
      level: data.level,
      lifeCurrent: data.life_current ?? 63,
      lifeMax: data.life_max ?? 63,
      sanityCurrent: data.sanity_current ?? 52,
      sanityMax: data.sanity_max ?? 52,
      mana: data.mana,
      manaMax: data.mana_max ?? data.mana,
      defense: data.defense,
      attributes: baseAttributes,
      skills: data.skills || {},
      inventory: data.inventory || [],
      attacks: data.attacks || [],
      spells: data.spells || []
    }));
  }, [id]);

  const canAdvance = [
    Boolean(form.playerName.trim()),
    Boolean(form.characterName.trim()),
    true,
    Boolean(form.raceId),
    Boolean(form.classId),
    Boolean(form.originId || form.origin.trim()),
    true,
    true,
    true
  ][step];

  function next() {
    if (!canAdvance) {
      setError('Preencha esta etapa antes de avançar.');
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function save() {
    const payload = id ? form : { ...form, skills: undefined };
    const response = id ? await api.put(`/characters/${id}`, payload) : await api.post('/characters', payload);
    navigate(`/characters/${response.data.id}`);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top_left,rgba(143,29,44,.28),transparent_34%),#050507]">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col px-3 pb-28 pt-5 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.32em] text-ember">Criação de ficha</p>
            <h1 className="font-display text-3xl sm:text-4xl">{steps[step]}</h1>
          </div>
          <div className="text-right text-sm text-mist"><span className="text-ember">{step + 1}</span> / {steps.length}</div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-blood transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {steps.map((item, index) => (
            <span key={item} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${index === step ? 'border-ember bg-ember/15 text-white' : index < step ? 'border-ember/25 bg-black/25 text-ember' : 'border-white/10 bg-black/15 text-mist'}`}>
              {index + 1}. {item}
            </span>
          ))}
        </div>

        <div className="grid flex-1 items-start gap-5 py-5 sm:py-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <section className="gothic-panel min-h-[360px] rounded-md p-4 sm:p-6 md:min-h-[520px] md:p-10">
            {step === 0 && <BigInput label="Nome do jogador" value={form.playerName} onChange={(playerName) => setForm({ ...form, playerName })} />}
            {step === 1 && <BigInput label="Nome do personagem" value={form.characterName} onChange={(characterName) => setForm({ ...form, characterName })} />}
            {step === 2 && <PhotoStep form={form} setForm={setForm} />}
            {step === 3 && <PickList title="Escolha a raça" label="Raça" items={catalog.races} value={form.raceId} onChange={(raceId) => setForm({ ...form, raceId })} />}
            {step === 4 && <PickList title="Escolha a classe" label="Classe" items={catalog.classes} value={form.classId} onChange={(classId) => setForm({ ...form, classId })} />}
            {step === 5 && <OriginStep catalog={catalog} form={form} setForm={setForm} />}
            {step === 6 && <AttributePreview attributes={finalAttributes} selectedRace={selectedRace} />}
            {step === 7 && <Inventory form={form} setForm={setForm} />}
            {step === 8 && <Summary form={form} attributes={finalAttributes} catalog={catalog} />}
            {error && <p className="mt-6 text-sm text-red-300">{error}</p>}
          </section>

          <details className="gothic-panel rounded-md p-4 lg:hidden">
            <summary className="cursor-pointer font-display text-2xl text-ember">Preview da ficha</summary>
            <div className="mt-4">
              <SheetPreview form={form} attributes={finalAttributes} catalog={catalog} />
            </div>
          </details>

          <aside className="gothic-panel hidden rounded-md p-5 lg:block">
            <SheetPreview form={form} attributes={finalAttributes} catalog={catalog} />
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-20 z-20 grid gap-2 border-t border-ember/10 bg-abyss/95 p-3 backdrop-blur sm:static sm:flex sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:pb-4">
          <Button variant="ghost" className="w-full sm:w-auto" disabled={step === 0} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
            <ArrowLeft size={18} className="inline" /> Voltar
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next}>Avançar <ArrowRight size={18} className="inline" /></Button>
          ) : (
            <Button onClick={save}><Save size={18} className="inline" /> Salvar ficha</Button>
          )}
        </div>
      </section>
    </main>
  );
}

function BigInput({ label, value, onChange }) {
  return <label className="block"><span className="text-sm uppercase tracking-[.22em] text-ember">{label}</span><input autoFocus className="mt-5 w-full border-0 border-b border-ember/30 bg-transparent px-0 py-4 text-2xl font-semibold outline-none focus:border-ember sm:text-4xl" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PhotoStep({ form, setForm }) {
  function loadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, photo: String(reader.result) });
    reader.readAsDataURL(file);
  }
  return <div><p className="text-sm uppercase tracking-[.22em] text-ember">Foto do personagem</p><label className="mt-8 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-ember/35 bg-black/20 text-mist soft-motion sm:min-h-72">{form.photo ? <img src={form.photo} className="h-56 w-full rounded-md object-cover sm:h-72" /> : <><Upload className="text-ember" /><span className="mt-3">Selecionar arquivo</span></>}<input type="file" accept="image/*" className="hidden" onChange={loadFile} /></label></div>;
}

function PickList({ title, label, items, value, onChange }) {
  return <div><p className="text-sm uppercase tracking-[.22em] text-ember">{title}</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <button key={item.id} onClick={() => onChange(item.id)} className={`gothic-panel rounded-md p-4 text-left soft-motion ${value === item.id ? 'border-ember bg-ember/10' : ''}`}><EntityImage src={item.image} label={label} name={item.name} className="mb-4 h-32 sm:h-24" /><strong>{item.name}</strong>{item.description && <p className="mt-2 text-sm text-mist">{item.description}</p>}</button>)}</div></div>;
}

function OriginStep({ catalog, form, setForm }) {
  return <div><PickList title="Escolha uma origem" label="Origem" items={catalog.origins} value={form.originId} onChange={(originId) => setForm({ ...form, originId, origin: '' })} /><label className="mt-6 block text-sm text-mist">Origem personalizada<input className="mt-2 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value, originId: '' })} /></label></div>;
}

function AttributePreview({ attributes, selectedRace }) {
  const modifiers = selectedRace?.attribute_modifiers || {};
  return <div><p className="text-sm uppercase tracking-[.22em] text-ember">Atributos calculados</p><p className="mt-3 max-w-2xl text-sm text-mist">Todos começam em 2 e são fechados automaticamente pela raça. Nesta etapa você apenas confere o resultado final.</p><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{attributeKeys.map((key) => <div key={key} className="rounded-md border border-ember/15 bg-black/20 p-4 text-center text-sm text-mist"><span>{attributeLabels[key]}</span><div className="mt-2 text-4xl font-bold text-white">{attributes[key]}</div><span className="text-xs text-ember">Base 2 {Number(modifiers[key] || 0) >= 0 ? '+' : ''}{Number(modifiers[key] || 0)}</span></div>)}</div></div>;
}

function Inventory({ form, setForm }) {
  const [item, setItem] = useState({ quantity: 1, weight: 0, name: '', description: '', defenseBonus: 0 });
  function add() {
    if (!item.name.trim()) return;
    setForm({ ...form, inventory: [...form.inventory, item] });
    setItem({ quantity: 1, weight: 0, name: '', description: '', defenseBonus: 0 });
  }
  return <div><p className="text-sm uppercase tracking-[.22em] text-ember">Inventário</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input type="number" min="0" placeholder="Quantidade" className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={item.quantity} onChange={(event) => setItem({ ...item, quantity: Number(event.target.value) })} /><input type="number" min="0" placeholder="Peso" className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={item.weight} onChange={(event) => setItem({ ...item, weight: Number(event.target.value) })} /><input placeholder="Nome" className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={item.name} onChange={(event) => setItem({ ...item, name: event.target.value })} /><Button type="button" className="w-full" onClick={add}>Adicionar</Button></div><textarea placeholder="Descrição" className="mt-3 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={item.description} onChange={(event) => setItem({ ...item, description: event.target.value })} /><ul className="mt-5 space-y-2">{form.inventory.map((it, index) => <li key={`${it.name}-${index}`} className="text-mist">{Number(it.quantity ?? 1)}x {it.name} · peso {Number(it.weight || 0)}</li>)}</ul></div>;
}

function Summary({ form, attributes, catalog }) {
  return <div className="space-y-4"><SheetPreview form={form} attributes={attributes} catalog={catalog} expanded /><p className="text-sm text-mist">Perícias começam em 0 e só são ajustadas depois que a ficha for salva, na tela de visualização.</p></div>;
}

function SheetPreview({ form, attributes, catalog }) {
  const race = catalog.races.find((item) => item.id === form.raceId)?.name || 'Raça';
  const klass = catalog.classes.find((item) => item.id === form.classId)?.name || 'Classe';
  const origin = catalog.origins.find((item) => item.id === form.originId)?.name || form.origin || 'Origem';
  const totalDefense = form.defense + form.inventory.reduce((sum, item) => sum + Number(item.defenseBonus || 0), 0);
  return <div><h2 className="font-display text-3xl text-ember">{form.characterName || 'Personagem'}</h2><p className="text-sm text-mist">{form.playerName || 'Jogador'} · {origin}</p><p className="mt-1 text-sm text-mist">{race} · {klass}</p><div className="mt-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-3"><Stat label="Vida" value={`${form.lifeCurrent}/${form.lifeMax}`} /><Stat label="Sanidade" value={`${form.sanityCurrent}/${form.sanityMax}`} /><Stat label="Mana" value={`${form.mana}/${form.manaMax || form.mana}`} /></div><div className="mt-3 grid grid-cols-1 gap-3 text-center"><Stat label="Defesa" value={totalDefense} /></div><div className="mt-5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-5">{attributeKeys.map((key) => <Stat key={key} label={attributeLabels[key]} value={attributes[key]} />)}</div><p className="mt-4 text-center text-sm text-mist">Esquiva {15 - attributes.agilidade}</p></div>;
}

function Stat({ label, value }) {
  return <div className="rounded-md border border-ember/20 bg-black/25 p-2"><div className="text-xl font-bold">{value}</div><div className="text-[10px] uppercase text-mist">{label}</div></div>;
}
