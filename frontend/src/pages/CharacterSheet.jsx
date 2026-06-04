import { Edit, Plus, Save, Trash2, X } from 'lucide-react';
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

export default function CharacterSheet() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [d20, setD20] = useState(null);

  async function load() {
    try {
      const { data } = await api.get(`/characters/${id}`);
      setSheet(data);
      setDraft({ mana: data.mana, defense: data.defense, skills: data.skills || {}, inventory: data.inventory || [] });
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function savePlayChanges() {
    const { data } = await api.patch(`/characters/${id}/play`, draft);
    setSheet(data);
    setDraft({ mana: data.mana, defense: data.defense, skills: data.skills || {}, inventory: data.inventory || [] });
    setEditing(false);
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
            <Bar label="Vida" value="63 / 63" color="bg-red-700" />
            <Bar label="Sanidade" value="52 / 52" color="bg-purple-700" />
            <Bar label="Mana" value={`${editing ? draft.mana : sheet.mana} / ${editing ? draft.mana : sheet.mana}`} color="bg-orange-600" />
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
                  <Button variant="ghost" onClick={() => { setDraft({ mana: sheet.mana, defense: sheet.defense, skills: sheet.skills || {}, inventory: sheet.inventory || [] }); setEditing(false); }}><X size={16} /></Button>
                  <Button onClick={savePlayChanges}><Save size={16} className="inline" /> Salvar</Button>
                </>
              ) : <Button onClick={() => setEditing(true)}>Modificar</Button>}
            </div>
          </div>

          {editing && <PlayEditor draft={draft} setDraft={setDraft} skillsCatalog={skillsCatalog} />}
          {!editing && <SkillTable sheet={sheet} skills={sheet.skills || {}} skillsCatalog={skillsCatalog} />}
        </section>
      </section>
    </main>
  );
}

function PlayEditor({ draft, setDraft, skillsCatalog }) {
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
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-mist">Mana<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.mana} onChange={(event) => setDraft({ ...draft, mana: Number(event.target.value) })} /></label>
        <label className="text-sm text-mist">Defesa base<input type="number" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={draft.defense} onChange={(event) => setDraft({ ...draft, defense: Number(event.target.value) })} /></label>
      </div>

      <div>
        <h3 className="font-display text-xl text-ember">Perícias</h3>
        <div className="mt-3 space-y-2">
          {rows.map((skill) => (
            <div key={skill.key} className="grid grid-cols-[1fr_88px_36px] items-center gap-2 border-b border-white/10 pb-2 text-sm">
              <span className="capitalize text-white">{skill.name}</span>
              <input type="number" className="rounded border border-ember/20 bg-black/30 px-2 py-1 text-center" value={skill.value} onChange={(event) => updateSkill(skill.key, event.target.value)} />
              <button type="button" className="text-red-300" onClick={() => removeSkill(skill.key)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="min-w-0 flex-1 rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Nova perícia" value={customSkill.key} onChange={(event) => setCustomSkill({ key: event.target.value, name: event.target.value })} />
          <Button type="button" variant="ghost" onClick={addCustomSkill}><Plus size={16} /></Button>
        </div>
      </div>
    </div>
  );
}

function SkillTable({ sheet, skills, skillsCatalog }) {
  const customKeys = Object.keys(skills).filter((key) => !skillsCatalog.some((skill) => skill.key === key));
  const rows = [...skillsCatalog, ...customKeys.map((key) => ({ key, name: key, attribute: 'presenca' }))];
  return (
    <>
      <div className="mt-4 grid grid-cols-[minmax(120px,1fr)_52px_52px_52px] gap-x-2 text-xs uppercase text-mist sm:grid-cols-[1fr_64px_64px_64px] sm:gap-x-3">
        <span>Perícia</span><span>Dado</span><span>Treino</span><span>Outros</span>
      </div>
      <div className="mt-2 space-y-1">
        {rows.map((skill) => (
          <div key={skill.key} className="grid grid-cols-[minmax(120px,1fr)_52px_52px_52px] gap-x-2 border-b border-white/10 py-1 text-sm sm:grid-cols-[1fr_64px_64px_64px] sm:gap-x-3">
            <span className="capitalize text-white">{skill.name}</span>
            <span className="text-ember">({sheet.attributes?.[skill.attribute] ?? 2})</span>
            <span className="text-blue-400">{skills?.[skill.key] ?? 0}</span>
            <span className="text-mist">0</span>
          </div>
        ))}
      </div>
    </>
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
