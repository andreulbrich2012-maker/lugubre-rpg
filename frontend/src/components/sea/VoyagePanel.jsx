import { useEffect, useMemo, useState } from 'react';
import { Anchor, Eye, Flag, Pause, Play, Plus, Ship, Skull, Trash2, Undo2, Waves } from 'lucide-react';
import { api } from '../../lib/api';
import { BOAT_TYPE_LIST, boatType, isSeaScene, SEA_MONSTERS, SPEED_STEPS } from '../../lib/sea/boats';
import { pointAt, seaRoute, voyageProgress } from '../../lib/sea/route';
import { generateSea } from '../../lib/sea/seaMap';

// Painel "Viagem" do mestre: portos do mapa, barcos, embarcar, zarpar, velocidade, chegar,
// voltar e monstros do mar. Tudo curto: o mestre escolhe e clica.

const isPlainTiles = (s) => s?.map_kind === 'tiles' && s.tiles && !s.tiles.sea && !s.tiles.vessel;

export default function VoyagePanel({ campaignId, scenes, scene, onViewScene, voyage, notify, onChanged }) {
  const { boats, voyages, now, reload, setPick } = voyage;
  const [busy, setBusy] = useState(false);
  const base = `/campaigns/${campaignId}`;
  const run = async (fn, ok) => {
    setBusy(true);
    try { const out = await fn(); if (ok) notify(ok); await reload(); return out; } catch (err) { notify(err.response?.data?.message || 'Não deu.', 'error'); return null; } finally { setBusy(false); }
  };
  const sceneName = (id) => scenes.find((s) => s.id === id)?.name || '—';
  const seas = scenes.filter(isSeaScene);
  const lands = scenes.filter(isPlainTiles);

  // ---- portos do mapa aberto ----
  const ports = isPlainTiles(scene) ? scene.tiles.ports || [] : [];
  const savePorts = (next, ok) => run(async () => {
    await api.patch(`${base}/scenes/${scene.id}`, { tiles: { ...scene.tiles, ports: next } });
    onChanged?.();
  }, ok);
  const markPort = () => setPick({
    label: 'Clique no mapa onde fica o porto (Esc cancela)',
    onCell: ({ x, y }) => {
      setPick(null);
      savePorts([...ports, { id: `porto${Date.now().toString(36)}`, x, y, name: `Porto ${ports.length + 1}` }], 'Porto marcado. Dá para mudar o nome aqui no painel.');
    }
  });
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setPick(null); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); };
  }, [setPick]);
  useEffect(() => () => setPick(null), [setPick]);

  // ---- novo barco ----
  const [draft, setDraft] = useState({ name: '', type: 'veleiro', portId: '' });
  const createBoat = () => run(async () => {
    const t = boatType(draft.type);
    await api.post(`${base}/boats`, { name: draft.name.trim() || t.name, type: draft.type, sceneId: scene.id, portId: draft.portId || ports[0]?.id });
    setDraft((d) => ({ ...d, name: '' }));
    onChanged?.();
  }, 'Barco no porto, com convés pronto.');

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3 text-sm text-bone">
      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl"><Anchor size={18} className="text-ember" /> Portos deste mapa</h2>
        {!isPlainTiles(scene) ? <p className="text-mist">Abra um mapa em pixel art (vila, cidade, praia) para marcar o porto.</p> : (
          <>
            <ul className="mt-2 space-y-1">
              {ports.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <input className="field !mt-0 flex-1 py-1 text-sm" defaultValue={p.name} aria-label="Nome do porto" maxLength={60}
                    onBlur={(e) => { const name = e.target.value.trim(); if (name && name !== p.name) savePorts(ports.map((q) => (q.id === p.id ? { ...q, name } : q)), 'Nome do porto salvo.'); }} />
                  <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" disabled={busy} onClick={() => savePorts(ports.filter((q) => q.id !== p.id), 'Porto apagado.')} aria-label={`Apagar ${p.name}`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            {!ports.length && <p className="text-mist">Este mapa ainda não tem porto.</p>}
            <button type="button" className={`btn mt-2 w-full ${voyage.pick ? 'btn-lit' : 'btn-glass'}`} disabled={busy} onClick={() => (voyage.pick ? setPick(null) : markPort())}>
              <Flag size={15} /> {voyage.pick ? 'Cancelar: clique no mapa' : 'Marcar porto no mapa'}
            </button>
          </>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl"><Ship size={18} className="text-ember" /> Barcos</h2>
        {!boats.length && <p className="text-mist">Nenhum barco ainda.</p>}
        <ul className="mt-2 space-y-3">
          {boats.map((b) => <BoatCard key={b.id} boat={b} trip={voyages.find((v) => v.boat_id === b.id)} {...{ base, run, busy, seas, lands, sceneName, onViewScene, now, scene, onChanged }} />)}
        </ul>
        {ports.length > 0 && (
          <div className="mt-3 border-t-2 border-lead pt-3">
            <p className="font-bold">Novo barco neste porto</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className="text-xs text-mist">Tipo
                <select className="field !mt-1 py-1 text-sm" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                  {BOAT_TYPE_LIST.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.capacity} pessoas)</option>)}
                </select>
              </label>
              <label className="text-xs text-mist">Porto
                <select className="field !mt-1 py-1 text-sm" value={draft.portId || ports[0]?.id} onChange={(e) => setDraft((d) => ({ ...d, portId: e.target.value }))}>
                  {ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="col-span-2 text-xs text-mist">Nome
                <input className="field !mt-1 py-1 text-sm" value={draft.name} maxLength={60} placeholder={boatType(draft.type).name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </label>
            </div>
            <button type="button" className="btn btn-lit mt-2 w-full" disabled={busy} onClick={createBoat}><Plus size={15} /> Colocar barco</button>
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl"><Waves size={18} className="text-ember" /> Mares</h2>
        <p className="text-mist">O mar é um mapa como os outros: gere um aqui ou desenhe no editor (marque “mar” gerando por aqui e depois ajuste).</p>
        <ul className="mt-1 space-y-1">
          {seas.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{s.name} <span className="text-xs text-mist">({s.tiles.cols}×{s.tiles.rows})</span></span>
              <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" onClick={() => onViewScene(s.id)}><Eye size={13} /> Ver</button>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[['pequeno', 'Mar pequeno'], ['medio', 'Mar médio']].map(([size, label]) => (
            <button key={size} type="button" className="btn btn-glass" disabled={busy} onClick={() => run(async () => {
              const tiles = generateSea({ size, islands: size === 'pequeno' ? 3 : 5, seed: Date.now() });
              await api.post(`${base}/scenes`, { name: `Mar aberto ${seas.length + 1}`, grid_size: 70, tiles, width: tiles.cols * 70, height: tiles.rows * 70, mode: 'exploration' });
              onChanged?.();
            }, 'Mar gerado.')}><Plus size={14} /> {label}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BoatCard({ boat, trip, base, run, busy, seas, lands, sceneName, onViewScene, now, scene, onChanged }) {
  const t = boatType(boat.type);
  const [plan, setPlan] = useState({ seaSceneId: '', toSceneId: '', toPortId: '', factor: 1 });
  const dest = lands.find((s) => s.id === (plan.toSceneId || lands.find((x) => x.id !== boat.home_scene_id)?.id));
  const seaId = plan.seaSceneId || seas[0]?.id;
  const sea = seas.find((s) => s.id === seaId);
  const where = trip ? `no mar (${sceneName(trip.sea_scene_id)})` : boat.home_scene_id ? `em ${sceneName(boat.home_scene_id)}` : 'sem lugar';
  const [monster, setMonster] = useState(SEA_MONSTERS[0].name);
  const progress = trip ? voyageProgress(trip, now()) : 0;
  const route = useMemo(() => (sea ? seaRoute(sea.tiles) : null), [sea]);

  // recarrega a cena aberta antes de trocar de vista (senao a resposta velha chega depois)
  const post = (path, body, ok, after) => run(async () => { const { data } = await api.post(`${base}/${path}`, body); await onChanged?.(); after?.(data); return data; }, ok);
  return (
    <li className="border-[3px] border-lead bg-black/30 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-bold"><Ship size={14} className="mr-1 inline text-[#5cb8e0]" />{boat.name} <span className="text-xs font-normal text-mist">· {t.name} · {where}</span></p>
        {!trip && <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" disabled={busy} aria-label={`Apagar ${boat.name}`} onClick={() => { if (window.confirm(`Apagar o barco ${boat.name}? O convés e o porão somem junto.`)) run(async () => { await api.delete(`${base}/boats/${boat.id}`); onChanged?.(); }, 'Barco apagado.'); }}><Trash2 size={14} /></button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {boat.deck_scene_id && <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" onClick={() => onViewScene(boat.deck_scene_id)}><Eye size={13} /> Convés</button>}
        {boat.hold_scene_id && <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" onClick={() => onViewScene(boat.hold_scene_id)}><Eye size={13} /> {t.id === 'veleiro' ? 'Cabine' : 'Porão'}</button>}
        {boat.home_scene_id && !trip && <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" onClick={() => onViewScene(boat.home_scene_id)}><Anchor size={13} /> Porto</button>}
        <button type="button" className="btn btn-lit !min-h-8 px-2 text-xs" disabled={busy || !boat.home_scene_id} onClick={() => post(`boats/${boat.id}/embark`, scene?.id === boat.home_scene_id ? {} : {}, 'Todos embarcados.', (d) => onViewScene(d.sceneId))} title="Leva todos os personagens do mapa do porto para o convés">Embarcar todos</button>
        {!trip && <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" disabled={busy} onClick={() => post(`boats/${boat.id}/disembark`, {}, 'Todos desceram no porto.', (d) => onViewScene(d.sceneId))}>Desembarcar</button>}
      </div>

      {!trip && (
        <div className="mt-2 border-t-2 border-lead pt-2">
          {!seas.length ? <p className="text-xs text-mist">Gere um mar (embaixo) para viajar.</p> : (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-mist">Mar
                <select className="field !mt-1 py-1 text-sm" value={seaId} onChange={(e) => setPlan((p) => ({ ...p, seaSceneId: e.target.value }))}>
                  {seas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-mist">Destino
                <select className="field !mt-1 py-1 text-sm" value={dest?.id || ''} onChange={(e) => setPlan((p) => ({ ...p, toSceneId: e.target.value, toPortId: '' }))}>
                  {lands.filter((s) => s.id !== boat.home_scene_id).map((s) => <option key={s.id} value={s.id}>{s.name}{s.tiles.ports?.length ? ' ⚓' : ''}</option>)}
                </select>
              </label>
              {dest?.tiles.ports?.length > 0 && (
                <label className="text-xs text-mist">Porto de chegada
                  <select className="field !mt-1 py-1 text-sm" value={plan.toPortId || dest.tiles.ports[0].id} onChange={(e) => setPlan((p) => ({ ...p, toPortId: e.target.value }))}>
                    {dest.tiles.ports.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              )}
              <label className="text-xs text-mist">Velocidade
                <select className="field !mt-1 py-1 text-sm" value={plan.factor} onChange={(e) => setPlan((p) => ({ ...p, factor: Number(e.target.value) }))}>
                  {SPEED_STEPS.map(([l, f]) => <option key={f} value={f}>{l}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-lit col-span-2" disabled={busy || !dest || !sea} onClick={() => post(`boats/${boat.id}/voyage`, {
                seaSceneId: sea.id, toSceneId: dest.id, ...(plan.toPortId || dest.tiles.ports?.[0] ? { toPortId: plan.toPortId || dest.tiles.ports[0].id } : {}),
                route, speed: t.speed * plan.factor
              }, `${boat.name} zarpou para ${dest.name}.`)}><Ship size={15} /> Zarpar</button>
              {!dest && <p className="col-span-2 text-xs text-mist">Crie outro mapa em pixel art para ser o destino.</p>}
            </div>
          )}
        </div>
      )}

      {trip && (
        <div className="mt-2 space-y-2 border-t-2 border-lead pt-2">
          <p className="text-xs text-mist">Para {trip.to_name || '?'} · {Math.round(progress * 100)}% · {trip.status === 'paused' ? 'parado' : progress >= 1 ? 'chegando' : 'navegando'}</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" onClick={() => onViewScene(trip.sea_scene_id)}><Waves size={13} /> Ver o mar</button>
            <button type="button" className="btn btn-glass !min-h-8 px-2 text-xs" disabled={busy} onClick={() => run(() => api.patch(`${base}/voyages/${trip.id}`, { status: trip.status === 'sailing' ? 'paused' : 'sailing' }), trip.status === 'sailing' ? 'Barco parado.' : 'Navegando.')}>
              {trip.status === 'sailing' ? <><Pause size={13} /> Parar</> : <><Play size={13} /> Navegar</>}
            </button>
            {SPEED_STEPS.map(([l, f]) => (
              <button key={f} type="button" className={`btn !min-h-8 px-2 text-xs ${Math.abs(trip.speed - t.speed * f) < 0.01 ? 'btn-lit' : 'btn-glass'}`} disabled={busy} onClick={() => run(() => api.patch(`${base}/voyages/${trip.id}`, { speed: t.speed * f }))}>{l}</button>
            ))}
          </div>
          <div className="flex gap-1">
            <select className="field !mt-0 flex-1 py-1 text-sm" value={monster} onChange={(e) => setMonster(e.target.value)} aria-label="Monstro do mar">
              {SEA_MONSTERS.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <button type="button" className="btn btn-glass !min-h-9 px-2 text-xs" disabled={busy} onClick={() => run(async () => {
              const m = SEA_MONSTERS.find((x) => x.name === monster);
              const seaScene = seas.find((s) => s.id === trip.sea_scene_id);
              const at = pointAt(trip.route, voyageProgress(trip, now()));
              const grid = seaScene?.grid_size || 70;
              const x = Math.max(0, Math.min((seaScene?.tiles.cols || 40) - 1, Math.round(at.x + 3)));
              const y = Math.max(0, Math.min((seaScene?.tiles.rows || 30) - 1, Math.round(at.y + (at.y > 4 ? -3 : 3))));
              await api.post(`${base}/scenes/${trip.sea_scene_id}/tokens`, { kind: 'monster', name: m.name, x: x * grid, y: y * grid, size: m.hp >= 60 ? 2 : 1, hp_current: m.hp, hp_max: m.hp });
            }, `${monster} surgiu perto do barco.`)}><Skull size={13} /> Soltar</button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" className="btn btn-lit !min-h-9 text-xs" disabled={busy} onClick={() => post(`voyages/${trip.id}/arrive`, {}, 'Chegaram ao destino.', (d) => onViewScene(d.sceneId))}><Flag size={13} /> Chegar ao destino</button>
            <button type="button" className="btn btn-glass !min-h-9 text-xs" disabled={busy} onClick={() => { if (window.confirm('Voltar ao porto de origem? Todos continuam a bordo.')) post(`voyages/${trip.id}/return`, {}, 'O barco voltou ao porto.'); }}><Undo2 size={13} /> Voltar ao porto</button>
          </div>
        </div>
      )}
    </li>
  );
}
