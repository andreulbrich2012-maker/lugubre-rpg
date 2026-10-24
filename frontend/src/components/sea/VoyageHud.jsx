import { useCallback, useEffect, useState } from 'react';
import { Anchor, ArrowDownToLine, ArrowUpFromLine, Ship, Waves } from 'lucide-react';
import Board from '../vtt/Board';
import BoatLayer from './BoatLayer';
import { api } from '../../lib/api';
import { voyageLabel, voyageProgress } from '../../lib/sea/route';

// Faixa da viagem (de X para Y, progresso), botao Mar/Convés, porão e subir/descer do barco.
// O jogador ve o mar numa segunda mesa so de olhar (o barco andando e os monstros da agua).

function Progress({ voyage, now }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (voyage.status !== 'sailing') return undefined;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [voyage.status]);
  const p = voyageProgress(voyage, now());
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="h-2 w-24 shrink-0 overflow-hidden border-2 border-lead bg-black/60" role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da viagem">
        <span className="block h-full bg-[#5cb8e0]" style={{ width: `${p * 100}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(p * 100)}%</span>
      <span className="text-mist">{voyageLabel(voyage, now())}</span>
    </span>
  );
}

function SeaView({ campaignId, sceneId, voyage, subscribe }) {
  const [scene, setScene] = useState(null);
  const [tokens, setTokens] = useState([]);
  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api.get(`/campaigns/${campaignId}/scenes/${sceneId}`), api.get(`/campaigns/${campaignId}/scenes/${sceneId}/tokens`)]);
      setScene(s.data); setTokens(t.data);
    } catch { /* viagem acabou */ }
  }, [campaignId, sceneId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribe((ev) => {
    const p = ev.payload || {};
    if (ev.type === 'token:moved' && p.sceneId === sceneId) setTokens((cur) => cur.map((t) => (t.id === p.tokenId ? { ...t, x: p.x, y: p.y } : t)));
    else if (ev.type === 'token:updated' && (p.token?.scene_id === sceneId || p.removed)) load();
    else if (ev.type === 'token:removed' && p.sceneId === sceneId) setTokens((cur) => cur.filter((t) => t.id !== p.tokenId));
  }), [subscribe, sceneId, load]);
  if (!scene) return <div className="absolute inset-0 z-[15] grid place-items-center bg-[#0b2a4a] text-mist">Olhando o mar…</div>;
  return (
    <div className="absolute inset-0 z-[15]">
      <Board scene={scene} tokens={tokens} isMaster={false} canMove={() => false} onSelect={() => {}} onMove={() => {}} mapLayer={<BoatLayer scene={scene} boats={voyage.boats} voyages={voyage.voyages} now={voyage.now} />} />
    </div>
  );
}

export default function VoyageHud({ campaignId, scene, isMaster, myToken, voyage, notify, onViewScene }) {
  const { boats, voyages, now, subscribe } = voyage;
  const [seaOpen, setSeaOpen] = useState(false);
  const aboard = scene && boats.find((b) => b.deck_scene_id === scene.id || b.hold_scene_id === scene.id);
  const trip = aboard && voyages.find((v) => v.boat_id === aboard.id);
  useEffect(() => { if (!trip) setSeaOpen(false); }, [trip]);
  // jogador no mapa do porto perto de um barco atracado: botao para subir
  const cell = scene?.grid_size || 70;
  const nearBoat = !aboard && myToken && boats.find((b) => b.home_scene_id === scene?.id && !voyages.some((v) => v.boat_id === b.id)
    && Math.hypot((myToken.x + cell / 2) / cell - (b.x + 0.5), (myToken.y + cell / 2) / cell - (b.y + 0.5)) <= 3.5);
  const seaHere = scene && voyages.find((v) => v.sea_scene_id === scene.id);
  const act = async (path, ok) => {
    try {
      const { data } = await api.post(`/campaigns/${campaignId}/boats/${(aboard || nearBoat).id}/${path}`, isMaster && myToken ? { tokenId: myToken.id } : {});
      if (data?.requested) { notify('Pedido enviado ao mestre…'); return; }
      if (ok) notify(ok);
      if (data?.sceneId) onViewScene?.(data.sceneId);
    } catch (err) { notify(err.response?.data?.message || 'Não deu.', 'error'); }
  };
  if (!aboard && !nearBoat && !seaHere && !voyage.pick) return null;
  return (
    <>
      {seaOpen && trip && !isMaster && (
        <SeaView campaignId={campaignId} sceneId={trip.sea_scene_id} voyage={voyage} subscribe={subscribe} />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-3">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 border-[3px] border-lead bg-abyss/90 px-3 py-1.5 text-sm text-bone shadow-lg">
          {voyage.pick && <span className="font-bold text-ember">{voyage.pick.label}</span>}
          {trip && (
            <>
              <span className="flex items-center gap-1 font-bold"><Ship size={15} className="text-[#5cb8e0]" /> {aboard.name}</span>
              <span className="min-w-0 truncate text-mist">de <span className="text-bone">{trip.from_name || '?'}</span> para <span className="text-bone">{trip.to_name || '?'}</span></span>
              <Progress voyage={trip} now={now} />
              {!isMaster && (
                <button type="button" className={`btn !min-h-8 px-2 text-sm ${seaOpen ? 'btn-lit' : 'btn-glass'}`} onClick={() => setSeaOpen((v) => !v)} aria-pressed={seaOpen}>
                  {seaOpen ? <><Anchor size={14} /> Ver o convés</> : <><Waves size={14} /> Ver o mar</>}
                </button>
              )}
              {isMaster && <button type="button" className="btn btn-glass !min-h-8 px-2 text-sm" onClick={() => onViewScene?.(trip.sea_scene_id)}><Waves size={14} /> Ver o mar</button>}
            </>
          )}
          {seaHere && !aboard && (() => {
            const b = boats.find((x) => x.id === seaHere.boat_id);
            return b ? (
              <>
                <span className="flex items-center gap-1 font-bold"><Ship size={15} className="text-[#5cb8e0]" /> {b.name}</span>
                <Progress voyage={seaHere} now={now} />
                <button type="button" className="btn btn-glass !min-h-8 px-2 text-sm" onClick={() => onViewScene?.(b.deck_scene_id)}><Anchor size={14} /> Ver o convés</button>
              </>
            ) : null;
          })()}
          {aboard && !trip && <span className="flex items-center gap-1 font-bold"><Ship size={15} className="text-[#5cb8e0]" /> {aboard.name} <span className="font-normal text-mist">· atracado</span></span>}
          {aboard && aboard.hold_scene_id && myToken && (scene.id === aboard.deck_scene_id
            ? <button type="button" className="btn btn-glass !min-h-8 px-2 text-sm" onClick={() => act('below')}><ArrowDownToLine size={14} /> Descer ao porão</button>
            : <button type="button" className="btn btn-glass !min-h-8 px-2 text-sm" onClick={() => act('above')}><ArrowUpFromLine size={14} /> Subir ao convés</button>)}
          {aboard && !trip && myToken && !isMaster && <button type="button" className="btn btn-glass !min-h-8 px-2 text-sm" onClick={() => act('disembark', 'Você desceu do barco.')}>Descer do barco</button>}
          {nearBoat && !isMaster && <button type="button" className="btn btn-lit !min-h-8 px-2 text-sm" onClick={() => act('board', `Você subiu no ${nearBoat.name}.`)}><Ship size={14} /> Subir no {nearBoat.name}</button>}
        </div>
      </div>
    </>
  );
}
