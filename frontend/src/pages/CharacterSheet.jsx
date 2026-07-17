import { Dice5, Edit, Minus, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Button from '../components/Button';
import CharacterSheetMobile from '../components/character-sheet/CharacterSheetMobile';
import CharacterSheetLoading from '../components/character-sheet/CharacterSheetLoading';
import { ResourceStepper } from '../components/character-sheet/ResourceStepper';
import { api } from '../lib/api';
import { calculateResourceAdjustment, normalizeResourcePair } from '../lib/characterVitals';

const attributes = [
  ['forca', 'Força'],
  ['agilidade', 'Agilidade'],
  ['presenca', 'Presença'],
  ['intelecto', 'Intelecto'],
  ['vigor', 'Vigor']
];

const itemCategories = ['Todos os itens', 'Comida', 'Armas', 'Carteira', 'Outros'];
const spellElements = ['Érebo', 'Nix', 'Tártaro', 'Ananque', 'Éter', 'Gaia', 'Caos', 'Hemera', 'Ponto'];
const quickDice = [4, 6, 8, 10, 12, 16, 20];

const blankItem = { quantity: 1, weight: 0, name: '', category: 'Outros', description: '', defenseBonus: 0 };
const blankPower = {
  name: '',
  damage: '',
  criticalValue: 20,
  criticalMultiplier: 2,
  range: '-',
  skill: 'Luta',
  element: 'Érebo',
  image: '',
  manaCost: 0,
  description: ''
};

const editableVitals = {
  life: { current: 'lifeCurrent', max: 'lifeMax', currentColumn: 'life_current', maxColumn: 'life_max' },
  sanity: { current: 'sanityCurrent', max: 'sanityMax', currentColumn: 'sanity_current', maxColumn: 'sanity_max' },
  mana: { current: 'mana', max: 'manaMax', currentColumn: 'mana', maxColumn: 'mana_max' }
};

const referenceConfig = {
  race: { title: 'Trocar raça', endpoint: '/catalog/races', payload: 'raceId', empty: 'Nenhuma raça ativa encontrada.' },
  class: { title: 'Trocar classe', endpoint: '/catalog/classes', payload: 'classId', empty: 'Nenhuma classe ativa encontrada.' },
  origin: { title: 'Trocar origem', endpoint: '/catalog/origins', payload: 'originId', empty: 'Nenhuma origem ativa encontrada.' }
};

function normalizeWalletValues(wallet = {}) {
  return {
    bronze: Math.max(0, Number(wallet?.bronze || 0)),
    silver: Math.max(0, Number(wallet?.silver || 0)),
    platinum: Math.max(0, Number(wallet?.platinum || 0)),
    gold: Math.max(0, Number(wallet?.gold || 0))
  };
}

function formatSaveDate(value) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function makeDraft(data) {
  return {
    lifeCurrent: data.life_current ?? 63,
    lifeMax: data.life_max ?? 63,
    sanityCurrent: data.sanity_current ?? 52,
    sanityMax: data.sanity_max ?? 52,
    mana: data.mana,
    manaMax: data.mana_max ?? data.mana,
    defense: data.defense,
    skills: data.skills || {},
    skillBonuses: data.skill_bonuses || {},
    inventory: data.inventory || [],
    attacks: data.attacks || [],
    spells: data.spells || [],
    wallet: data.wallet || { bronze: 0, silver: 0, platinum: 0, gold: 0 },
    diceSettings: data.dice_settings || { quickRollModifier: 0 }
  };
}

function rollDiceFormula(formula) {
  const match = String(formula || '').trim().toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return { error: 'Fórmula inválida' };
  const quantity = Math.min(20, Math.max(1, Number(match[1])));
  const sides = Math.min(100, Math.max(2, Number(match[2])));
  const bonus = Number(match[3] || 0);
  const rolls = Array.from({ length: quantity }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((sum, value) => sum + value, 0) + bonus;
  return { rolls, bonus, total };
}

export default function CharacterSheet() {
  const { id } = useParams();
  const location = useLocation();
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [d20, setD20] = useState(null);
  const [quickRoll, setQuickRoll] = useState(null);
  const [skillRoll, setSkillRoll] = useState(null);
  const [damageRoll, setDamageRoll] = useState(null);
  const [vitalSaveStatus, setVitalSaveStatus] = useState({});
  const [itemModal, setItemModal] = useState(null);
  const [powerModal, setPowerModal] = useState(null);
  const [referenceModal, setReferenceModal] = useState(null);
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [referenceStatus, setReferenceStatus] = useState('');
  const [creationNotice, setCreationNotice] = useState(location.state?.notice || '');
  const draftRef = useRef(null);
  const sheetRef = useRef(null);
  const persistQueueRef = useRef(Promise.resolve());
  const vitalSaveTimerRef = useRef(null);
  const vitalSaveVersionRef = useRef(0);
  const dirtyVitalTypesRef = useRef(new Set());

  async function load() {
    try {
      const { data } = await api.get(`/characters/${id}`);
      syncSheet(data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!creationNotice) return undefined;
    const timer = setTimeout(() => setCreationNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [creationNotice]);

  useEffect(() => () => {
    clearTimeout(vitalSaveTimerRef.current);
  }, [id]);

  function syncSheet(data) {
    sheetRef.current = data;
    draftRef.current = makeDraft(data);
    setSheet(data);
    setDraft(draftRef.current);
  }

  async function persist(nextDraft, closeEditor = false) {
    const { data } = await api.patch(`/characters/${id}/play`, nextDraft);
    syncSheet(data);
    if (closeEditor) setEditing(false);
  }

  async function persistQueued(nextDraft, callbacks = {}) {
    persistQueueRef.current = persistQueueRef.current
      .catch(() => {})
      .then(async () => {
        const { data } = await api.patch(`/characters/${id}/play`, nextDraft);
        if (draftRef.current === nextDraft) syncSheet(data);
        callbacks.onSuccess?.(data);
      })
      .catch(async (error) => {
        if (draftRef.current === nextDraft) await load();
        callbacks.onError?.(error);
      });
    return persistQueueRef.current;
  }

  function setInteractiveState(nextDraft, sheetPatch) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    const nextSheet = { ...(sheetRef.current || sheet), ...sheetPatch };
    sheetRef.current = nextSheet;
    setSheet(nextSheet);
  }

  async function savePlayChanges() {
    await persist(draft, true);
  }

  function updateVital(type, field, value) {
    const config = editableVitals[type];
    const source = draftRef.current || draft;
    const currentValue = field === 'current' ? value : source[config.current];
    const maxValue = field === 'max' ? value : source[config.max];
    const normalized = normalizeResourcePair(currentValue, maxValue);
    const nextDraft = { ...source, [config.current]: normalized.current, [config.max]: normalized.max };
    setInteractiveState(nextDraft, {
      [config.currentColumn]: normalized.current,
      [config.maxColumn]: normalized.max
    });
    return nextDraft;
  }

  function persistVital(type, immediate = false) {
    dirtyVitalTypesRef.current.add(type);
    clearTimeout(vitalSaveTimerRef.current);
    const version = vitalSaveVersionRef.current + 1;
    vitalSaveVersionRef.current = version;

    const save = async () => {
      const savingTypes = [...dirtyVitalTypesRef.current];
      const nextDraft = draftRef.current || draft;
      setVitalSaveStatus((status) => ({ ...status, ...Object.fromEntries(savingTypes.map((item) => [item, 'Salvando...'])) }));
      await persistQueued(nextDraft, {
        onSuccess: () => {
          if (vitalSaveVersionRef.current === version) {
            dirtyVitalTypesRef.current.clear();
            setVitalSaveStatus((status) => ({ ...status, ...Object.fromEntries(savingTypes.map((item) => [item, 'Salvo'])) }));
          }
        },
        onError: () => {
          if (vitalSaveVersionRef.current === version) {
            setVitalSaveStatus((status) => ({ ...status, ...Object.fromEntries(savingTypes.map((item) => [item, 'Erro ao salvar'])) }));
          }
        }
      });
    };

    if (immediate) save();
    else vitalSaveTimerRef.current = setTimeout(save, 220);
  }

  function adjustVital(type, field, delta) {
    const config = editableVitals[type];
    const source = draftRef.current || draft;
    const adjustment = calculateResourceAdjustment({
      type,
      current: source[config.current],
      max: source[config.max],
      field,
      delta
    });

    if (!adjustment.changed) return;
    updateVital(type, 'current', adjustment.current);
    if (field === 'max') updateVital(type, 'max', adjustment.max);
    setVitalSaveStatus((status) => ({ ...status, [type]: adjustment.currentWasAdjusted ? 'Atual ajustado' : 'Alterado' }));
    persistVital(type);
  }

  function rollSkill(skill, training = 0, other = 0) {
    const die = Math.floor(Math.random() * 20) + 1;
    const base = Number(sheet.attributes?.[skill.attribute] ?? 2);
    const bonus = base + Number(training || 0) + Number(other || 0);
    setSkillRoll({ name: skill.name, die, base, training: Number(training || 0), other: Number(other || 0), bonus, total: die + bonus });
  }

  function rollPower(power, type) {
    const result = rollDiceFormula(power.damage);
    setDamageRoll({ ...result, name: power.name, damage: power.damage, type });
  }

  async function saveItem(payload, itemId = null) {
    const request = itemId
      ? api.put(`/characters/${id}/inventory/${itemId}`, payload)
      : api.post(`/characters/${id}/inventory`, payload);
    const { data } = await request;
    syncSheet(data);
    setItemModal(null);
  }

  async function deleteItem(item) {
    if (!item?.id) return;
    const { data } = await api.delete(`/characters/${id}/inventory/${item.id}`);
    syncSheet(data);
  }

  async function savePower(payload, type, powerId = null) {
    const field = type || payload.type || 'attacks';
    const request = powerId
      ? api.put(`/characters/${id}/powers/${field}/${powerId}`, payload)
      : api.post(`/characters/${id}/powers`, { ...payload, type: field });
    const { data } = await request;
    syncSheet(data);
    setPowerModal(null);
  }

  async function deletePower(type, power) {
    if (!power?.id) return;
    const { data } = await api.delete(`/characters/${id}/powers/${type}/${power.id}`);
    syncSheet(data);
  }

  async function rollSavedPower(power, type) {
    try {
      const { data } = await api.post(`/characters/${id}/powers/roll`, {
        formula: power.damage,
        criticalValue: power.criticalValue ?? 20,
        criticalMultiplier: power.criticalMultiplier ?? 2
      });
      setDamageRoll({ ...data, name: power.name, damage: power.damage, type });
    } catch {
      rollPower(power, type);
    }
  }

  async function updateSkillValue(key, value) {
    const nextValue = Math.max(0, Math.min(15, Math.round(Number(value || 0) / 5) * 5));
    const source = draftRef.current || draft;
    const nextDraft = { ...source, skills: { ...source.skills, [key]: nextValue } };
    setInteractiveState(nextDraft, { skills: { ...(sheetRef.current?.skills || {}), [key]: nextValue } });
    await persistQueued(nextDraft);
  }

  async function updateSkillOther(key, value) {
    const source = draftRef.current || draft;
    const nextValue = Number(value || 0);
    const nextDraft = { ...source, skillBonuses: { ...source.skillBonuses, [key]: nextValue } };
    setInteractiveState(nextDraft, { skill_bonuses: { ...(sheetRef.current?.skill_bonuses || {}), [key]: nextValue } });
    await persistQueued(nextDraft);
  }

  async function saveWallet(walletOrUpdater) {
    const source = draftRef.current || draft;
    const currentWallet = normalizeWalletValues(source.wallet);
    const wallet = normalizeWalletValues(typeof walletOrUpdater === 'function' ? walletOrUpdater(currentWallet) : walletOrUpdater);
    const nextDraft = { ...source, wallet };
    setInteractiveState(nextDraft, { wallet });
    await persistQueued(nextDraft);
  }

  async function openReferenceSwap(warning) {
    const config = referenceConfig[warning.type];
    if (!config) return;
    setReferenceStatus('Carregando opções...');
    setReferenceModal(warning);
    try {
      const { data } = await api.get(config.endpoint);
      setReferenceOptions(data || []);
      setReferenceStatus('');
    } catch {
      setReferenceOptions([]);
      setReferenceStatus('Não foi possível carregar as opções.');
    }
  }

  async function saveReferenceSwap(optionId) {
    const config = referenceConfig[referenceModal?.type];
    if (!config || !optionId) return;
    setReferenceStatus('Salvando troca...');
    try {
      const { data } = await api.patch(`/characters/${id}/references`, { [config.payload]: optionId });
      syncSheet(data);
      setReferenceModal(null);
      setReferenceOptions([]);
      setReferenceStatus('');
    } catch (error) {
      setReferenceStatus(error?.response?.data?.message || 'Não foi possível salvar a troca.');
    }
  }

  async function updateQuickModifier(value) {
    const source = draftRef.current || draft;
    const diceSettings = { ...(source.diceSettings || {}), quickRollModifier: Number(value || 0) };
    const nextDraft = { ...source, diceSettings };
    setInteractiveState(nextDraft, { dice_settings: diceSettings, quick_roll_modifier: diceSettings.quickRollModifier });
    await persistQueued(nextDraft);
  }

  function rollQuickDie(sides) {
    const die = Math.floor(Math.random() * sides) + 1;
    const modifier = Number(draft.diceSettings?.quickRollModifier ?? 0);
    setQuickRoll({ sides, die, modifier, total: die + modifier });
  }

  if (notFound) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-mist"><h1 className="font-display text-4xl text-ember">Ficha não encontrada</h1><p className="mt-3">Ela pode ter sido removida ou pertencer a outro armazenamento local.</p><Link className="mt-6 inline-block text-ember" to="/characters">Voltar para personagens</Link></main>;
  if (!sheet || !draft) return <CharacterSheetLoading />;

  const inventory = editing ? draft.inventory : sheet.inventory || [];
  const attacks = editing ? draft.attacks : sheet.attacks || [];
  const spells = editing ? draft.spells : sheet.spells || [];
  const totalDefense = (editing ? draft.defense : sheet.defense) + inventory.reduce((sum, item) => sum + Number(item.defenseBonus || 0), 0);
  const skillsCatalog = sheet.skills_catalog || [];
  const origin = sheet.origin_name || sheet.origin || 'Sem origem';
  const referenceWarnings = sheet.reference_warnings || [];
  return (
    <main className="min-h-[calc(100vh-64px)] overflow-x-hidden bg-[#050506] pb-24 lg:px-4 lg:py-5">
      {creationNotice && <div className="fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-md border border-emerald-400/30 bg-emerald-950/95 px-4 py-3 text-center text-sm text-emerald-100 shadow-xl" role="status">{creationNotice}</div>}
      <CharacterSheetMobile
        sheet={sheet}
        draft={draft}
        origin={origin}
        totalDefense={totalDefense}
        inventory={inventory}
        attacks={attacks}
        spells={spells}
        vitalStatus={vitalSaveStatus}
        skillRoll={skillRoll}
        damageRoll={damageRoll}
        quickRoll={quickRoll}
        onAdjustVital={adjustVital}
        onRetryVital={(type) => persistVital(type, true)}
        onTrainingChange={updateSkillValue}
        onOtherChange={updateSkillOther}
        onRollSkill={rollSkill}
        onAddPower={(type = 'attacks') => setPowerModal({ mode: 'add', type, power: blankPower })}
        onEditPower={(type, power) => setPowerModal({ mode: 'edit', type, power })}
        onDeletePower={deletePower}
        onRollPower={rollSavedPower}
        onAddItem={() => setItemModal({ mode: 'add', item: blankItem })}
        onEditItem={(item) => setItemModal({ mode: 'edit', item })}
        onDeleteItem={deleteItem}
        onWalletChange={saveWallet}
        onRollQuickDie={rollQuickDie}
        onQuickModifierChange={updateQuickModifier}
        onSwapReference={openReferenceSwap}
      />
      <section data-testid="desktop-character-sheet" className="mx-auto hidden w-full max-w-[1480px] gap-4 rounded-md border border-ember/40 bg-[#101011] p-3 shadow-glow lg:grid xl:grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.35fr)]">
        <aside className="min-w-0 space-y-4">
          <header className="grid gap-3 sm:grid-cols-[96px_1fr]">
            <div className="h-24 overflow-hidden border border-ember/30 bg-black/40">
              {sheet.photo ? <img src={sheet.photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full bg-[radial-gradient(circle,rgba(143,29,44,.38),transparent_58%)]" />}
            </div>
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <InfoBlock label="Personagem" value={sheet.character_name} subLabel="Origem" subValue={origin} />
              <InfoBlock label="Jogador" value={sheet.player_name} subLabel="Classe" subValue={sheet.class_name || 'Sem classe'} />
            </div>
          </header>

          <Panel id="sheet-attributes">
            <h2 className="text-center font-display text-2xl text-white">Atributos</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 min-[520px]:grid-cols-5">
              {attributes.map(([key, label]) => (
                <div key={key} className="rounded-full border-2 border-white/70 bg-white p-2 text-center text-black">
                  <div className="text-3xl font-black">{sheet.attributes?.[key] ?? 2}</div>
                  <div className="text-[10px] font-bold uppercase leading-tight">{label}</div>
                </div>
              ))}
            </div>
          </Panel>

          <section id="sheet-status" className="scroll-mt-24 grid gap-3">
            <ResourceStepper type="life" label="Vida" current={draft.lifeCurrent} max={draft.lifeMax} status={vitalSaveStatus.life} onAdjust={(field, delta) => adjustVital('life', field, delta)} onRetry={() => persistVital('life', true)} />
            <ResourceStepper type="sanity" label="Sanidade" current={draft.sanityCurrent} max={draft.sanityMax} status={vitalSaveStatus.sanity} onAdjust={(field, delta) => adjustVital('sanity', field, delta)} onRetry={() => persistVital('sanity', true)} />
            <ResourceStepper type="mana" label="Mana" current={draft.mana} max={draft.manaMax} status={vitalSaveStatus.mana} onAdjust={(field, delta) => adjustVital('mana', field, delta)} onRetry={() => persistVital('mana', true)} />
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Metric label="Defesa" value={totalDefense} />
            <Metric label="Bloqueio" value="10" />
            <Metric label="Esquiva" value={sheet.dodge} />
          </section>

          <InventoryPanel
            inventory={inventory}
            wallet={draft.wallet || sheet.wallet || { bronze: 0, silver: 0, platinum: 0, gold: 0 }}
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            onAdd={() => setItemModal({ mode: 'add', item: blankItem })}
            onEdit={(item) => setItemModal({ mode: 'edit', item })}
            onDelete={deleteItem}
            onWalletChange={saveWallet}
          />

          <QuickDicePanel
            modifier={draft.diceSettings?.quickRollModifier ?? 0}
            roll={quickRoll}
            onRoll={rollQuickDie}
            onModifierChange={updateQuickModifier}
          />
        </aside>

        <section className="min-w-0 space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-ember">Ficha de jogo</h2>
              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <Link to={`/characters/${sheet.id}/edit`}><Button variant="ghost" className="w-full sm:w-auto"><Edit size={16} className="inline" /> Base</Button></Link>
                {editing ? (
                  <>
                    <Button variant="ghost" className="w-full sm:w-auto" onClick={() => { setDraft(makeDraft(sheet)); setEditing(false); }}><X size={16} /> Cancelar</Button>
                    <Button className="w-full sm:w-auto" onClick={savePlayChanges}><Save size={16} className="inline" /> Salvar</Button>
                  </>
                ) : <Button className="w-full sm:w-auto" onClick={() => setEditing(true)}>Modificar</Button>}
              </div>
            </div>
          </Panel>

          <ReferenceWarnings warnings={referenceWarnings} onSwap={openReferenceSwap} />

          <PowersPanel
            attacks={attacks}
            spells={spells}
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            onRoll={rollSavedPower}
            onAdd={(type = 'attacks') => setPowerModal({ mode: 'add', type, power: blankPower })}
            onEdit={(type, power) => setPowerModal({ mode: 'edit', type, power })}
            onDelete={deletePower}
            roll={damageRoll}
          />

          <Panel id="sheet-skills">
            <h2 className="font-display text-2xl text-ember">Perícias</h2>
            {editing && <PlayEditor draft={draft} setDraft={setDraft} skillsCatalog={skillsCatalog} onRoll={rollSkill} roll={skillRoll} />}
            {!editing && <SkillTable sheet={sheet} skills={sheet.skills || {}} skillBonuses={sheet.skill_bonuses || {}} skillsCatalog={skillsCatalog} onTrainingChange={updateSkillValue} onOtherChange={updateSkillOther} onRoll={rollSkill} roll={skillRoll} />}
          </Panel>

          <SaveHistory saves={sheet.save_history || []} />
        </section>
      </section>
      {itemModal && (
        <ItemModal
          state={itemModal}
          onClose={() => setItemModal(null)}
          onSave={(payload) => saveItem(payload, itemModal.item?.id)}
        />
      )}
      {powerModal && (
        <PowerModal
          state={powerModal}
          skillsCatalog={skillsCatalog}
          onClose={() => setPowerModal(null)}
          onSave={(payload, type) => savePower(payload, type, powerModal.power?.id)}
        />
      )}
      {referenceModal && (
        <ReferenceSwapModal
          warning={referenceModal}
          options={referenceOptions}
          status={referenceStatus}
          onClose={() => { setReferenceModal(null); setReferenceOptions([]); setReferenceStatus(''); }}
          onSave={saveReferenceSwap}
        />
      )}
    </main>
  );
}

function PlayEditor({ draft, setDraft, skillsCatalog, onRoll, roll }) {
  const rows = useMemo(() => skillsCatalog.map((skill) => ({ ...skill, value: draft.skills?.[skill.key] ?? 0 })), [draft.skills, skillsCatalog]);

  function updateSkill(key, value) {
    const rounded = Math.round(Number(value || 0) / 5) * 5;
    const next = Math.max(0, Math.min(15, rounded));
    setDraft({ ...draft, skills: { ...draft.skills, [key]: next } });
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Vida atual" value={draft.lifeCurrent} onChange={(lifeCurrent) => setDraft({ ...draft, lifeCurrent })} />
        <NumberField label="Vida máxima" value={draft.lifeMax} onChange={(lifeMax) => setDraft({ ...draft, lifeMax })} />
        <NumberField label="Sanidade atual" value={draft.sanityCurrent} onChange={(sanityCurrent) => setDraft({ ...draft, sanityCurrent })} />
        <NumberField label="Sanidade máxima" value={draft.sanityMax} onChange={(sanityMax) => setDraft({ ...draft, sanityMax })} />
        <NumberField label="Mana atual" value={draft.mana} onChange={(mana) => setDraft({ ...draft, mana })} />
        <NumberField label="Mana máxima" value={draft.manaMax} onChange={(manaMax) => setDraft({ ...draft, manaMax })} />
        <NumberField label="Defesa base" value={draft.defense} onChange={(defense) => setDraft({ ...draft, defense })} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((skill) => (
          <div key={skill.key} className="grid grid-cols-[minmax(0,1fr)_72px_36px] items-center gap-2 border-b border-white/10 pb-2 text-sm">
            <span className="truncate text-white">{skill.name}</span>
            <input type="number" min="0" max="15" step="5" className="rounded border border-ember/20 bg-black/30 px-2 py-1 text-center" value={skill.value} onChange={(event) => updateSkill(skill.key, event.target.value)} />
            <button type="button" className="grid h-8 w-8 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skill.value)}><Dice5 size={16} /></button>
          </div>
        ))}
      </div>
      <RollFeedback roll={roll} />
    </div>
  );
}

function InventoryPanel({ inventory, wallet, editing, draft, setDraft, onAdd, onEdit, onDelete, onWalletChange }) {
  const [item, setItem] = useState(blankItem);
  const [activeTab, setActiveTab] = useState('Todos os itens');
  const visibleInventory = activeTab === 'Todos os itens' ? inventory : inventory.filter((item) => (item.category || 'Outros') === activeTab);

  function updateItem(index, key, value) {
    const next = draft.inventory.map((current, itemIndex) => itemIndex === index ? { ...current, [key]: value } : current);
    setDraft({ ...draft, inventory: next });
  }

  function removeItem(index) {
    setDraft({ ...draft, inventory: draft.inventory.filter((_, itemIndex) => itemIndex !== index) });
  }

  function addItem() {
    if (!item.name.trim()) return;
    setDraft({ ...draft, inventory: [...draft.inventory, { ...item, id: crypto.randomUUID?.() || `${Date.now()}` }] });
    setItem(blankItem);
  }

  return (
    <Panel id="sheet-inventory">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl text-ember">Inventário</h2>
        <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onAdd}><Plus size={16} className="inline" /> Adicionar Item</Button>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {itemCategories.map((category) => (
          <button key={category} type="button" className={`min-h-10 shrink-0 rounded border px-3 py-2 text-xs uppercase tracking-[.12em] soft-motion ${activeTab === category ? 'border-ember bg-ember/20 text-white' : 'border-white/10 bg-black/20 text-mist hover:text-white'}`} onClick={() => setActiveTab(category)}>
            {category}
          </button>
        ))}
      </div>
      {activeTab === 'Carteira' && <WalletPanel wallet={wallet} onChange={onWalletChange} />}
      {inventory.length > 0 && (
        <p className="mt-2 text-xs uppercase tracking-[.18em] text-mist">
          Peso total {inventory.reduce((sum, current) => sum + Number(current.weight || 0) * Number(current.quantity ?? 1), 0).toFixed(1)}
        </p>
      )}
      {!editing && (
        <ul className="mt-3 space-y-2 text-sm text-mist">
          {visibleInventory.length ? visibleInventory.map((item, index) => (
            <li key={item.id || `${item.name}-${index}`} className="rounded border border-white/10 bg-black/25 px-3 py-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <span className="break-words text-white">{Number(item.quantity ?? 1)}x {item.name}</span>
                  <span className="ml-2 text-xs text-mist">peso {Number(item.weight || 0)}</span>
                  <span className="ml-2 rounded border border-ember/20 px-2 py-0.5 text-[11px] text-ember">{item.category || 'Outros'}</span>
                  {item.description && <p className="mt-1 text-xs text-mist">{item.description}</p>}
                </div>
                <Button type="button" variant="ghost" className="min-h-11 justify-center" onClick={() => onEdit(item)}><Edit size={16} className="inline" /> Editar</Button>
                <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-red-400/30 px-3 text-red-300 soft-motion hover:bg-red-950/30" onClick={() => onDelete(item)} aria-label="Excluir item"><Trash2 size={16} /> Excluir</button>
              </div>
            </li>
          )) : <li className="text-mist">{activeTab === 'Carteira' ? 'Nenhum item marcado como Carteira.' : 'Inventário vazio.'}</li>}
        </ul>
      )}
      {editing && (
        <div className="mt-4 space-y-3">
          {draft.inventory.map((current, index) => (
            <div key={current.id || `${current.name}-${index}`} className="rounded border border-white/10 bg-black/25 p-3">
              <div className="grid gap-2 sm:grid-cols-[90px_90px_1fr_120px_36px]">
                <NumberInput placeholder="Quantidade" value={current.quantity ?? 1} onChange={(value) => updateItem(index, 'quantity', value)} />
                <NumberInput placeholder="Peso" value={current.weight ?? 0} onChange={(value) => updateItem(index, 'weight', value)} />
                <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={current.name || ''} onChange={(event) => updateItem(index, 'name', event.target.value)} />
                <select className="rounded border border-ember/20 bg-black/30 px-3 py-2" value={current.category || 'Outros'} onChange={(event) => updateItem(index, 'category', event.target.value)}>
                  {itemCategories.filter((category) => category !== 'Todos os itens').map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <button type="button" className="grid h-10 place-items-center rounded border border-red-400/30 text-red-300" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
              </div>
              <textarea placeholder="Descrição" className="mt-2 w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={current.description || ''} onChange={(event) => updateItem(index, 'description', event.target.value)} />
            </div>
          ))}
          <div className="rounded border border-ember/20 bg-black/20 p-3">
            <div className="grid gap-2 sm:grid-cols-[90px_90px_1fr_120px_auto]">
              <NumberInput placeholder="Quantidade" value={item.quantity} onChange={(quantity) => setItem({ ...item, quantity })} />
              <NumberInput placeholder="Peso" value={item.weight} onChange={(weight) => setItem({ ...item, weight })} />
              <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={item.name} onChange={(event) => setItem({ ...item, name: event.target.value })} />
              <select className="rounded border border-ember/20 bg-black/30 px-3 py-2" value={item.category} onChange={(event) => setItem({ ...item, category: event.target.value })}>
                {itemCategories.filter((category) => category !== 'Todos os itens').map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <Button type="button" variant="ghost" onClick={addItem}><Plus size={16} /></Button>
            </div>
            <textarea placeholder="Descrição" className="mt-2 w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={item.description} onChange={(event) => setItem({ ...item, description: event.target.value })} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function WalletPanel({ wallet, onChange }) {
  const values = normalizeWalletValues(wallet);
  const total = values.bronze + values.silver * 10 + values.platinum * 100 + values.gold * 500;

  function update(key, value) {
    onChange((current) => ({ ...current, [key]: Math.max(0, Number(value || 0)) }));
  }

  function adjust(key, direction) {
    onChange((current) => ({ ...current, [key]: Math.max(0, Number(current[key] || 0) + direction) }));
  }

  return (
    <section className="mt-3 rounded border border-ember/20 bg-black/25 p-3">
      <h3 className="font-display text-xl text-white">Carteira</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CoinField label="Bronze" rate={1} value={values.bronze} onChange={(value) => update('bronze', value)} onDecrease={() => adjust('bronze', -1)} onIncrease={() => adjust('bronze', 1)} />
        <CoinField label="Prata" rate={10} value={values.silver} onChange={(value) => update('silver', value)} onDecrease={() => adjust('silver', -1)} onIncrease={() => adjust('silver', 1)} />
        <CoinField label="Platina" rate={100} value={values.platinum} onChange={(value) => update('platinum', value)} onDecrease={() => adjust('platinum', -1)} onIncrease={() => adjust('platinum', 1)} />
        <CoinField label="Ouro" rate={500} value={values.gold} onChange={(value) => update('gold', value)} onDecrease={() => adjust('gold', -1)} onIncrease={() => adjust('gold', 1)} />
      </div>
      <div className="mt-3 rounded border border-white/10 bg-black/30 p-3 text-center">
        <p className="text-xs uppercase tracking-[.18em] text-mist">Total</p>
        <p className="text-2xl font-black text-white">{total} Dracmas</p>
      </div>
    </section>
  );
}

function CoinField({ label, rate, value, onChange, onDecrease, onIncrease }) {
  return (
    <div className="text-sm text-mist">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="text-xs text-ember">= {rate} Dracmas</span>
      </div>
      <div className="grid grid-cols-[40px_1fr_40px] overflow-hidden rounded border border-ember/20 bg-black/30">
        <button type="button" className="grid h-10 place-items-center border-r border-white/10 text-mist soft-motion hover:bg-white/10 hover:text-white" onClick={onDecrease} aria-label={`Diminuir ${label}`}>
          <Minus size={16} />
        </button>
        <NumberInput className="h-10 w-full rounded-none border-0 bg-transparent text-center" value={value} onChange={onChange} />
        <button type="button" className="grid h-10 place-items-center border-l border-white/10 text-mist soft-motion hover:bg-white/10 hover:text-white" onClick={onIncrease} aria-label={`Aumentar ${label}`}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function QuickDicePanel({ modifier, roll, onRoll, onModifierChange }) {
  return (
    <Panel id="sheet-dice">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ember">Role Dados Fácil</h2>
          <p className="text-sm text-mist">Rolagens rápidas com soma modificadora.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-mist">
          Soma
          <NumberInput className="w-24" value={modifier} onChange={onModifierChange} allowNegative />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {quickDice.map((sides) => (
          <button key={sides} type="button" className="rounded border border-ember/25 bg-black/30 px-2 py-3 text-center soft-motion hover:bg-ember/10" onClick={() => onRoll(sides)}>
            <span className="block font-bold text-white">Role</span>
            <span className="text-xs uppercase tracking-[.18em] text-ember">d{sides}</span>
          </button>
        ))}
      </div>
      {roll && (
        <div className="mt-4 rounded border border-ember/20 bg-black/35 p-3 text-sm">
          <p className="font-display text-xl text-ember">d{roll.sides}</p>
          <p className="text-mist">Dado {roll.die} {roll.modifier ? `· Soma ${roll.modifier > 0 ? '+' : ''}${roll.modifier}` : '· Soma 0'}</p>
          <p className="mt-1 text-3xl font-black text-white">{roll.total}</p>
        </div>
      )}
    </Panel>
  );
}

function PowersPanel({ attacks, spells, editing, draft, setDraft, onRoll, onAdd, onEdit, onDelete, roll }) {
  return (
    <Panel id="sheet-powers">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-3xl text-ember">Poderes e Ataques</h2>
          <p className="mt-1 text-sm text-mist">Ataques e magias organizados para consulta rápida durante a sessão.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:shrink-0">
          <Link to="/powers"><Button type="button" className="min-h-11 w-full justify-center sm:w-auto">Biblioteca</Button></Link>
          <Button type="button" variant="ghost" className="min-h-11 justify-center" onClick={() => onAdd('attacks')}><Plus size={16} className="inline" /> Adicionar Ataque</Button>
          <Button type="button" variant="ghost" className="min-h-11 justify-center" onClick={() => onAdd('spells')}><Plus size={16} className="inline" /> Adicionar Magia</Button>
        </div>
      </div>
      <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">
        <PowerList title="Ataques Normais" field="attacks" items={attacks} editing={editing} draft={draft} setDraft={setDraft} onRoll={(power) => onRoll(power, 'Ataque')} onEdit={(power) => onEdit('attacks', power)} onDelete={(power) => onDelete('attacks', power)} />
        <PowerList title="Magias" field="spells" items={spells} editing={editing} draft={draft} setDraft={setDraft} onRoll={(power) => onRoll(power, 'Magia')} onEdit={(power) => onEdit('spells', power)} onDelete={(power) => onDelete('spells', power)} />
      </div>
      <DamageFeedback roll={roll} />
    </Panel>
  );
}

function PowerList({ title, field, items, editing, draft, setDraft, onRoll, onEdit, onDelete }) {
  const [power, setPower] = useState(blankPower);

  function updatePower(index, key, value) {
    const next = draft[field].map((current, powerIndex) => powerIndex === index ? { ...current, [key]: value } : current);
    setDraft({ ...draft, [field]: next });
  }

  function removePower(index) {
    setDraft({ ...draft, [field]: draft[field].filter((_, powerIndex) => powerIndex !== index) });
  }

  function addPower() {
    if (!power.name.trim() || !power.damage.trim()) return;
    setDraft({ ...draft, [field]: [...draft[field], { ...power, id: crypto.randomUUID?.() || `${Date.now()}` }] });
    setPower(blankPower);
  }

  return (
    <section className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl text-white">{title}</h3>
        <span className="rounded-full border border-ember/20 bg-ember/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-ember">{items.length}</span>
      </div>
      <div className="mt-4 grid gap-3">
        {items.length ? items.map((item, index) => (
          <PowerCard key={item.id || `${item.name}-${index}`} item={item} field={field} editing={editing} index={index} onRoll={onRoll} onEdit={onEdit} onDelete={onDelete} onUpdate={updatePower} onRemove={removePower} />
        )) : <p className="rounded-md border border-dashed border-white/10 bg-black/25 p-4 text-sm text-mist">Nenhum registro.</p>}
      </div>
      {editing && (
        <div className="mt-4 rounded-md border border-ember/20 bg-black/20 p-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-ember">Adicionar rápido</p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px_auto]">
            <input placeholder="Nome" className="min-w-0 rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={power.name} onChange={(event) => setPower({ ...power, name: event.target.value })} />
            <input placeholder="Dano" className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={power.damage} onChange={(event) => setPower({ ...power, damage: event.target.value })} />
            <NumberInput placeholder="Mana" value={power.manaCost} onChange={(manaCost) => setPower({ ...power, manaCost: field === 'spells' ? manaCost : 0 })} />
            <Button type="button" variant="ghost" className="min-h-11" onClick={addPower}><Plus size={16} className="inline" /> Adicionar</Button>
          </div>
          <textarea placeholder="Descrição" className="mt-2 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-3 text-sm" value={power.description} onChange={(event) => setPower({ ...power, description: event.target.value })} />
        </div>
      )}
    </section>
  );
}

function PowerCard({ item, field, editing, index, onRoll, onEdit, onDelete, onUpdate, onRemove }) {
  const isSpell = field === 'spells';
  const chips = isSpell
    ? [
        ['Elemento', item.element || 'Érebo'],
        ['Mana', Number(item.manaCost || 0)],
        ['Crítico', `${item.criticalValue || 20}+`],
        ['Multiplicador', `x${item.criticalMultiplier || 2}`]
      ]
    : [
        ['Perícia', item.skill || 'Luta'],
        ['Alcance', item.range || '-'],
        ['Crítico', `${item.criticalValue || 20}+`],
        ['Multiplicador', `x${item.criticalMultiplier || 2}`]
      ];

  return (
    <article className="min-w-0 rounded-md border border-white/10 bg-[linear-gradient(135deg,rgba(214,166,95,.08),rgba(0,0,0,.18))] p-3 shadow-lg shadow-black/20 sm:p-4">
      {!editing ? (
        <div className="flex h-full flex-col gap-4">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-ember/25 bg-[radial-gradient(circle,rgba(142,92,246,.25),transparent_62%)] text-sm font-bold uppercase text-ember">
                {item.image ? <img src={item.image} alt={`Imagem de ${item.name}`} className="h-full w-full object-cover" /> : (isSpell ? String(item.element || 'Ér').slice(0, 2) : 'AT')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-ember/80">{isSpell ? 'Magia' : 'Ataque Normal'}</p>
                <h4 className="mt-1 break-words font-display text-2xl leading-tight text-white">{item.name}</h4>
              </div>
              <div className="shrink-0 rounded-md border border-ember/20 bg-black/35 px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-mist">Dano</p>
                <p className="break-all font-semibold text-ember">{item.damage || '-'}</p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            {chips.map(([label, value]) => <PowerChip key={label} label={label} value={value} />)}
          </div>

          {item.description ? (
            <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm leading-relaxed text-mist">{item.description}</p>
          ) : null}

          <div className="mt-auto grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="ghost" className="min-h-11 justify-center" onClick={() => onRoll(item)}><Dice5 size={16} className="inline" /> Rolar</Button>
            <Button type="button" variant="ghost" className="min-h-11 justify-center" onClick={() => onEdit(item)}><Edit size={16} className="inline" /> Editar</Button>
            <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 px-4 py-2 font-semibold text-red-300 soft-motion hover:bg-red-950/30" onClick={() => onDelete(item)}>
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_100px_auto]">
            <input placeholder="Nome" className="min-w-0 rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.name || ''} onChange={(event) => onUpdate(index, 'name', event.target.value)} />
            <input placeholder="Dano" className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.damage || ''} onChange={(event) => onUpdate(index, 'damage', event.target.value)} />
            <NumberInput placeholder="Mana" value={item.manaCost ?? 0} onChange={(value) => onUpdate(index, 'manaCost', isSpell ? value : 0)} />
            <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 px-3 py-2 text-red-300" onClick={() => onRemove(index)}><Trash2 size={16} /> Remover</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {!isSpell ? (
              <>
                <input placeholder="Perícia" className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.skill || ''} onChange={(event) => onUpdate(index, 'skill', event.target.value)} />
                <input placeholder="Alcance" className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.range || ''} onChange={(event) => onUpdate(index, 'range', event.target.value)} />
              </>
            ) : (
              <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.element || 'Érebo'} onChange={(event) => onUpdate(index, 'element', event.target.value)}>
                {spellElements.map((element) => <option key={element} value={element}>{element}</option>)}
              </select>
            )}
            <input placeholder="Imagem" className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.image || ''} onChange={(event) => onUpdate(index, 'image', event.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <NumberInput placeholder="Crítico" value={item.criticalValue ?? 20} onChange={(value) => onUpdate(index, 'criticalValue', value)} />
            <NumberInput placeholder="Multiplicador" value={item.criticalMultiplier ?? 2} onChange={(value) => onUpdate(index, 'criticalMultiplier', value)} />
          </div>
          <textarea placeholder="Descrição" className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-3 text-sm" value={item.description || ''} onChange={(event) => onUpdate(index, 'description', event.target.value)} />
        </div>
      )}
    </article>
  );
}

function PowerChip({ label, value }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/30 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-mist">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-white">{value || '-'}</p>
    </div>
  );
}

function ReferenceWarnings({ warnings, onSwap }) {
  if (!warnings?.length) return null;
  return (
    <div className="grid gap-3">
      {warnings.map((warning) => (
        <article key={warning.type} className="rounded-md border border-amber-400/30 bg-amber-950/15 p-4">
          <p className="text-sm font-semibold text-amber-100">{warning.message}</p>
          <p className="mt-1 text-xs uppercase tracking-[.16em] text-mist">Atual: {warning.current_name || 'Registro removido'}</p>
          <Button type="button" className="mt-3 min-h-11 w-full sm:w-auto" onClick={() => onSwap(warning)}>
            Trocar agora
          </Button>
        </article>
      ))}
    </div>
  );
}

function ReferenceSwapModal({ warning, options, status, onClose, onSave }) {
  const [selected, setSelected] = useState('');
  const config = referenceConfig[warning.type] || {};

  useEffect(() => {
    setSelected(options[0]?.id || '');
  }, [options]);

  return (
    <ModalFrame title={config.title || 'Trocar referencia'} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-mist">
          Escolha uma opção ativa para substituir {warning.current_name || 'o registro removido'}.
        </p>
        <label className="block text-sm text-mist">
          Nova opção
          <select className="mt-1 min-h-11 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={selected} onChange={(event) => setSelected(event.target.value)} disabled={!options.length}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        {!options.length && <p className="rounded border border-ember/20 bg-black/30 p-3 text-sm text-mist">{status || config.empty || 'Nenhuma opção ativa encontrada.'}</p>}
        {status && options.length > 0 && <p className="text-sm text-mist">{status}</p>}
        <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={!selected || status === 'Salvando troca...'} onClick={() => onSave(selected)}>
            {status === 'Salvando troca...' ? 'Salvando...' : 'Salvar troca'}
          </Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ItemModal({ state, onClose, onSave }) {
  const [form, setForm] = useState({ ...blankItem, ...(state.item || {}) });
  const canSave = String(form.name || '').trim().length > 0;

  return (
    <ModalFrame title={state.mode === 'edit' ? 'Editar item' : 'Adicionar item'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(form); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Quantidade" value={form.quantity ?? 1} onChange={(quantity) => setForm({ ...form, quantity })} />
          <NumberField label="Peso" value={form.weight ?? 0} onChange={(weight) => setForm({ ...form, weight })} />
        </div>
        <label className="block text-sm text-mist">
          Nome do item
          <input className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
        </label>
        <label className="block text-sm text-mist">
          Categoria
          <select className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.category || 'Outros'} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {itemCategories.filter((category) => category !== 'Todos os itens').map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="block text-sm text-mist">
          Descrição opcional
          <textarea className="mt-1 min-h-24 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canSave}>Salvar</Button>
        </div>
      </form>
    </ModalFrame>
  );
}

function PowerModal({ state, skillsCatalog, onClose, onSave }) {
  const [type, setType] = useState(state.type || 'attacks');
  const [form, setForm] = useState({ ...blankPower, ...(state.power || {}) });
  const canSave = String(form.name || '').trim().length > 0 && String(form.damage || '').trim().length > 0;

  return (
    <ModalFrame title={state.mode === 'edit' ? 'Editar poder' : 'Adicionar poder'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (canSave) onSave({ ...form, manaCost: type === 'spells' ? Number(form.manaCost || 0) : 0 }, type); }}>
        <label className="block text-sm text-mist">
          Tipo
          <select className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="attacks">Ataque Normal</option>
            <option value="spells">Magia</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-mist">
            Nome
            <input className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
          </label>
          <label className="block text-sm text-mist">
            {type === 'spells' ? 'Dano ou efeito' : 'Dano'}
            <input className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" placeholder="1d8+2" value={form.damage || ''} onChange={(event) => setForm({ ...form, damage: event.target.value })} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Crítico" value={form.criticalValue ?? 20} onChange={(criticalValue) => setForm({ ...form, criticalValue })} />
          <NumberField label="Multiplicador" value={form.criticalMultiplier ?? 2} onChange={(criticalMultiplier) => setForm({ ...form, criticalMultiplier })} />
          {type === 'attacks' && (
            <label className="block text-sm text-mist">
              Alcance
              <input className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.range || '-'} onChange={(event) => setForm({ ...form, range: event.target.value })} />
            </label>
          )}
          {type === 'spells' && <NumberField label="Custo de mana" value={form.manaCost ?? 0} onChange={(manaCost) => setForm({ ...form, manaCost })} />}
        </div>
        {type === 'attacks' && (
          <label className="block text-sm text-mist">
            Perícia
            <select className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.skill || 'Luta'} onChange={(event) => setForm({ ...form, skill: event.target.value })}>
              {skillsCatalog.map((skill) => <option key={skill.key} value={skill.name}>{skill.name}</option>)}
            </select>
          </label>
        )}
        {type === 'spells' && (
          <label className="block text-sm text-mist">
            Elemento
            <select className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.element || 'Érebo'} onChange={(event) => setForm({ ...form, element: event.target.value })}>
              {spellElements.map((element) => <option key={element} value={element}>{element}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm text-mist">
          Imagem opcional
          <input className="mt-1 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" placeholder="URL ou data:image" value={form.image || ''} onChange={(event) => setForm({ ...form, image: event.target.value })} />
        </label>
        <label className="block text-sm text-mist">
          Descrição opcional
          <textarea className="mt-1 min-h-24 w-full rounded border border-ember/20 bg-black/40 px-3 py-2 text-white" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-11 w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canSave}>Salvar</Button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ModalFrame({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-md border border-ember/30 bg-[#0b0b0d] p-4 shadow-glow sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ember">{title}</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded border border-white/15 text-mist soft-motion hover:bg-white/10" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function SkillTable({ sheet, skills, skillBonuses, skillsCatalog, onTrainingChange, onOtherChange, onRoll, roll }) {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:hidden">
        {skillsCatalog.map((skill) => (
          <article key={skill.key} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-white">{skill.name}</h3>
                <p className="text-xs uppercase tracking-[.14em] text-ember">Dado ({sheet.attributes?.[skill.attribute] ?? 2})</p>
              </div>
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skills?.[skill.key] ?? 0, skillBonuses?.[skill.key] ?? 0)}><Dice5 size={17} /></button>
            </div>
            <div className="mt-3 grid gap-2">
              <label className="text-xs uppercase tracking-[.12em] text-mist">
                Treino
                <div className="mt-1 grid grid-cols-[44px_1fr_44px] items-center rounded border border-white/10 bg-black/25">
                  <button type="button" className="h-11 text-mist hover:text-white" onClick={() => onTrainingChange(skill.key, Number(skills?.[skill.key] || 0) - 5)}>-</button>
                  <span className="text-center text-blue-400">{skills?.[skill.key] ?? 0}</span>
                  <button type="button" className="h-11 text-mist hover:text-white" onClick={() => onTrainingChange(skill.key, Number(skills?.[skill.key] || 0) + 5)}>+</button>
                </div>
              </label>
              <label className="text-xs uppercase tracking-[.12em] text-mist">
                Outros
                <input type="number" className="mt-1 h-11 w-full rounded border border-white/10 bg-black/25 px-2 text-center text-mist" value={skillBonuses?.[skill.key] ?? 0} onChange={(event) => onOtherChange(skill.key, event.target.value)} />
              </label>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 hidden overflow-x-auto pb-2 sm:block">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[minmax(120px,1fr)_52px_116px_64px_44px] gap-x-2 text-xs uppercase text-mist sm:grid-cols-[1fr_64px_132px_72px_44px] sm:gap-x-3">
            <span>Perícia</span><span>Dado</span><span>Treino</span><span>Outros</span><span>Rolar</span>
          </div>
          <div className="mt-2 grid gap-x-5 2xl:grid-cols-2">
            {skillsCatalog.map((skill) => (
              <div key={skill.key} className="grid grid-cols-[minmax(120px,1fr)_52px_116px_64px_44px] items-center gap-x-2 border-b border-white/10 py-2 text-sm sm:grid-cols-[1fr_64px_132px_72px_44px] sm:gap-x-3">
                <span className="truncate text-white">{skill.name}</span>
                <span className="text-ember">({sheet.attributes?.[skill.attribute] ?? 2})</span>
                <div className="grid grid-cols-[40px_1fr_40px] items-center rounded border border-white/10 bg-black/25">
                  <button type="button" className="h-10 text-mist hover:text-white" onClick={() => onTrainingChange(skill.key, Number(skills?.[skill.key] || 0) - 5)}>-</button>
                  <span className="text-center text-blue-400">{skills?.[skill.key] ?? 0}</span>
                  <button type="button" className="h-10 text-mist hover:text-white" onClick={() => onTrainingChange(skill.key, Number(skills?.[skill.key] || 0) + 5)}>+</button>
                </div>
                <input type="number" className="h-10 w-full rounded border border-white/10 bg-black/25 px-2 text-center text-mist" value={skillBonuses?.[skill.key] ?? 0} onChange={(event) => onOtherChange(skill.key, event.target.value)} />
                <button type="button" className="grid h-10 w-10 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skills?.[skill.key] ?? 0, skillBonuses?.[skill.key] ?? 0)}><Dice5 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RollFeedback roll={roll} />
    </>
  );
}

function RollFeedback({ roll }) {
  if (!roll) return null;
  return (
    <div className="mt-4 rounded-md border border-ember/30 bg-black/35 p-4">
      <p className="font-display text-xl text-ember">{roll.name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5">
        <Metric label="D20" value={roll.die} />
        <Metric label="Base" value={roll.base ?? 0} />
        <Metric label="Treino" value={roll.training ?? roll.bonus ?? 0} />
        <Metric label="Outros" value={roll.other ?? 0} />
        <Metric label="Resultado" value={roll.total} />
      </div>
    </div>
  );
}

function DamageFeedback({ roll }) {
  if (!roll) return null;
  if (roll.error) return <p className="mt-4 rounded border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">{roll.name}: {roll.error}</p>;
  return (
    <div className="mt-4 rounded-md border border-ember/30 bg-black/35 p-4">
      <p className="font-display text-xl text-ember">{roll.type}: {roll.name}</p>
      <p className="text-sm text-mist">{roll.damage} · rolagens {roll.rolls.join(', ')} {roll.bonus ? `· bônus ${roll.bonus > 0 ? '+' : ''}${roll.bonus}` : ''}</p>
      {'attackRoll' in roll && <p className="mt-1 text-sm text-mist">Ataque d20: {roll.attackRoll} · crítico {roll.criticalValue}+ · multiplicador x{roll.criticalMultiplier} · {roll.isCritical ? 'Crítico' : 'Normal'}</p>}
      {roll.isCritical && <p className="mt-1 text-sm text-ember">Base {roll.baseTotal} multiplicado por {roll.criticalMultiplier}</p>}
      <div className="mt-2 text-center text-4xl font-black text-white">{roll.total}</div>
    </div>
  );
}

function SaveHistory({ saves }) {
  return (
    <Panel id="sheet-saves">
      <h3 className="font-display text-xl text-ember">Últimos salvamentos</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {saves.length ? saves.map((save) => (
          <div key={save.id || save.saved_at} className="rounded border border-ember/15 bg-black/25 p-3 text-sm">
            <p className="text-white">{formatSaveDate(save.saved_at)}</p>
            <p className="mt-1 text-xs uppercase tracking-[.18em] text-mist">{save.label || 'Snapshot'}</p>
          </div>
        )) : <p className="text-sm text-mist">Nenhum salvamento registrado.</p>}
      </div>
    </Panel>
  );
}

function InfoBlock({ label, value, subLabel, subValue }) {
  return <div className="space-y-2 text-sm"><div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-xs font-bold uppercase text-mist">{label}</span><span className="min-w-0 border-b border-white/50 pb-1 text-white">{value}</span></div><div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-xs font-bold uppercase text-mist">{subLabel}</span><span className="min-w-0 border-b border-white/50 pb-1 text-white">{subValue}</span></div></div>;
}

function NumberField({ label, value, onChange }) {
  return <label className="text-sm text-mist">{label}<NumberInput className="mt-1 w-full" value={value} onChange={onChange} /></label>;
}

function NumberInput({ value, onChange, placeholder, className = '', allowNegative = false }) {
  return <input type="number" min={allowNegative ? undefined : '0'} placeholder={placeholder} className={`min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2 ${className}`} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

function Panel({ children, id }) {
  return <section id={id} className="scroll-mt-24 rounded-md border border-white/10 bg-black/20 p-3 sm:p-4">{children}</section>;
}

function Metric({ label, value }) {
  return <div className="border border-white/20 bg-black/25 p-3 text-center"><div className="text-3xl font-black">{value}</div><div className="text-xs uppercase text-mist">{label}</div></div>;
}
