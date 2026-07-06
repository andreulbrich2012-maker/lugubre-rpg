import { ChevronLeft, ChevronRight, Dice5, Edit, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/Button';
import { api } from '../lib/api';

const attributes = [
  ['forca', 'Força'],
  ['agilidade', 'Agilidade'],
  ['presenca', 'Presença'],
  ['intelecto', 'Intelecto'],
  ['vigor', 'Vigor']
];

const blankItem = { quantity: 1, weight: 0, name: '', description: '', defenseBonus: 0 };
const blankPower = { name: '', damage: '', description: '' };

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
    inventory: data.inventory || [],
    attacks: data.attacks || [],
    spells: data.spells || []
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
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [d20, setD20] = useState(null);
  const [skillRoll, setSkillRoll] = useState(null);
  const [damageRoll, setDamageRoll] = useState(null);

  async function load() {
    try {
      const { data } = await api.get(`/characters/${id}`);
      setSheet(data);
      setDraft(makeDraft(data));
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function persist(nextDraft, closeEditor = false) {
    const { data } = await api.patch(`/characters/${id}/play`, nextDraft);
    setSheet(data);
    setDraft(makeDraft(data));
    if (closeEditor) setEditing(false);
  }

  async function savePlayChanges() {
    await persist(draft, true);
  }

  async function adjustVital(field, direction, event) {
    const step = event.shiftKey ? 5 : 1;
    const nextValue = Math.max(0, Number(draft[field] ?? 0) + direction * step);
    const nextDraft = { ...draft, [field]: nextValue };
    const columnByField = { lifeCurrent: 'life_current', sanityCurrent: 'sanity_current', mana: 'mana' };
    setDraft(nextDraft);
    setSheet({ ...sheet, [columnByField[field]]: nextValue });
    try {
      await persist(nextDraft);
    } catch {
      await load();
    }
  }

  function rollSkill(skill, value) {
    const die = Math.floor(Math.random() * 20) + 1;
    const bonus = Number(value || 0);
    setSkillRoll({ name: skill.name, die, bonus, total: die + bonus });
  }

  function rollPower(power, type) {
    const result = rollDiceFormula(power.damage);
    setDamageRoll({ ...result, name: power.name, damage: power.damage, type });
  }

  if (notFound) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-mist"><h1 className="font-display text-4xl text-ember">Ficha não encontrada</h1><p className="mt-3">Ela pode ter sido removida ou pertencer a outro armazenamento local.</p><Link className="mt-6 inline-block text-ember" to="/characters">Voltar para personagens</Link></main>;
  if (!sheet || !draft) return <main className="px-4 py-10 text-mist">Carregando ficha...</main>;

  const inventory = editing ? draft.inventory : sheet.inventory || [];
  const attacks = editing ? draft.attacks : sheet.attacks || [];
  const spells = editing ? draft.spells : sheet.spells || [];
  const totalDefense = (editing ? draft.defense : sheet.defense) + inventory.reduce((sum, item) => sum + Number(item.defenseBonus || 0), 0);
  const skillsCatalog = sheet.skills_catalog || [];
  const origin = sheet.origin_name || sheet.origin || 'Sem origem';

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050506] px-2 py-3 sm:px-4 sm:py-5">
      <section className="mx-auto grid w-full max-w-[1480px] gap-4 border border-ember/40 bg-[#101011] p-3 shadow-glow xl:grid-cols-[minmax(360px,0.95fr)_minmax(520px,1.35fr)]">
        <aside className="space-y-4">
          <header className="grid gap-3 sm:grid-cols-[96px_1fr]">
            <div className="h-24 overflow-hidden border border-ember/30 bg-black/40">
              {sheet.photo ? <img src={sheet.photo} className="h-full w-full object-cover" /> : <div className="h-full bg-[radial-gradient(circle,rgba(143,29,44,.38),transparent_58%)]" />}
            </div>
            <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <InfoBlock label="Personagem" value={sheet.character_name} subLabel="Origem" subValue={origin} />
              <InfoBlock label="Jogador" value={sheet.player_name} subLabel="Classe" subValue={sheet.class_name || 'Sem classe'} />
            </div>
          </header>

          <Panel>
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

          <section className="grid gap-3">
            <VitalsBar label="Vida" current={draft.lifeCurrent} max={draft.lifeMax} tone="red" onDecrease={(event) => adjustVital('lifeCurrent', -1, event)} onIncrease={(event) => adjustVital('lifeCurrent', 1, event)} />
            <VitalsBar label="Sanidade" current={draft.sanityCurrent} max={draft.sanityMax} tone="purple" onDecrease={(event) => adjustVital('sanityCurrent', -1, event)} onIncrease={(event) => adjustVital('sanityCurrent', 1, event)} />
            <VitalsBar label="Mana" current={draft.mana} max={draft.manaMax} tone="orange" onDecrease={(event) => adjustVital('mana', -1, event)} onIncrease={(event) => adjustVital('mana', 1, event)} />
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Metric label="Defesa" value={totalDefense} />
            <Metric label="Bloqueio" value="10" />
            <Metric label="Esquiva" value={sheet.dodge} />
          </section>

          <InventoryPanel inventory={inventory} editing={editing} draft={draft} setDraft={setDraft} />

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ember">D20</h2>
                <p className="text-sm text-mist">Teste rápido.</p>
              </div>
              <Button type="button" onClick={() => setD20(Math.floor(Math.random() * 20) + 1)}>Rolar</Button>
            </div>
            {d20 && <div className="mt-4 rounded-md border border-ember/30 bg-black/30 p-4 text-center text-5xl font-black text-white">{d20}</div>}
          </Panel>
        </aside>

        <section className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-ember">Ficha de jogo</h2>
              <div className="flex flex-wrap gap-2">
                <Link to={`/characters/${sheet.id}/edit`}><Button variant="ghost"><Edit size={16} className="inline" /> Base</Button></Link>
                {editing ? (
                  <>
                    <Button variant="ghost" onClick={() => { setDraft(makeDraft(sheet)); setEditing(false); }}><X size={16} /></Button>
                    <Button onClick={savePlayChanges}><Save size={16} className="inline" /> Salvar</Button>
                  </>
                ) : <Button onClick={() => setEditing(true)}>Modificar</Button>}
              </div>
            </div>
          </Panel>

          <PowersPanel
            attacks={attacks}
            spells={spells}
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            onRoll={rollPower}
            roll={damageRoll}
          />

          <Panel>
            <h2 className="font-display text-2xl text-ember">Perícias</h2>
            {editing && <PlayEditor draft={draft} setDraft={setDraft} skillsCatalog={skillsCatalog} onRoll={rollSkill} roll={skillRoll} />}
            {!editing && <SkillTable sheet={sheet} skills={sheet.skills || {}} skillsCatalog={skillsCatalog} onRoll={rollSkill} roll={skillRoll} />}
          </Panel>

          <SaveHistory saves={sheet.save_history || []} />
        </section>
      </section>
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

function InventoryPanel({ inventory, editing, draft, setDraft }) {
  const [item, setItem] = useState(blankItem);

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
    <Panel>
      <h2 className="font-display text-2xl text-ember">Inventário</h2>
      {!editing && (
        <ul className="mt-3 space-y-2 text-sm text-mist">
          {inventory.length ? inventory.map((item, index) => (
            <li key={item.id || `${item.name}-${index}`} className="rounded border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-white">{Number(item.quantity ?? 1)}x {item.name}</span>
              <span className="ml-2 text-xs text-mist">peso {Number(item.weight || 0)}</span>
              {item.description && <p className="mt-1 text-xs text-mist">{item.description}</p>}
            </li>
          )) : <li className="text-mist">Inventário vazio.</li>}
        </ul>
      )}
      {editing && (
        <div className="mt-4 space-y-3">
          {draft.inventory.map((current, index) => (
            <div key={current.id || `${current.name}-${index}`} className="rounded border border-white/10 bg-black/25 p-3">
              <div className="grid gap-2 sm:grid-cols-[110px_110px_1fr_36px]">
                <NumberInput placeholder="Quantidade" value={current.quantity ?? 1} onChange={(value) => updateItem(index, 'quantity', value)} />
                <NumberInput placeholder="Peso" value={current.weight ?? 0} onChange={(value) => updateItem(index, 'weight', value)} />
                <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={current.name || ''} onChange={(event) => updateItem(index, 'name', event.target.value)} />
                <button type="button" className="grid h-10 place-items-center rounded border border-red-400/30 text-red-300" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
              </div>
              <textarea placeholder="Descrição" className="mt-2 w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={current.description || ''} onChange={(event) => updateItem(index, 'description', event.target.value)} />
            </div>
          ))}
          <div className="rounded border border-ember/20 bg-black/20 p-3">
            <div className="grid gap-2 sm:grid-cols-[110px_110px_1fr_auto]">
              <NumberInput placeholder="Quantidade" value={item.quantity} onChange={(quantity) => setItem({ ...item, quantity })} />
              <NumberInput placeholder="Peso" value={item.weight} onChange={(weight) => setItem({ ...item, weight })} />
              <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={item.name} onChange={(event) => setItem({ ...item, name: event.target.value })} />
              <Button type="button" variant="ghost" onClick={addItem}><Plus size={16} /></Button>
            </div>
            <textarea placeholder="Descrição" className="mt-2 w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={item.description} onChange={(event) => setItem({ ...item, description: event.target.value })} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function PowersPanel({ attacks, spells, editing, draft, setDraft, onRoll, roll }) {
  return (
    <Panel>
      <h2 className="font-display text-2xl text-ember">Poderes e Ataques</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PowerList title="Ataques Normais" field="attacks" items={attacks} editing={editing} draft={draft} setDraft={setDraft} onRoll={(power) => onRoll(power, 'Ataque')} />
        <PowerList title="Magias" field="spells" items={spells} editing={editing} draft={draft} setDraft={setDraft} onRoll={(power) => onRoll(power, 'Magia')} />
      </div>
      <DamageFeedback roll={roll} />
    </Panel>
  );
}

function PowerList({ title, field, items, editing, draft, setDraft, onRoll }) {
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
    <section className="rounded border border-white/10 bg-black/20 p-3">
      <h3 className="font-display text-xl text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item, index) => (
          <div key={item.id || `${item.name}-${index}`} className="rounded border border-white/10 bg-black/25 p-3">
            {!editing ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-ember">{item.damage}</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => onRoll(item)}><Dice5 size={16} className="inline" /> Rolar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_110px_36px]">
                  <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={item.name || ''} onChange={(event) => updatePower(index, 'name', event.target.value)} />
                  <input placeholder="Dano" className="rounded border border-ember/20 bg-black/30 px-3 py-2" value={item.damage || ''} onChange={(event) => updatePower(index, 'damage', event.target.value)} />
                  <button type="button" className="grid h-10 place-items-center rounded border border-red-400/30 text-red-300" onClick={() => removePower(index)}><Trash2 size={16} /></button>
                </div>
                <textarea placeholder="Descrição" className="w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={item.description || ''} onChange={(event) => updatePower(index, 'description', event.target.value)} />
              </div>
            )}
          </div>
        )) : <p className="text-sm text-mist">Nenhum registro.</p>}
      </div>
      {editing && (
        <div className="mt-3 rounded border border-ember/20 bg-black/20 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <input placeholder="Nome" className="min-w-0 rounded border border-ember/20 bg-black/30 px-3 py-2" value={power.name} onChange={(event) => setPower({ ...power, name: event.target.value })} />
            <input placeholder="Dano" className="rounded border border-ember/20 bg-black/30 px-3 py-2" value={power.damage} onChange={(event) => setPower({ ...power, damage: event.target.value })} />
            <Button type="button" variant="ghost" onClick={addPower}><Plus size={16} /></Button>
          </div>
          <textarea placeholder="Descrição" className="mt-2 w-full rounded border border-ember/20 bg-black/30 px-3 py-2 text-sm" value={power.description} onChange={(event) => setPower({ ...power, description: event.target.value })} />
        </div>
      )}
    </section>
  );
}

function SkillTable({ sheet, skills, skillsCatalog, onRoll, roll }) {
  return (
    <>
      <div className="mt-4 grid grid-cols-[minmax(120px,1fr)_52px_52px_52px_44px] gap-x-2 text-xs uppercase text-mist sm:grid-cols-[1fr_64px_64px_64px_44px] sm:gap-x-3">
        <span>Perícia</span><span>Dado</span><span>Treino</span><span>Outros</span><span>Rolar</span>
      </div>
      <div className="mt-2 grid gap-x-5 lg:grid-cols-2">
        {skillsCatalog.map((skill) => (
          <div key={skill.key} className="grid grid-cols-[minmax(120px,1fr)_52px_52px_52px_44px] items-center gap-x-2 border-b border-white/10 py-1 text-sm sm:grid-cols-[1fr_64px_64px_64px_44px] sm:gap-x-3">
            <span className="truncate text-white">{skill.name}</span>
            <span className="text-ember">({sheet.attributes?.[skill.attribute] ?? 2})</span>
            <span className="text-blue-400">{skills?.[skill.key] ?? 0}</span>
            <span className="text-mist">0</span>
            <button type="button" className="grid h-8 w-8 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skills?.[skill.key] ?? 0)}><Dice5 size={16} /></button>
          </div>
        ))}
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
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric label="D20" value={roll.die} />
        <Metric label="Bônus" value={`${roll.bonus >= 0 ? '+' : ''}${roll.bonus}`} />
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
      <div className="mt-2 text-center text-4xl font-black text-white">{roll.total}</div>
    </div>
  );
}

function SaveHistory({ saves }) {
  return (
    <Panel>
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

function VitalsBar({ label, current, max, tone, onDecrease, onIncrease }) {
  const safeCurrent = Number(current ?? 0);
  const safeMax = Number(max ?? 0);
  const width = safeMax > 0 ? Math.min(100, (safeCurrent / safeMax) * 100) : safeCurrent > 0 ? 100 : 0;
  const tones = {
    red: 'from-red-950 via-red-800 to-red-600 border-red-500/40 shadow-red-950/40',
    purple: 'from-purple-950 via-purple-800 to-fuchsia-600 border-purple-400/40 shadow-purple-950/40',
    orange: 'from-orange-950 via-orange-700 to-amber-500 border-orange-400/40 shadow-orange-950/40'
  };
  return (
    <div>
      <p className="mb-1 text-center text-xs font-bold uppercase tracking-[.18em] text-mist">{label}</p>
      <div className={`relative grid min-h-12 grid-cols-[48px_1fr_48px] overflow-hidden rounded border bg-black/50 shadow-lg ${tones[tone]}`}>
        <div className={`pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r ${tones[tone]} opacity-80 transition-all duration-200`} style={{ width: `${width}%` }} />
        <button type="button" className="relative grid place-items-center border-r border-white/15 text-white soft-motion hover:bg-white/10" onClick={onDecrease} aria-label={`Diminuir ${label}`}><ChevronLeft size={22} /></button>
        <div className="relative grid place-items-center px-3 text-lg font-black text-white drop-shadow">{safeCurrent} / {safeMax}</div>
        <button type="button" className="relative grid place-items-center border-l border-white/15 text-white soft-motion hover:bg-white/10" onClick={onIncrease} aria-label={`Aumentar ${label}`}><ChevronRight size={22} /></button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return <label className="text-sm text-mist">{label}<NumberInput className="mt-1 w-full" value={value} onChange={onChange} /></label>;
}

function NumberInput({ value, onChange, placeholder, className = '' }) {
  return <input type="number" min="0" placeholder={placeholder} className={`rounded border border-ember/20 bg-black/30 px-3 py-2 ${className}`} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

function Panel({ children }) {
  return <section className="rounded-md border border-white/10 bg-black/20 p-4">{children}</section>;
}

function Metric({ label, value }) {
  return <div className="border border-white/20 bg-black/25 p-3 text-center"><div className="text-3xl font-black">{value}</div><div className="text-xs uppercase text-mist">{label}</div></div>;
}
