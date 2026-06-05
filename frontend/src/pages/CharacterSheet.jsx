import { Dice5, Edit, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../components/Button';
import { api } from '../lib/api';

const attributes = [
  ['forca', 'FOR'],
  ['agilidade', 'AGI'],
  ['intelecto', 'INT'],
  ['presenca', 'PRE'],
  ['vigor', 'VIG']
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
            <Bar label="Vida" value={`${editing ? draft.lifeCurrent : (sheet.life_current ?? 63)} / ${editing ? draft.lifeMax : (sheet.life_max ?? 63)}`} color="bg-red-700" />
            <Bar label="Sanidade" value={`${editing ? draft.sanityCurrent : (sheet.sanity_current ?? 52)} / ${editing ? draft.sanityMax : (sheet.sanity_max ?? 52)}`} color="bg-purple-700" />
            <Bar label="Mana" value={`${editing ? draft.mana : sheet.mana} / ${editing ? draft.manaMax : (sheet.mana_max ?? sheet.mana)}`} color="bg-orange-600" />
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
  const [customSkill, setCustomSkill] = useState({ key: '', name: '' });
  const rows = useMemo(() => {
    const catalogRows = skillsCatalog.map((skill) => ({ ...skill, value: draft.skills?.[skill.key] ?? 0, custom: false }));
    const customRows = Object.keys(draft.skills || {})
      .filter((key) => !skillsCatalog.some((skill) => skill.key === key))
      .map((key) => ({ key, name: key, attribute: 'presenca', value: draft.skills[key], custom: true }));
    return [...catalogRows, ...customRows];
  }, [draft.skills, skillsCatalog]);

  function updateSkill(key, value) {
    setDraft({ ...draft, skills: { ...draft.skills, [key]: Number(value) } });
  }

  function removeSkill(key) {
    const next = { ...draft.skills };
    delete next[key];
    setDraft({ ...draft, skills: next });
  }

  function addCustomSkill() {
    const key = customSkill.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) return;
    setDraft({ ...draft, skills: { ...draft.skills, [key]: 0 } });
    setCustomSkill({ key: '', name: '' });
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
            <div key={skill.key} className="grid grid-cols-[1fr_72px_36px_36px] items-center gap-2 border-b border-white/10 pb-2 text-sm">
              <span className="capitalize text-white">{skill.name}</span>
              <input type="number" className="rounded border border-ember/20 bg-black/30 px-2 py-1 text-center" value={skill.value} onChange={(event) => updateSkill(skill.key, event.target.value)} />
              <button type="button" className="grid h-8 w-8 place-items-center rounded border border-ember/30 text-ember" onClick={() => onRoll(skill, skill.value)}><Dice5 size={16} /></button>
              <button type="button" className="text-red-300" onClick={() => removeSkill(skill.key)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <RollFeedback roll={roll} />
        <div className="mt-3 flex gap-2">
          <input className="min-w-0 flex-1 rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Nova perícia" value={customSkill.key} onChange={(event) => setCustomSkill({ key: event.target.value, name: event.target.value })} />
          <Button type="button" variant="ghost" onClick={addCustomSkill}><Plus size={16} /></Button>
        </div>
      </div>
    </div>
  );
}

function SkillTable({ sheet, skills, skillsCatalog, onRoll, roll }) {
  const customKeys = Object.keys(skills).filter((key) => !skillsCatalog.some((skill) => skill.key === key));
  const rows = [...skillsCatalog, ...customKeys.map((key) => ({ key, name: key, attribute: 'presenca' }))];
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

function Bar({ label, value, color }) {
  return <div><p className="mb-1 text-center text-xs font-bold uppercase text-mist">{label}</p><div className={`${color} px-4 py-2 text-center font-bold text-white`}>{value}</div></div>;
}

function Metric({ label, value }) {
  return <div className="border border-white/20 bg-black/25 p-3 text-center"><div className="text-3xl font-black">{value}</div><div className="text-xs uppercase text-mist">{label}</div></div>;
}
