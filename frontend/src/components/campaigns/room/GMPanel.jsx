import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Heart, ImageUp, Map as MapIcon, Play, Plus, Skull, SkipForward, Square, Trash2, X } from 'lucide-react';
import Button from '../../Button';
import { api } from '../../../lib/api';
import { normalizeRules } from '../../../lib/tableRules';
import QuickPoints from './QuickPoints';
import TableControl from './TableControl';
import { clockLabel, phaseAt } from '../../../lib/tiles/daylight';
import { VISION_LABELS, VISION_RADII } from '../../../lib/tableRules';

// Painel do mestre: tudo que so ele controla. O mestre decide acerto e dano; os jogadores so veem o efeito.
const CONDITIONS = ['caído', 'envenenado', 'atordoado', 'imobilizado', 'sangrando', 'amedrontado', 'invisível', 'inconsciente'];
const MODES = [['prep', 'Preparação', 'Só você move os tokens.'], ['exploration', 'Exploração', 'Cada jogador anda com o próprio token (WASD).'], ['combat', 'Combate', 'Turnos por iniciativa: movimento limitado e uma ação.']];

// Reduz a imagem do mapa no navegador (o servidor aceita ate ~3,5 MB).
async function compressMap(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const scale = Math.min(1, 3000 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.85;
    let data = canvas.toDataURL('image/webp', quality);
    while (data.length > 3_300_000 && quality > 0.4) { quality -= 0.15; data = canvas.toDataURL('image/webp', quality); }
    return { data, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// '' = sem limite (null); peso em kg com 2 casas, itens inteiros
const limitValue = (text, int = false) => {
  if (String(text ?? '').trim() === '') return null;
  const n = Number(String(text).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return int ? Math.floor(n) : Math.round(n * 100) / 100;
};
const limitText = (value) => (value == null ? '' : String(value).replace('.', ','));

// Mais regras (usadas de vez em quando): quem mexe nas fichas, relogio e visao, e limites do
// inventario (peso em kg e quantidade de itens), geral ou so para um jogador. O que os jogadores
// podem fazer agora fica no Controle da mesa (TableControl), no topo do painel.
function MoreRules({ campaignId, rules, members, onRulesChange, notify }) {
  const players = members.filter((m) => m.role !== 'master');
  const draftFrom = (r) => ({
    maxWeight: limitText(r.inventory?.maxWeight), maxItems: limitText(r.inventory?.maxItems),
    players: Object.fromEntries(players.map((m) => {
      const own = r.players?.[m.user_id]?.inventory || {};
      return [m.user_id, { maxWeight: 'maxWeight' in own ? limitText(own.maxWeight) : '', maxItems: 'maxItems' in own ? limitText(own.maxItems) : '' }];
    }))
  });
  const [draft, setDraft] = useState(() => draftFrom(rules));
  const [saving, setSaving] = useState(false);
  const rulesKey = JSON.stringify(rules);
  useEffect(() => { setDraft(draftFrom(rules)); }, [rulesKey, players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(next, ok) {
    setSaving(true);
    try {
      const { data } = await api.put(`/campaigns/${campaignId}/rules`, next);
      onRulesChange?.(normalizeRules(data));
      if (ok) notify(ok);
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para salvar as regras.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function saveLimits() {
    const nextPlayers = { ...rules.players };
    for (const m of players) {
      const d = draft.players[m.user_id] || {};
      const { inventory: _old, ...rest } = nextPlayers[m.user_id] || {};
      // campo vazio = vale o limite geral para este jogador
      const inventory = {};
      if (String(d.maxWeight ?? '').trim() !== '') inventory.maxWeight = limitValue(d.maxWeight);
      if (String(d.maxItems ?? '').trim() !== '') inventory.maxItems = limitValue(d.maxItems, true);
      const entry = Object.keys(inventory).length ? { ...rest, inventory } : rest;
      if (Object.keys(entry).length) nextPlayers[m.user_id] = entry; else delete nextPlayers[m.user_id];
    }
    save({ ...rules, inventory: { maxWeight: limitValue(draft.maxWeight), maxItems: limitValue(draft.maxItems, true) }, players: nextPlayers }, 'Limites do inventário salvos.');
  }

  return (
    <>
      <p className="font-bold text-bone">Quem mexe nas fichas</p>
      <p className="text-xs text-mist">Vale para as fichas mostradas nesta campanha. Fora dela, o jogador continua livre.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        {[['stats', 'Vida, mana e sanidade'], ['powers', 'Ataques e magias']].map(([key, label]) => (
          <label key={key} className="text-mist">{label}
            <select className="field" disabled={saving} value={rules.sheet?.[key] || 'mestre'} onChange={(e) => save({ ...rules, sheet: { ...rules.sheet, [key]: e.target.value } }, e.target.value === 'mestre' ? `${label}: só o mestre muda.` : `${label}: o jogador também muda.`)}>
              <option value="mestre">Só o mestre</option>
              <option value="jogador">Mestre e jogador</option>
            </select>
          </label>
        ))}
      </div>
      <p className="mt-4 font-bold text-bone">Hora do mundo e visão</p>
      <p className="text-xs text-mist">Com o relógio ligado, a luz das cenas de fora segue a hora (amanhecer, dia, entardecer, noite). Na mesa, ‹ e › mudam 15 minutos.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <label className="text-mist">Relógio
          <select className="field" disabled={saving} value={rules.clock?.on ? 'on' : 'off'} onChange={(e) => save({ ...rules, clock: { ...rules.clock, on: e.target.value === 'on' } }, e.target.value === 'on' ? 'Relógio ligado: a luz segue a hora.' : 'Relógio desligado: cada cena usa a própria luz.')}>
            <option value="off">Desligado</option>
            <option value="on">Ligado</option>
          </select>
        </label>
        <label className="text-mist">Hora
          <select className="field" disabled={saving} value={rules.clock?.minutes ?? 720} onChange={(e) => save({ ...rules, clock: { on: true, minutes: Number(e.target.value) } }, `Agora são ${clockLabel(Number(e.target.value))}.`)}>
            {Array.from({ length: 96 }, (_, i) => i * 15).map((m) => <option key={m} value={m}>{clockLabel(m)} · {phaseAt(m)}</option>)}
          </select>
        </label>
        <label className="col-span-2 text-mist">Visão dos jogadores
          <select className="field" disabled={saving} value={rules.vision ?? 9} onChange={(e) => save({ ...rules, vision: Number(e.target.value) }, `Visão: ${VISION_LABELS[Number(e.target.value)]}.`)}>
            {VISION_LABELS.map((l, i) => <option key={l} value={i}>{l}{VISION_RADII[i] ? ` (${VISION_RADII[i]} passos)` : ''}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-4 font-bold text-bone">Inventário dos jogadores</p>
      <p className="text-xs text-mist">Padrão: 30 kg e 9 itens. Vazio = sem limite. Mochilas guardam itens dentro: pesam, mas contam como 1 item.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <label className="text-mist">Peso máximo (kg)
          <input inputMode="decimal" className="field" placeholder="sem limite" value={draft.maxWeight} onChange={(e) => setDraft({ ...draft, maxWeight: e.target.value })} />
        </label>
        <label className="text-mist">Máximo de itens
          <input inputMode="numeric" className="field" placeholder="sem limite" value={draft.maxItems} onChange={(e) => setDraft({ ...draft, maxItems: e.target.value })} />
        </label>
      </div>
      {players.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-mist">Limite diferente para um jogador</summary>
          <p className="mt-1 text-xs text-mist">Vazio = vale o limite geral.</p>
          <ul className="mt-1 space-y-1">
            {players.map((m) => {
              const d = draft.players[m.user_id] || { maxWeight: '', maxItems: '' };
              const set = (patch) => setDraft({ ...draft, players: { ...draft.players, [m.user_id]: { ...d, ...patch } } });
              const name = m.shared_character?.character_name || m.display_name || m.name;
              return (
                <li key={m.user_id} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-1">
                  <span className="truncate text-bone">{name}</span>
                  <input inputMode="decimal" className="field !mt-0 !min-h-9 !py-1" placeholder="kg" value={d.maxWeight} onChange={(e) => set({ maxWeight: e.target.value })} aria-label={`Peso máximo de ${name}`} />
                  <input inputMode="numeric" className="field !mt-0 !min-h-9 !py-1" placeholder="itens" value={d.maxItems} onChange={(e) => set({ maxItems: e.target.value })} aria-label={`Máximo de itens de ${name}`} />
                </li>
              );
            })}
          </ul>
        </details>
      )}
      <Button className="mt-3 !min-h-10 text-sm" disabled={saving} onClick={saveLimits}>Salvar limites</Button>
    </>
  );
}

function Section({ title, children, open = true, id }) {
  return (
    <details open={open} id={id} className="border-b-[3px] border-lead">
      <summary className="cursor-pointer list-none px-3 py-3 font-display text-xl text-bone marker:hidden">{title}</summary>
      <div className="px-3 pb-4">{children}</div>
    </details>
  );
}

export default function GMPanel({ campaignId, scenes, scene, viewSceneId, onViewScene, tokens, members, npcs, pending, onResolve, onDismiss, onChanged, onOpenTileEditor, notify, rules, onRulesChange, reloadKey }) {
  const [monsters, setMonsters] = useState([]);
  const [newNpc, setNewNpc] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/monsters').then(({ data }) => setMonsters(Array.isArray(data) ? data : data.monsters || [])).catch(() => null); }, []);

  async function run(fn, ok) {
    setBusy(true);
    try { await fn(); if (ok) notify(ok); onChanged(); } catch (err) { notify(err.response?.data?.message || 'Não deu certo.', 'error'); } finally { setBusy(false); }
  }

  const patchScene = (body, ok) => run(() => api.patch(`/campaigns/${campaignId}/scenes/${scene.id}`, body), ok);
  const patchToken = (t, body) => run(() => api.patch(`/campaigns/${campaignId}/tokens/${t.id}`, body));
  const spot = () => {
    const c = scene?.grid_size || 70;
    const n = tokens.length;
    return { x: c * (2 + (n % 6)), y: c * (2 + Math.floor(n / 6)) };
  };
  const addToken = (body) => run(() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/tokens`, { ...spot(), ...body }), 'Token colocado na cena.');

  async function uploadMap(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run(async () => {
      const { data, width, height } = await compressMap(file);
      await api.patch(`/campaigns/${campaignId}/scenes/${scene.id}`, { map_kind: 'image', map_url: data, width, height });
    }, 'Mapa enviado.');
  }

  async function newScene() {
    const name = window.prompt('Nome da nova cena', `Cena ${scenes.length + 1}`);
    if (!name) return;
    await run(async () => {
      const { data } = await api.post(`/campaigns/${campaignId}/scenes`, { name });
      onViewScene(data.id);
    }, 'Cena criada.');
  }

  const inCombat = scene?.mode === 'combat';
  const sharedChars = members.filter((m) => m.shared_character_id && !tokens.some((t) => t.character_id === m.shared_character_id));

  return (
    <div className="h-full overflow-y-auto">
      {pending.length > 0 && (
        <Section title={`Decidir ataques (${pending.length})`}>
          <ul className="space-y-2">
            {pending.map((p) => {
              const amount = amounts[p.rollId] ?? (p.kind === 'damage' ? p.total : '');
              return (
                <li key={p.rollId} className="border-[3px] border-lead bg-black/40 p-3">
                  <p className="text-sm"><span className="font-bold text-bone">{p.characterName || p.userName}</span> <span className="text-mist">{p.kind === 'damage' ? 'causou dano em' : 'atacou'}</span> <span className="font-bold text-bone">{p.targetName}</span></p>
                  <p className="text-sm text-mist">{p.label} · <span className="font-display text-xl text-ember tabular">{p.total}</span> <span className="tabular">(d{p.dice?.[0]?.sides} {p.dice?.[0]?.value})</span></p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <input type="number" min="0" className="field !mt-0 !min-h-10 !w-20" placeholder="dano" value={amount} onChange={(e) => setAmounts({ ...amounts, [p.rollId]: e.target.value })} aria-label="Dano" />
                    <Button className="!min-h-10 text-sm" disabled={busy} onClick={() => onResolve(p, 'hit', Number(amount || 0))}><Check size={15} /> Acertou</Button>
                    <Button variant="ghost" className="!min-h-10 text-sm" disabled={busy} onClick={() => onResolve(p, 'miss', 0)}><X size={15} /> Errou</Button>
                    <button type="button" className="ml-auto text-sm text-mist underline" onClick={() => onDismiss(p)}>ignorar</button>
                  </div>
                  {p.kind === 'attack' && <p className="mt-1 text-xs text-mist">Dica: espere o jogador rolar o dano, ou digite o dano você mesmo. O alvo só mostra “tomou dano”, sem número.</p>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title="Controle da mesa" id="controle-da-mesa">
        <TableControl campaignId={campaignId} rules={rules} members={members} onRulesChange={onRulesChange} notify={notify} />
      </Section>
      <Section title="Pontos: vida, sanidade, mana">
        <QuickPoints campaignId={campaignId} reloadKey={reloadKey} />
      </Section>
      <Section title="Cena">
        <div className="flex gap-2">
          <select className="field !mt-0 flex-1" value={viewSceneId || ''} onChange={(e) => onViewScene(e.target.value)} aria-label="Cena em edição">
            {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' (no ar)' : ''}</option>)}
          </select>
          <button type="button" className="btn btn-glass !min-h-11 !w-11 !p-0" onClick={newScene} aria-label="Nova cena"><Plus size={18} /></button>
        </div>
        {!scene && <p className="mt-3 text-mist">Crie a primeira cena para montar a mesa.</p>}
        {scene && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {!scene.is_active && <Button className="!min-h-10 text-sm" disabled={busy} onClick={() => run(() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/activate`), 'Cena no ar para os jogadores.')}><Play size={15} /> Pôr no ar</Button>}
              <label className="btn btn-glass !min-h-10 cursor-pointer text-sm"><ImageUp size={15} /> Mapa do PC<input type="file" accept="image/*" className="sr-only" onChange={uploadMap} /></label>
              <button type="button" className="btn btn-glass !min-h-10 text-sm" onClick={() => onOpenTileEditor(scene)}><MapIcon size={15} /> Mapa em pixel art / IA</button>
              {scene.map_kind === 'tiles' && !scene.parent_scene_id && (
                <button type="button" className="btn btn-glass !min-h-10 text-sm" onClick={() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/give-map`).then(({ data }) => notify(data.given ? `Mapa entregue a ${data.given} personagem(ns).` : 'Todos já tinham este mapa.')).catch((err) => notify(err.response?.data?.message || 'Não deu para entregar o mapa.', 'error'))}><MapIcon size={15} /> Dar o mapa desta cena aos jogadores</button>
              )}
              <button type="button" className="btn btn-glass !min-h-10 text-sm text-red-200" disabled={busy} onClick={() => window.confirm(`Apagar a cena “${scene.name}” e os tokens dela?`) && run(() => api.delete(`/campaigns/${campaignId}/scenes/${scene.id}`), 'Cena apagada.')}><Trash2 size={15} /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <label className="text-mist">Velocidade (WASD)
                <input type="range" min="1" max="15" step="1" value={scene.move_speed || 6} onChange={(e) => patchScene({ move_speed: Number(e.target.value) })} className="mt-2 w-full accent-[var(--color-ember)]" />
                <span className="tabular text-bone">{scene.move_speed || 6} passos/s</span>
              </label>
              <label className="text-mist">Passos por turno
                <input type="number" min="1" max="40" className="field" value={scene.movement_per_turn || 6} onChange={(e) => patchScene({ movement_per_turn: Number(e.target.value) })} />
              </label>
              <label className="text-mist">Tamanho de 1 passo
                <input type="range" min="30" max="160" step="5" value={scene.grid_size || 70} onChange={(e) => patchScene({ grid_size: Number(e.target.value) })} className="mt-2 w-full accent-[var(--color-ember)]" />
                <span className="tabular text-bone">{scene.grid_size || 70} px</span>
              </label>
              <div className="space-y-2 text-mist">
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(scene.show_grid)} onChange={(e) => patchScene({ show_grid: e.target.checked })} className="accent-[var(--color-ember)]" /> Mostrar grade</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={scene.move_mode === 'grid'} onChange={(e) => patchScene({ move_mode: e.target.checked ? 'grid' : 'free' })} className="accent-[var(--color-ember)]" /> Andar de casa em casa</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(scene.fog_enabled)} onChange={(e) => patchScene({ fog_enabled: e.target.checked })} className="accent-[var(--color-ember)]" /> Névoa</label>
              </div>
            </div>
            {scene.fog_enabled && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => {
                  const c = scene.grid_size || 70;
                  const r = c * 4;
                  const around = tokens.filter((t) => t.kind === 'character').map((t) => ({ x: Math.max(0, t.x - r), y: Math.max(0, t.y - r), w: r * 2 + c, h: r * 2 + c }));
                  patchScene({ fog_reveals: [...(scene.fog_reveals || []), ...around] }, 'Área revelada.');
                }}>Revelar ao redor dos jogadores</button>
                <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => patchScene({ fog_reveals: [{ x: 0, y: 0, w: 99999, h: 99999 }] })}>Revelar tudo</button>
                <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => patchScene({ fog_reveals: [] })}>Cobrir tudo</button>
              </div>
            )}
          </>
        )}
      </Section>

      {scene && (
        <Section title="Modo da cena">
          <div className="grid gap-1" role="radiogroup" aria-label="Modo da cena">
            {MODES.map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={scene.mode === id}
                disabled={busy}
                onClick={() => {
                  if (scene.mode === id) return;
                  if (id === 'combat') run(() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/combat/start`, { rollInitiative: true, movement_per_turn: scene.movement_per_turn || 6 }), 'Combate! Iniciativa rolada.');
                  else if (inCombat) run(async () => { await api.post(`/campaigns/${campaignId}/scenes/${scene.id}/combat/end`); if (id !== 'exploration') await api.patch(`/campaigns/${campaignId}/scenes/${scene.id}`, { mode: id }); }, 'Combate encerrado.');
                  else patchScene({ mode: id });
                }}
                className={`border-[3px] border-lead px-3 py-2 text-left ${scene.mode === id ? 'lit' : 'bg-black/30 hover:bg-white/[.03]'}`}
              >
                <span className="font-bold">{label}</span>
                <span className="block text-sm text-mist">{hint}</span>
              </button>
            ))}
          </div>
          {inCombat && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="!min-h-10 text-sm" disabled={busy} onClick={() => run(() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/combat/next`))}><SkipForward size={15} /> Próximo turno</Button>
              <Button variant="ghost" className="!min-h-10 text-sm" disabled={busy} onClick={() => run(() => api.post(`/campaigns/${campaignId}/scenes/${scene.id}/combat/start`, { rollInitiative: true }), 'Iniciativa rolada de novo.')}>Rolar iniciativa de novo</Button>
            </div>
          )}
        </Section>
      )}

      {scene && (
        <Section title={`Na cena (${tokens.length})`}>
          <ul className="space-y-2">
            {tokens.map((t) => {
              const isNpc = t.kind === 'npc' || t.kind === 'monster';
              const delta = Number(amounts[t.id] || 0);
              return (
                <li key={t.id} className={`border-[3px] border-lead bg-black/30 p-2 ${t.hidden ? 'border-dashed opacity-80' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-lead font-display" style={{ background: t.color || '#a4781a' }}>
                      {t.image_url ? <img src={t.image_url} alt="" className="h-full w-full object-cover" /> : t.name?.[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-bone">{t.name}</span>
                      <span className="block text-xs text-mist tabular">
                        {t.kind === 'character' ? 'Personagem' : t.kind === 'marker' ? 'Marcador' : t.kind === 'monster' ? 'Monstro' : 'NPC'}
                        {t.hp_max != null && <> · PV {t.hp_current}/{t.hp_max}</>}
                        {t.down && <> · <Skull size={11} className="inline" /> caído</>}
                      </span>
                    </span>
                    <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0" onClick={() => patchToken(t, { hidden: !t.hidden })} aria-label={t.hidden ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'}>{t.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button type="button" className="btn btn-glass !min-h-9 !w-9 !p-0 text-red-200" onClick={() => run(() => api.delete(`/campaigns/${campaignId}/tokens/${t.id}`))} aria-label={`Tirar ${t.name} da cena`}><Trash2 size={15} /></button>
                  </div>
                  {t.kind !== 'marker' && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <input type="number" min="0" className="field !mt-0 !min-h-9 !w-16 !py-1" value={amounts[t.id] ?? ''} placeholder="0" onChange={(e) => setAmounts({ ...amounts, [t.id]: e.target.value })} aria-label={`Valor para ${t.name}`} />
                      <button type="button" className="btn btn-glass !min-h-9 !px-2 text-sm" disabled={!delta || busy} onClick={() => onResolve({ targetTokenId: t.id, targetName: t.name }, 'hit', delta)}><Square size={13} /> Dano</button>
                      <button type="button" className="btn btn-glass !min-h-9 !px-2 text-sm" disabled={!delta || busy} onClick={() => onResolve({ targetTokenId: t.id, targetName: t.name }, 'heal', delta)}><Heart size={13} /> Curar</button>
                      <select className="field !mt-0 !min-h-9 !w-auto !py-1 text-sm" value="" onChange={(e) => {
                        const c = e.target.value;
                        if (!c) return;
                        const list = t.conditions || [];
                        patchToken(t, { conditions: list.includes(c) ? list.filter((x) => x !== c) : [...list, c] });
                      }} aria-label={`Condições de ${t.name}`}>
                        <option value="">Condição…</option>
                        {CONDITIONS.map((c) => <option key={c} value={c}>{(t.conditions || []).includes(c) ? `✓ ${c}` : c}</option>)}
                      </select>
                      {isNpc && t.hp_max != null && <span className="text-xs text-mist">Os jogadores não veem estes PV.</span>}
                    </div>
                  )}
                  {t.conditions?.length > 0 && <p className="mt-1 text-xs text-ember">{t.conditions.join(' · ')}</p>}
                </li>
              );
            })}
            {!tokens.length && <li className="text-mist">Nada na cena ainda. Adicione personagens, NPCs ou monstros abaixo.</li>}
          </ul>
        </Section>
      )}

      {scene && (
        <Section title="Adicionar à cena" open={!tokens.length}>
          {sharedChars.length > 0 && (
            <>
              <p className="text-sm text-mist">Personagens dos jogadores</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {sharedChars.map((m) => <button key={m.user_id} type="button" className="btn btn-glass !min-h-9 text-sm" disabled={busy} onClick={() => addToken({ kind: 'character', characterId: m.shared_character_id })}><Plus size={14} /> {m.shared_character?.character_name || m.display_name}</button>)}
              </div>
            </>
          )}
          {npcs.length > 0 && (
            <>
              <p className="mt-3 text-sm text-mist">NPCs e monstros da campanha</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {npcs.map((n) => <button key={n.id} type="button" className="btn btn-glass !min-h-9 text-sm" disabled={busy} onClick={() => addToken({ kind: n.kind, npcId: n.id, hidden: true })}><Plus size={14} /> {n.name}</button>)}
              </div>
              <p className="mt-1 text-xs text-mist">Entram escondidos (linha tracejada). Mostre quando quiser.</p>
            </>
          )}
          <label className="mt-3 block text-sm text-mist">Da biblioteca de monstros
            <select className="field" value="" disabled={busy} onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              run(async () => {
                const { data } = await api.post(`/campaigns/${campaignId}/npcs/from-monster/${id}`);
                await api.post(`/campaigns/${campaignId}/scenes/${scene.id}/tokens`, { ...spot(), kind: 'monster', npcId: data.id, hidden: true });
              }, 'Monstro colocado (escondido).');
            }}>
              <option value="">Escolher monstro…</option>
              {monsters.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.category} · {m.difficulty}</option>)}
            </select>
          </label>
          {newNpc ? (
            <div className="mt-3 grid grid-cols-2 gap-2 border-[3px] border-lead p-2">
              <input className="field !mt-0 col-span-2" placeholder="Nome do NPC" value={newNpc.name} onChange={(e) => setNewNpc({ ...newNpc, name: e.target.value })} aria-label="Nome do NPC" />
              <label className="text-xs text-mist">PV<input type="number" className="field" value={newNpc.hp_max} onChange={(e) => setNewNpc({ ...newNpc, hp_max: Number(e.target.value) })} /></label>
              <label className="text-xs text-mist">Defesa<input type="number" className="field" value={newNpc.defense} onChange={(e) => setNewNpc({ ...newNpc, defense: Number(e.target.value) })} /></label>
              <select className="field !mt-0" value={newNpc.kind} onChange={(e) => setNewNpc({ ...newNpc, kind: e.target.value })} aria-label="Tipo"><option value="npc">NPC</option><option value="monster">Monstro</option></select>
              <div className="flex gap-1">
                <Button className="!min-h-10 flex-1 text-sm" disabled={!newNpc.name || busy} onClick={() => run(async () => {
                  const { data } = await api.post(`/campaigns/${campaignId}/npcs`, newNpc);
                  await api.post(`/campaigns/${campaignId}/scenes/${scene.id}/tokens`, { ...spot(), kind: data.kind || newNpc.kind, npcId: data.id, hidden: false });
                  setNewNpc(null);
                }, 'NPC criado.')}>Criar</Button>
                <Button variant="ghost" className="!min-h-10 text-sm" onClick={() => setNewNpc(null)}>×</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={() => setNewNpc({ name: '', hp_max: 10, defense: 10, kind: 'npc' })}><Plus size={14} /> Novo NPC</button>
              <button type="button" className="btn btn-glass !min-h-9 text-sm" disabled={busy} onClick={() => { const name = window.prompt('Nome do marcador', 'Armadilha'); if (name) addToken({ kind: 'marker', name, color: '#a3182f' }); }}><Plus size={14} /> Marcador</button>
            </div>
          )}
        </Section>
      )}
      <Section title="Mais regras: fichas, hora, visão, inventário" open={false}>
        <MoreRules campaignId={campaignId} rules={normalizeRules(rules)} members={members} onRulesChange={onRulesChange} notify={notify} />
      </Section>
    </div>
  );
}
