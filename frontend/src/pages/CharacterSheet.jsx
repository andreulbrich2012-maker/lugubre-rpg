import { ChevronLeft, ChevronRight, Dice5, Edit, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/Button';
import { api } from '../lib/api';

const attributes = [
  ['forca', 'Força'],
  ['agilidade', 'Agilidade'],
  ['intelecto', 'Intelecto'],
  ['presenca', 'Presença'],
  ['vigor', 'Vigor']
];

function formatSaveDate(value) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function CharacterSheet() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [d20, setD20] = useState(null);
  const [skillRoll, setSkillRoll] = useState(null);

  async function load() {
    try {
      const { data } = await api.get(`/characters/${id}`);
      setSheet(data);
      setDraft({
        lifeCurrent: data.life_current ?? 63,
        lifeMax: data.life_max ?? 63,
        sanityCurrent: data.sanity_current ?? 52,
        sanityMax: data.sanity_max ?? 52,
        mana: data.mana,
        manaMax: data.mana_max ?? data.mana,
        defense: data.defense,
        skills: data.skills || {},
        inventory: data.inventory || []
      });
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function savePlayChanges() {
    const { data } = await api.patch(`/characters/${id}/play`, draft);
    setSheet(data);
    setDraft({
      lifeCurrent: data.life_current ?? 63,
      lifeMax: data.life_max ?? 63,
      sanityCurrent: data.sanity_current ?? 52,
      sanityMax: data.sanity_max ?? 52,
      mana: data.mana,
      manaMax: data.mana_max ?? data.mana,
      defense: data.defense,
      skills: data.skills || {},
      inventory: data.inventory || []
    });
    setEditing(false);
  }

  function rollSkill(skill, value) {
    const die = Math.floor(Math.random() * 20) + 1;
    const bonus = Number(value || 0);
    setSkillRoll({ name: skill.name, die, bonus, total: die + bonus });
  }

  async function adjustVital(field, direction, event) {
    const step = event.shiftKey ? 5 : 1;
    const current = Number(draft[field] ?? 0);
    const nextValue = Math.max(0, current + direction * step);
    const nextDraft = { ...draft, [field]: nextValue };
    const columnByField = { lifeCurrent: 'life_current', sanityCurrent: 'sanity_current', mana: 'mana' };

    setDraft(nextDraft);
    setSheet({ ...sheet, [columnByField[field]]: nextValue });

    try {
      const { data } = await api.patch(`/characters/${id}/play`, nextDraft);
      setSheet(data);
      setDraft({
        lifeCurrent: data.life_current ?? 63,
        lifeMax: data.life_max ?? 63,
        sanityCurrent: data.sanity_current ?? 52,
        sanityMax: data.sanity_max ?? 52,
        mana: data.mana,
        manaMax: data.mana_max ?? data.mana,
        defense: data.defense,
        skills: data.skills || {},
        inventory: data.inventory || []
      });
    } catch {
      await load();
    }
  }

  if (notFound) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-mist"><h1 className="font-display text-4xl text-ember">Ficha não encontrada</h1><p className="mt-3">Ela pode ter sido removida ou pertencer a outro armazenamento local.</p><Link className="mt-6 inline-block text-ember" to="/characters">Voltar para personagens</Link></main>;
  if (!sheet || !draft) return <main className="px-4 py-10 text-mist">Carregando ficha...</main>;

  const totalDefense = (editing ? draft.defense : sheet.defense) + (editing ? draft.inventory : sheet.inventory || []).reduce((sum, item) => sum + Number(item.defenseBonus || 0), 0);
  const origin = sheet.origin_name || sheet.origin || 'Sem origem';
  const skillsCatalog = sheet.skills_catalog || [];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050506] px-3 py-4">
      <section className="mx-auto grid max-w-7xl gap-4 border border-ember/40 bg-[#101011] p-3 shadow-glow lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-4">
          <header className="grid gap-3 sm:grid-cols-[96px_1fr] lg:grid-cols-[96px_1fr_1fr]">
            <div className="h-24 overflow-hidden border border-ember/30 bg-black/40">
              {sheet.photo ? <img src={sheet.photo} className="h-full w-full object-cover" /> : <div className="h-full bg-[radial-gradient(circle,rgba(143,29,44,.38),transparent_58%)]" />}
            </div>
            <InfoBlock label="Personagem" value={sheet.character_name} subLabel="Origem" subValue={origin} />
            <InfoBlock label="Jogador" value={sheet.player_name} subLabel="Classe" subValue={sheet.class_name || 'Sem classe'} />
          </header>

          <section className="rounded-md border border-white/10 bg-black/20 p-5">
            <h2 className="text-center font-display text-2xl text-white">Atributos</h2>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {attributes.map(([key, short]) => (
                <div key={key} className="rounded-full border-2 border-white/70 bg-white p-2 text-center text-black">
                  <div className="text-3xl font-black">{sheet.attributes?.[key] ?? 2}</div>
                  <div className="text-xs font-bold">{short}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3">
            <VitalsBar label="Vida" current={draft.lifeCurrent} max={draft.lifeMax} tone="red" onDecrease={(event) => adjustVital('lifeCurrent', -1, event)} onIncrease={(event) => adjustVital('lifeCurrent', 1, event)} />
            <VitalsBar label="Sanidade" current={draft.sanityCurrent} max={draft.sanityMax} tone="purple" onDecrease={(event) => adjustVital('sanityCurrent', -1, event)} onIncrease={(event) => adjustVital('sanityCurrent', 1, event)} />
            <VitalsBar label="Mana" current={draft.mana} max={draft.manaMax} tone="orange" onDecrease={(event) => adjustVital('mana', -1, event)} onIncrease={(event) => adjustVital('mana', 1, event)} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Defesa" value={totalDefense} />
            <Metric label="Bloqueio" value="10" />
            <Metric label="Esquiva" value={sheet.dodge} />
          </section>

          <section className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-mist">
            <p><span className="text-ember">Raça:</span> {sheet.race_name || 'Sem raça'}</p>
            <p><span className="text-ember">Proteção:</span> armaduras e encantamentos somam na defesa</p>
            <p><span className="text-ember">Inventário:</span> {(editing ? draft.inventory : sheet.inventory || []).length ? (editing ? draft.inventory : sheet.inventory).map((item) => item.name).join(', ') : 'vazio'}</p>
          </section>

          <section className="rounded-md border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ember">D20</h2>
                <p className="text-sm text-mist">Role um dado para testes rápidos.</p>
              </div>
              <Button type="button" onClick={() => setD20(Math.floor(Math.random() * 20) + 1)}>Rolar</Button>
            </div>
            {d20 && <div className="mt-4 rounded-md border border-ember/30 bg-black/30 p-4 text-center text-5xl font-black text-white">{d20}</div>}
          </section>
        </div>

        <section className="rounded-md border border-white/10 bg-black/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl text-ember">Ficha de jogo</h2>
            <div className="flex flex-wrap gap-2">
              <Link to={`/characters/${sheet.id}/edit`}><Button variant="ghost"><Edit size={16} className="inline" /> Base</Button></Link>
              {editing ? (
                <>
                  <Button variant="ghost" onClick={() => { setDraft({ lifeCurrent: sheet.life_current ?? 63, lifeMax: sheet.life_max ?? 63, sanityCurrent: sheet.sanity_current ?? 52, sanityMax: sheet.sanity_max ?? 52, mana: sheet.mana, manaMax: sheet.mana_max ?? sheet.mana, defense: sheet.defense, skills: sheet.skills || {}, inventory: sheet.inventory || [] }); setEditing(false); }}><X size={16} /></Button>
                  <Button onClick={savePlayChanges}><Save size={16} className="inline" /> Salvar</Button>
                </>
              ) : <Button onClick={() => setEditing(true)}>Modificar</Button>}
            </div>
          </div>

          {editing && <PlayEditor draft={draft} setDraft={setDraft} skillsCatalog={skillsCatalog} onRoll={rollSkill} roll={skillRoll} />}
          {!editing && <SkillTable sheet={sheet} skills={sheet.skills || {}} skillsCatalog={skillsCatalog} onRoll={rollSkill} roll={skillRoll} />}

          <SaveHistory saves={sheet.save_history || []} />
        </section>
      </section>
    </main>
  );
}

function PlayEditor({ draft, setDraft, skillsCatalog, onRoll, roll }) {
  const rows = useMemo(() => {
    return skillsCatalog.map((skill) => ({ ...skill, value: draft.skills?.[skill.key] ?? 0 }));
  }, [draft.skills, skillsCatalog]);

  function updateSkill(key, value) {
    const rounded = Math.round(Number(value || 0) / 5) * 5;
    const next = Math.max(0, Math.min(15, rounded));
    setDraft({ ...draft, skills: { ...draft.skills, [key]: next } });
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-mist">Vida atual<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.lifeCurrent} onChange={(event) => setDraft({ ...draft, lifeCurrent: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Vida máxima<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.lifeMax} onChange={(event) => setDraft({ ...draft, lifeMax: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Sanidade atual<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.sanityCurrent} onChange={(event) => setDraft({ ...draft, sanityCurrent: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Sanidade máxima<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.sanityMax} onChange={(event) => setDraft({ ...draft, sanityMax: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Mana atual<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.mana} onChange={(event) => setDraft({ ...draft, mana: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Mana máxima<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.manaMax} onChange={(event) => setDraft({ ...draft, manaMax: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Defesa base<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.defense} onChange={(event) => setDraft({ ...draft, defense: Number(event.target.value) })} /></label>
      </div>

      <div>
        <h3 className="font-display text-xl text-ember">Perícias</h3>
        <div className="mt-3 space-y-2">
          {rows.map((skill) => (
            <div key={skill.key} className="grid grid-cols-[1fr_72px_36px] items-center gap-2 border-b border-white/10 pb-2 text-sm">
              <span className="capitalize text-white">{skill.name}</span>
              <input type="number" min="0" max="15" step="5" className="rounded border border-ember/20 bg-black/30 px-2 py-1 text-center" value={skill.value} onChange={(event) => updateSkill(skill.key, event.target.value)} />
              <button type="button" className="grid h-8 w-8 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skill.value)}><Dice5 size={16} /></button>
            </div>
          ))}
        </div>
        <RollFeedback roll={roll} />
      </div>
    </div>
  );
}

function SkillTable({ sheet, skills, skillsCatalog, onRoll, roll }) {
  const rows = skillsCatalog;
  return (
    <>
      <div className="mt-4 grid grid-cols-[minmax(120px,1fr)_52px_52px_52px_44px] gap-x-2 text-xs uppercase text-mist sm:grid-cols-[1fr_64px_64px_64px_44px] sm:gap-x-3">
        <span>Perícia</span><span>Dado</span><span>Treino</span><span>Outros</span><span>Rolar</span>
      </div>
      <div className="mt-2 space-y-1">
        {rows.map((skill) => (
          <div key={skill.key} className="grid grid-cols-[minmax(120px,1fr)_52px_52px_52px_44px] items-center gap-x-2 border-b border-white/10 py-1 text-sm sm:grid-cols-[1fr_64px_64px_64px_44px] sm:gap-x-3">
            <span className="capitalize text-white">{skill.name}</span>
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

function SaveHistory({ saves }) {
  return (
    <section className="mt-5 rounded-md border border-white/10 bg-black/20 p-4">
      <h3 className="font-display text-xl text-ember">Últimos salvamentos</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {saves.length ? saves.map((save) => (
          <div key={save.id || save.saved_at} className="rounded border border-ember/15 bg-black/25 p-3 text-sm">
            <p className="text-white">{formatSaveDate(save.saved_at)}</p>
            <p className="mt-1 text-xs uppercase tracking-[.18em] text-mist">{save.label || 'Snapshot'}</p>
          </div>
        )) : <p className="text-sm text-mist">Nenhum salvamento registrado.</p>}
      </div>
    </section>
  );
}

function InfoBlock({ label, value, subLabel, subValue }) {
  return <div className="space-y-2 text-sm"><div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-xs font-bold uppercase text-mist">{label}</span><span className="border-b border-white/50 pb-1 text-white">{value}</span></div><div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-xs font-bold uppercase text-mist">{subLabel}</span><span className="border-b border-white/50 pb-1 text-white">{subValue}</span></div></div>;
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
        <button type="button" className="relative grid place-items-center border-r border-white/15 text-white soft-motion hover:bg-white/10" onClick={onDecrease} aria-label={`Diminuir ${label}`}>
          <ChevronLeft size={22} />
        </button>
        <div className="relative grid place-items-center px-3 text-lg font-black text-white drop-shadow">
          {safeCurrent} / {safeMax}
        </div>
        <button type="button" className="relative grid place-items-center border-l border-white/15 text-white soft-motion hover:bg-white/10" onClick={onIncrease} aria-label={`Aumentar ${label}`}>
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="border border-white/20 bg-black/25 p-3 text-center"><div className="text-3xl font-black">{value}</div><div className="text-xs uppercase text-mist">{label}</div></div>;
}
