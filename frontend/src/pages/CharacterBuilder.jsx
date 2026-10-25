import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import EntityImage from '../components/EntityImage';
import { api } from '../lib/api';
import { buildCharacterPayload, characterSaveError, validateCharacterDraft } from '../lib/characterBuilder';
import AvatarCreator from '../components/avatar/AvatarCreator';
import AvatarSprite from '../components/avatar/AvatarSprite';
import { defaultAppearance, raceIdFromName } from '../lib/avatar/appearance';
import { portraitDataUrl } from '../lib/avatar/render';

const attributeKeys = ['forca', 'agilidade', 'presenca', 'intelecto', 'vigor'];
const attributeLabels = { forca: 'Força', agilidade: 'Agilidade', intelecto: 'Intelecto', vigor: 'Vigor', presenca: 'Presença' };
const baseAttributes = Object.fromEntries(attributeKeys.map((key) => [key, 2]));
// Ficha curta (5 etapas): sem foto (o retrato vem do boneco em pixel art) e sem inventario
// (itens entram depois, na ficha ou pelo mestre). Os numeros batem com lib/characterBuilder.js.
const steps = ['Nomes', 'Raça', 'Classe e origem', 'Aparência', 'Resumo'];
const STEP = { names: 0, race: 1, classOrigin: 2, look: 3, summary: 4 };
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
  spells: [],
  appearance: null
};

export default function CharacterBuilder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [catalog, setCatalog] = useState({ races: [], classes: [], origins: [] });
  const [error, setError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  const selectedRace = catalog.races.find((race) => race.id === form.raceId);
  const finalAttributes = useMemo(() => {
    const modifiers = selectedRace?.attribute_modifiers || {};
    return Object.fromEntries(attributeKeys.map((key) => [key, Number(baseAttributes[key] || 2) + Number(modifiers[key] || 0)]));
  }, [selectedRace]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    Promise.all([api.get('/catalog/races'), api.get('/catalog/classes'), api.get('/catalog/origins')])
      .then(([races, classes, origins]) => {
        if (active) setCatalog({ races: races.data, classes: classes.data, origins: origins.data });
      })
      .catch(() => active && setError('Não foi possível carregar raças, classes e origens.'))
      .finally(() => active && setCatalogLoading(false));
    if (id) api.get(`/characters/${id}`).then(({ data }) => active && setForm({
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
      spells: data.spells || [],
      appearance: data.appearance || null,
      // retrato gerado do boneco: so troca a foto se ela nao foi enviada pelo jogador
      photoAuto: !data.photo || Boolean(data.appearance && data.photo === portraitDataUrl(data.appearance, 160))
    })).catch((requestError) => active && setError(characterSaveError(requestError)));
    return () => { active = false; };
  }, [id]);

  function stepError() {
    if (step === STEP.names && !form.playerName.trim()) return 'Informe o nome do jogador.';
    if (step === STEP.names && !form.characterName.trim()) return 'Informe o nome do personagem.';
    if (step === STEP.race && !form.raceId) return 'Escolha uma raça.';
    if (step === STEP.classOrigin && !form.classId) return 'Escolha uma classe.';
    if (step === STEP.classOrigin && !form.originId && !form.origin.trim()) return 'Escolha uma origem.';
    return '';
  }

  function next() {
    const problem = stepError();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    // chegando na Aparencia sem nada escolhido: comeca do personagem base da raca da ficha
    if (step === STEP.classOrigin && !form.appearance) setForm((cur) => ({ ...cur, appearance: defaultAppearance(raceIdFromName(selectedRace?.name)) }));
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function save() {
    if (saving) return;
    let validation = validateCharacterDraft(form, catalog);
    if (validation) {
      setStep(validation.step);
      setError(validation.message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const [races, classes, origins] = await Promise.all([
        api.get('/catalog/races'),
        api.get('/catalog/classes'),
        api.get('/catalog/origins')
      ]);
      const currentCatalog = { races: races.data, classes: classes.data, origins: origins.data };
      setCatalog(currentCatalog);
      validation = validateCharacterDraft(form, currentCatalog);
      if (validation) {
        setStep(validation.step);
        setError(validation.message);
        return;
      }

      // sem foto enviada: o retrato da ficha e o rosto do boneco em pixel art
      const photo = form.appearance && (form.photoAuto || !form.photo) ? portraitDataUrl(form.appearance, 160) : form.photo;
      const payload = buildCharacterPayload({ ...form, photo }, { includeSkills: Boolean(id) });
      const response = id ? await api.put(`/characters/${id}`, payload) : await api.post('/characters', payload);
      if (!response.data?.id) throw new Error('A API não retornou o personagem criado.');
      navigate(`/characters/${response.data.id}`, { replace: true, state: { notice: 'Ficha salva no banco de dados.' } });
    } catch (requestError) {
      const message = characterSaveError(requestError);
      setError(message);
      if (message.includes('raça') || message.includes('raca')) setStep(STEP.race);
      if (message.includes('classe') || message.includes('origem')) setStep(STEP.classOrigin);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)]">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col px-3 pb-28 pt-5 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-bone sm:text-4xl">{steps[step]}</h1>
          </div>
          <div className="tabular text-right text-sm text-mist"><span className="text-ember">{step + 1}</span> / {steps.length}</div>
        </div>

        <div className="gauge mt-5" role="progressbar" aria-label="Etapa da criação" aria-valuemin="1" aria-valuemax={steps.length} aria-valuenow={step + 1}>
          <span className="!transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: 'var(--color-ember)' }} />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {steps.map((item, index) => (
            <span key={item} className={`shrink-0 border-[3px] border-lead px-3 py-2 text-xs font-semibold ${index === step ? 'lit text-bone' : index < step ? 'bg-glass text-ember' : 'bg-glass text-mist'}`}>
              {index + 1}. {item}
            </span>
          ))}
        </div>

        <div className={`grid flex-1 items-start gap-5 py-5 sm:py-8 ${step === STEP.look ? '' : 'lg:grid-cols-[1fr_360px] lg:items-center'}`}>
          <section className={`gothic-panel min-h-[360px] p-4 sm:p-6 md:min-h-[520px] ${step === STEP.look ? 'md:p-4' : 'md:p-10'}`}>
            {step === STEP.names && (
              <div className="space-y-10">
                <BigInput label="Nome do jogador" value={form.playerName} onChange={(playerName) => setForm({ ...form, playerName })} />
                <BigInput label="Nome do personagem" autoFocus={false} value={form.characterName} onChange={(characterName) => setForm({ ...form, characterName })} />
              </div>
            )}
            {step === STEP.race && <PickList title="Escolha a raça" label="Raça" items={catalog.races} value={form.raceId} onChange={(raceId) => setForm({ ...form, raceId })} />}
            {step === STEP.classOrigin && (
              <div className="space-y-10">
                <PickList title="Escolha a classe" label="Classe" items={catalog.classes} value={form.classId} onChange={(classId) => setForm({ ...form, classId })} />
                <OriginStep catalog={catalog} form={form} setForm={setForm} />
              </div>
            )}
            {step === STEP.look && <AvatarCreator value={form.appearance} raceId={raceIdFromName(selectedRace?.name)} onChange={(appearance) => setForm((cur) => ({ ...cur, appearance }))} />}
            {step === STEP.summary && (
              <div className="space-y-8">
                <AttributePreview attributes={finalAttributes} selectedRace={selectedRace} />
                <Summary form={form} attributes={finalAttributes} catalog={catalog} />
              </div>
            )}
            {catalogLoading && <p className="mt-6 text-sm text-mist" role="status">Carregando opções...</p>}
            {error && <p className="mt-6 border-[3px] border-lead bg-blood/40 p-3 text-sm text-bone" role="alert">{error}</p>}
          </section>

          <details className={`gothic-panel p-4 lg:hidden ${step === STEP.look ? 'hidden' : ''}`}>
            <summary className="cursor-pointer font-display text-2xl text-bone">Preview da ficha</summary>
            <div className="mt-4">
              <SheetPreview form={form} attributes={finalAttributes} catalog={catalog} />
            </div>
          </details>

          <aside className={`gothic-panel hidden p-5 ${step === STEP.look ? '' : 'lg:block'}`}>
            <SheetPreview form={form} attributes={finalAttributes} catalog={catalog} />
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-20 z-20 grid gap-2 border-t-[3px] border-lead bg-abyss/95 p-3 sm:static sm:flex sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:pb-4">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(current - 1, 0))}>
            <ArrowLeft size={18} className="inline" /> Voltar
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" disabled={catalogLoading || saving} onClick={next}>Avançar <ArrowRight size={18} className="inline" /></Button>
          ) : (
            <Button type="button" disabled={saving || catalogLoading} onClick={save}><Save size={18} className="inline" /> {saving ? 'Salvando...' : 'Salvar ficha'}</Button>
          )}
        </div>
      </section>
    </main>
  );
}

function BigInput({ label, value, onChange, autoFocus = true }) {
  return <label className="block"><span className="text-sm text-mist">{label}</span><input autoFocus={autoFocus} className="field mt-5 !border-0 !border-b-[3px] !bg-transparent !px-0 !py-4 font-display text-3xl !shadow-none focus:!border-ember sm:text-5xl" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function PickList({ title, label, items, value, onChange }) {
  return <div><p className="text-sm text-mist">{title}</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <button type="button" key={item.id} onClick={() => onChange(item.id)} className={`gothic-panel p-4 text-left soft-motion ${value === item.id ? 'lit' : ''}`}><EntityImage src={item.image} label={label} name={item.name} className="mb-4 h-32 sm:h-24" /><strong>{item.name}</strong>{item.description && <p className="mt-2 text-sm text-mist">{item.description}</p>}</button>)}</div></div>;
}

function OriginStep({ catalog, form, setForm }) {
  return <div><PickList title="Escolha uma origem" label="Origem" items={catalog.origins} value={form.originId} onChange={(originId) => setForm({ ...form, originId, origin: '' })} /><label className="mt-6 block text-sm text-mist">Origem personalizada<input className="field mt-2" value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value, originId: '' })} /></label></div>;
}

function AttributePreview({ attributes, selectedRace }) {
  const modifiers = selectedRace?.attribute_modifiers || {};
  return <div><p className="text-sm text-mist">Atributos calculados</p><p className="mt-3 max-w-2xl text-sm text-mist">Todos começam em 2 e são fechados automaticamente pela raça. Nesta etapa você apenas confere o resultado final.</p><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{attributeKeys.map((key) => <div key={key} className="pane p-4 text-center text-sm text-mist"><span>{attributeLabels[key]}</span><div className="tabular mt-2 font-display text-5xl text-bone">{attributes[key]}</div><span className="text-xs text-ember">Base 2 {Number(modifiers[key] || 0) >= 0 ? '+' : ''}{Number(modifiers[key] || 0)}</span></div>)}</div></div>;
}

function Summary({ form, attributes, catalog }) {
  return <div className="space-y-4"><SheetPreview form={form} attributes={attributes} catalog={catalog} expanded /><p className="text-sm text-mist">Perícias e itens são ajustados depois que a ficha for salva, na tela da ficha (ou pelo mestre).</p></div>;
}

function SheetPreview({ form, attributes, catalog }) {
  const race = catalog.races.find((item) => item.id === form.raceId)?.name || 'Raça';
  const klass = catalog.classes.find((item) => item.id === form.classId)?.name || 'Classe';
  const origin = catalog.origins.find((item) => item.id === form.originId)?.name || form.origin || 'Origem';
  const totalDefense = form.defense + form.inventory.reduce((sum, item) => sum + Number(item.defenseBonus || 0), 0);
  return <div>{form.appearance && <div className="mb-3 flex justify-center"><AvatarSprite appearance={form.appearance} scale={4} title={`Aparência de ${form.characterName || 'personagem'}`} /></div>}<h2 className="font-display text-3xl text-bone">{form.characterName || 'Personagem'}</h2><p className="text-sm text-mist">{form.playerName || 'Jogador'} · {origin}</p><p className="mt-1 text-sm text-mist">{race} · {klass}</p><div className="mt-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-3"><Stat label="Vida" value={`${form.lifeCurrent}/${form.lifeMax}`} /><Stat label="Sanidade" value={`${form.sanityCurrent}/${form.sanityMax}`} /><Stat label="Mana" value={`${form.mana}/${form.manaMax || form.mana}`} /></div><div className="mt-3 grid grid-cols-1 gap-3 text-center"><Stat label="Defesa" value={totalDefense} /></div><div className="mt-5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-5">{attributeKeys.map((key) => <Stat key={key} label={attributeLabels[key]} value={attributes[key]} />)}</div><p className="tabular mt-4 text-center text-sm text-mist">Esquiva {15 - attributes.agilidade}</p></div>;
}

function Stat({ label, value }) {
  return <div className="pane p-2"><div className="tabular font-display text-2xl text-bone">{value}</div><div className="text-xs text-mist">{label}</div></div>;
}
