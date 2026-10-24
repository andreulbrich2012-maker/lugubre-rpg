import { useEffect, useMemo, useRef, useState } from 'react';
import { boatFrames, deckHelm, deckMast, deckSkirt, portSign } from '../../lib/sea/boatSprite';
import { boatType } from '../../lib/sea/boats';
import { isWaterCode, pointAt, voyageProgress } from '../../lib/sea/route';

// Camada do mar dentro da mesa (mesmas coordenadas do mapa): placas dos portos, barcos atracados,
// o barco da viagem andando pela rota e, no convés, costado, mastros e leme por cima das tabuas.
// Tudo em pixel art nativo (16 px por celula) ampliado nitido pelo CSS.

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Pixels({ w, h, data, style, className = '', title }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data) return;
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
  }, [w, h, data]);
  return <canvas ref={ref} className={`pointer-events-none absolute ${className}`} style={{ imageRendering: 'pixelated', ...style }} aria-hidden={title ? undefined : 'true'} title={title} />;
}

// Barco animado (4 quadros; mais rapido navegando). Ancora = linha d'agua no meio do barco.
export function BoatSprite({ type, dir, moving, x, y, cell, label, showLabel = true }) {
  const frames = useMemo(() => boatFrames(type, dir, moving), [type, dir, moving]);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduced()) return undefined;
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), moving ? 170 : 420);
    return () => clearInterval(t);
  }, [moving]);
  const k = cell / 16;
  const left = (x + 0.5) * cell - frames.ax * k;
  const top = (y + 0.5) * cell - frames.ay * k;
  return (
    <>
      <Pixels w={frames.w} h={frames.h} data={frames.frames[frame]} style={{ left, top, width: frames.w * k, height: frames.h * k, zIndex: 10 + Math.floor(y) * 2 }} title={label} />
      {showLabel && label && <span className="vtt-name" style={{ left: (x + 0.5) * cell, top: (y + 0.9) * cell, zIndex: 400, transform: `translate(-50%, 0) scale(${Math.max(1, cell / 70)})` }}>{label}</span>}
    </>
  );
}

// Barco atracado: deitado ao longo da margem (eixo com mais agua) e puxado um pouco para a agua.
function dockPose(tiles, b) {
  const g = tiles?.layers?.ground || [];
  const water = (dx, dy) => { let n = 0; for (let i = 1; i <= 3; i++) if (isWaterCode(g[Math.round(b.y) + dy * i]?.[Math.round(b.x) + dx * i])) n++; return n; };
  const e = water(1, 0); const w = water(-1, 0); const n = water(0, -1); const s = water(0, 1);
  if (e + w >= n + s) return { dir: e >= w ? 'e' : 'w', x: b.x, y: b.y + (n > s ? -0.4 : s > n ? 0.4 : 0) };
  return { dir: s >= n ? 's' : 'n', x: b.x + (w > e ? -0.9 : e > w ? 0.9 : 0), y: b.y };
}

function SeaBoat({ boat, voyage, cell, now, showRoute }) {
  const [t, setT] = useState(() => now());
  const sailing = voyage.status === 'sailing';
  useEffect(() => {
    if (!sailing) return undefined;
    const id = setInterval(() => setT(now()), 120);
    return () => clearInterval(id);
  }, [sailing, now]);
  const p = voyageProgress(voyage, sailing ? t : now());
  const pos = pointAt(voyage.route, p);
  const moving = sailing && p < 1;
  return (
    <>
      {showRoute && (
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" style={{ zIndex: 3 }} width="1" height="1" aria-hidden="true">
          <polyline points={voyage.route.map((q) => `${(q.x + 0.5) * cell},${(q.y + 0.5) * cell}`).join(' ')} fill="none" stroke="rgba(246,232,190,.55)" strokeWidth={cell * 0.08} strokeDasharray={`${cell * 0.3} ${cell * 0.25}`} />
          {voyage.route.length > 0 && <circle cx={(voyage.route.at(-1).x + 0.5) * cell} cy={(voyage.route.at(-1).y + 0.5) * cell} r={cell * 0.3} fill="none" stroke="#f2c14e" strokeWidth={cell * 0.08} />}
        </svg>
      )}
      <BoatSprite type={boat.type} dir={pos.dir} moving={moving} x={pos.x} y={pos.y} cell={cell} label={boat.name} />
    </>
  );
}

function PortSign({ port, cell }) {
  const img = useMemo(() => portSign(), []);
  const k = cell / 16;
  return (
    <>
      <Pixels w={img.w} h={img.h} data={img.data} style={{ left: (port.x + 0.5) * cell - img.ax * k, top: (port.y + 0.85) * cell - img.ay * k, width: img.w * k, height: img.h * k, zIndex: 10 + (port.y + 1) * 2 }} title={port.name} />
      <span className="vtt-name" style={{ left: (port.x + 0.5) * cell, top: (port.y + 0.9) * cell, zIndex: 400 }}>⚓ {port.name}</span>
    </>
  );
}

function DeckProps({ tiles, cell }) {
  const skirt = useMemo(() => deckSkirt(tiles), [tiles]);
  const t = boatType(tiles.vessel?.type);
  const mast = useMemo(() => deckMast(['pesca', 'veleiro'].includes(t.id) ? 'lateen' : 'square', t.id === 'navio' ? 72 : t.id === 'gale' ? 60 : 46), [t.id]);
  const helm = useMemo(() => deckHelm(), []);
  const k = cell / 16;
  const place = (img, x, y, dy, key) => (
    <Pixels key={key} w={img.w} h={img.h} data={img.data} style={{ left: (x + 0.5) * cell - img.ax * k, top: (y + dy) * cell - img.ay * k, width: img.w * k, height: img.h * k, zIndex: 10 + (y + 1) * 2 }} />
  );
  return (
    <>
      <Pixels w={skirt.w} h={skirt.h} data={skirt.data} style={{ left: 0, top: 0, width: tiles.cols * cell, height: tiles.rows * cell, zIndex: 1 }} />
      {(tiles.vessel.masts || []).map((m, i) => place(mast, m.x, m.y, 0.8, `m${i}`))}
      {tiles.vessel.helm && place(helm, tiles.vessel.helm.x, tiles.vessel.helm.y, 0.9, 'helm')}
    </>
  );
}

export default function BoatLayer({ scene, boats = [], voyages = [], now, isMaster }) {
  if (scene?.map_kind !== 'tiles' || !scene.tiles) return null;
  const cell = scene.grid_size || 70;
  const tiles = scene.tiles;
  const sailing = new Set(voyages.map((v) => v.boat_id));
  return (
    <>
      {tiles.vessel?.part === 'deck' && <DeckProps tiles={tiles} cell={cell} />}
      {(tiles.ports || []).map((p) => <PortSign key={p.id} port={p} cell={cell} />)}
      {boats.filter((b) => b.home_scene_id === scene.id && !sailing.has(b.id)).map((b) => (
        (() => { const pose = dockPose(tiles, b); return <BoatSprite key={b.id} type={b.type} dir={pose.dir} moving={false} x={pose.x} y={pose.y} cell={cell} label={b.name} />; })()
      ))}
      {voyages.filter((v) => v.sea_scene_id === scene.id).map((v) => {
        const boat = boats.find((b) => b.id === v.boat_id);
        return boat ? <SeaBoat key={v.id} boat={boat} voyage={v} cell={cell} now={now} showRoute={isMaster} /> : null;
      })}
    </>
  );
}
