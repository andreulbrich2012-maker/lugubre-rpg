import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, LocateFixed, Minus, Plus } from 'lucide-react';
import TileMapCanvas from './TileMapCanvas';
import Crack from '../glass/Crack';
import { isSolid } from '../../lib/tiles/format';

// Mesa virtual: mapa (imagem ou pixel art), grade, tokens, neblina, pings e efeitos de acerto.
// Movimento: arrastar ou WASD/setas na velocidade que o mestre escolheu; em combate o servidor confere o limite.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function Board({
  scene,
  tokens,
  isMaster,
  canMove,
  selectedId,
  onSelect,
  onMove,
  targeting,
  onTarget,
  activeTokenId,
  effects = {},
  pings = [],
  onPing,
  budget
}) {
  const cell = scene?.grid_size || 70;
  const isTiles = scene?.map_kind === 'tiles' && scene?.tiles;
  const width = isTiles ? scene.tiles.cols * cell : scene?.width || cell * 24;
  const height = isTiles ? scene.tiles.rows * cell : scene?.height || cell * 16;
  const viewportRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [local, setLocal] = useState({});
  const localRef = useRef(local);
  localRef.current = local;
  const drag = useRef(null);
  const keys = useRef(new Set());
  const sendTimer = useRef({});

  const tokenPos = useCallback((t) => localRef.current[t.id] || { x: t.x, y: t.y }, []);

  // Centraliza o mapa ao trocar de cena.
  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !width) return;
    const z = clamp(Math.min(el.clientWidth / width, el.clientHeight / height), 0.2, 2);
    setView({ z, x: (el.clientWidth - width * z) / 2, y: (el.clientHeight - height * z) / 2 });
  }, [width, height]);
  useEffect(() => { fit(); }, [scene?.id, fit]);

  // O servidor e a fonte da verdade: quando a posicao oficial alcanca a local, descarta a local.
  useEffect(() => {
    setLocal((cur) => {
      let changed = false;
      const next = { ...cur };
      tokens.forEach((t) => {
        const l = cur[t.id];
        if (l && Math.abs(l.x - t.x) < 1 && Math.abs(l.y - t.y) < 1) { delete next[t.id]; changed = true; }
      });
      return changed ? next : cur;
    });
  }, [tokens]);

  const queueSend = useCallback((token, pos, final) => {
    const s = sendTimer.current;
    s.pending = { token, pos };
    if (final) {
      clearTimeout(s.t);
      s.t = null;
      onMove(token, pos.x, pos.y, { final: true });
      return;
    }
    if (s.t) return;
    s.t = setTimeout(() => {
      s.t = null;
      if (s.pending) onMove(s.pending.token, s.pending.pos.x, s.pending.pos.y, { final: false });
    }, 125);
  }, [onMove]);

  const blocked = useCallback((token, x, y) => {
    if (!isTiles) return false;
    const size = token.size || 1;
    for (let dx = 0; dx < size; dx += 1) {
      for (let dy = 0; dy < size; dy += 1) {
        const cx = Math.floor((x + 1) / cell) + dx;
        const cy = Math.floor((y + 1) / cell) + dy;
        if (cx < 0 || cy < 0 || cx >= scene.tiles.cols || cy >= scene.tiles.rows) return true;
        if (isSolid(scene.tiles, cx, cy)) return true;
      }
    }
    return false;
  }, [isTiles, cell, scene]);

  // WASD / setas: anda com o token selecionado.
  const selected = tokens.find((t) => t.id === selectedId);
  const selectedMovable = Boolean(selected && canMove(selected));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    if (!selectedMovable) return undefined;
    const speed = Number(scene?.move_speed) || 6;
    const grid = scene?.move_mode === 'grid';
    let frame;
    let last = performance.now();
    let acc = 0;
    let moving = false;
    const dirs = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const token = selectedRef.current;
      let dx = 0;
      let dy = 0;
      keys.current.forEach((k) => { if (dirs[k]) { dx += dirs[k][0]; dy += dirs[k][1]; } });
      if (token && (dx || dy)) {
        const pos = tokenPos(token);
        let nx = pos.x;
        let ny = pos.y;
        if (grid) {
          // Primeiro passo na hora; os seguintes no ritmo da velocidade (celulas por segundo).
          acc = moving ? acc + dt * speed : 1;
          if (acc >= 1) {
            acc -= 1;
            nx = Math.round(pos.x / cell) * cell + Math.sign(dx) * cell;
            ny = Math.round(pos.y / cell) * cell + Math.sign(dy) * cell;
          }
        } else {
          const len = Math.hypot(dx, dy);
          nx = pos.x + (dx / len) * speed * cell * dt;
          ny = pos.y + (dy / len) * speed * cell * dt;
        }
        moving = true;
        if (nx !== pos.x || ny !== pos.y) {
          let target = { x: clamp(nx, 0, width - cell), y: clamp(ny, 0, height - cell) };
          // Bateu na parede em diagonal: tenta deslizar pelo eixo livre.
          if (blocked(token, target.x, target.y)) {
            if (!blocked(token, target.x, pos.y)) target = { x: target.x, y: pos.y };
            else if (!blocked(token, pos.x, target.y)) target = { x: pos.x, y: target.y };
            else target = null;
          }
          if (target && (!budget || budget(token, target))) {
            setLocal((cur) => ({ ...cur, [token.id]: target }));
            localRef.current = { ...localRef.current, [token.id]: target };
            queueSend(token, target, false);
          }
        }
      } else if (moving) {
        moving = false;
        acc = 0;
        if (token) queueSend(token, tokenPos(token), true);
      }
      frame = requestAnimationFrame(step);
    };

    const typing = (e) => /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    const down = (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (dirs[k]) { e.preventDefault(); keys.current.add(k); }
    };
    const up = (e) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      keys.current.clear();
    };
  }, [selectedMovable, scene?.move_speed, scene?.move_mode, cell, width, height, blocked, tokenPos, queueSend, budget]);

  function toMap(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left - view.x) / view.z, y: (event.clientY - rect.top - view.y) / view.z };
  }

  function onWheel(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    setView((v) => {
      const z = clamp(v.z * (event.deltaY < 0 ? 1.12 : 1 / 1.12), 0.15, 4);
      return { z, x: mx - ((mx - v.x) / v.z) * z, y: my - ((my - v.y) / v.z) * z };
    });
  }

  function zoomBy(f) {
    const el = viewportRef.current;
    const mx = el.clientWidth / 2;
    const my = el.clientHeight / 2;
    setView((v) => {
      const z = clamp(v.z * f, 0.15, 4);
      return { z, x: mx - ((mx - v.x) / v.z) * z, y: my - ((my - v.y) / v.z) * z };
    });
  }

  function onPointerDownBg(event) {
    if (event.altKey || event.button === 1) {
      event.preventDefault();
      const p = toMap(event);
      onPing?.(p.x, p.y);
      return;
    }
    drag.current = { kind: 'pan', sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerDownToken(event, token) {
    event.stopPropagation();
    if (targeting) {
      onTarget?.(token);
      return;
    }
    onSelect?.(token.id);
    if (!canMove(token)) return;
    const p = toMap(event);
    const pos = tokenPos(token);
    drag.current = { kind: 'token', token, ox: p.x - pos.x, oy: p.y - pos.y, start: pos };
    viewportRef.current.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pan') {
      setView((v) => ({ ...v, x: d.vx + event.clientX - d.sx, y: d.vy + event.clientY - d.sy }));
    } else {
      const p = toMap(event);
      const pos = { x: clamp(p.x - d.ox, 0, width - cell), y: clamp(p.y - d.oy, 0, height - cell) };
      d.moved = true;
      setLocal((cur) => ({ ...cur, [d.token.id]: pos }));
      localRef.current = { ...localRef.current, [d.token.id]: pos };
    }
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.kind !== 'token' || !d.moved) return;
    const raw = localRef.current[d.token.id];
    if (!raw) return;
    const snap = scene?.move_mode === 'grid';
    let pos = snap ? { x: Math.round(raw.x / cell) * cell, y: Math.round(raw.y / cell) * cell } : raw;
    if (blocked(d.token, pos.x, pos.y) || (budget && !budget(d.token, pos))) pos = d.start;
    setLocal((cur) => ({ ...cur, [d.token.id]: pos }));
    if (pos !== d.start) onMove(d.token, pos.x, pos.y, { final: true });
  }

  const reveals = scene?.fog_reveals || [];
  const fogOn = scene?.fog_enabled;
  const sortedTokens = useMemo(() => [...tokens].sort((a, b) => (a.kind === 'marker' ? 0 : 1) - (b.kind === 'marker' ? 0 : 1)), [tokens]);

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-[#050407]">
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none ${targeting ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onWheel={onWheel}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Mesa virtual. Arraste para mover o mapa, roda do mouse para zoom, WASD para andar com o token selecionado, Alt+clique para marcar um ponto."
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {isTiles ? (
            <TileMapCanvas map={scene.tiles} cellSize={cell} showGrid={Boolean(scene.show_grid)} className="absolute inset-0" />
          ) : scene?.map_url ? (
            <img src={scene.map_url} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-fill" />
          ) : (
            <div className="absolute inset-0 bg-[#0e0c12]" />
          )}
          {!isTiles && scene?.show_grid && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.55) 1px, transparent 1px)',
                backgroundSize: `${cell}px ${cell}px`,
                backgroundPosition: `${scene?.grid_offset_x || 0}px ${scene?.grid_offset_y || 0}px`
              }}
            />
          )}

          {sortedTokens.map((t) => {
            const pos = local[t.id] || { x: t.x, y: t.y };
            const size = (t.size || 1) * cell;
            const fx = effects[t.id];
            const down = t.conditions?.includes('caído') || fx?.down;
            const active = t.id === activeTokenId;
            return (
              <button
                key={t.id}
                type="button"
                onPointerDown={(e) => onPointerDownToken(e, t)}
                onKeyDown={(e) => { if (e.key === 'Enter' && targeting) onTarget?.(t); }}
                aria-label={`${t.name}${t.hidden ? ' (oculto dos jogadores)' : ''}${active ? ', turno atual' : ''}`}
                aria-pressed={t.id === selectedId}
                className={`vtt-token absolute ${t.id === selectedId ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${t.hidden ? 'is-hidden' : ''} ${down ? 'is-down' : ''} ${targeting ? 'is-targetable' : ''}`}
                style={{ left: pos.x, top: pos.y, width: size, height: size, '--tc': t.color || '#a4781a', transition: local[t.id] ? 'none' : 'left .25s cubic-bezier(.16,1,.3,1), top .25s cubic-bezier(.16,1,.3,1)' }}
              >
                <span key={fx?.n} className={`vtt-token-face ${fx?.n && fx?.hit ? 'hit-shake' : ''}`}>
                  {t.image_url ? <img src={t.image_url} alt="" draggable={false} className="h-full w-full object-cover" /> : <span className="font-display" style={{ fontSize: size * 0.42 }}>{t.name?.slice(0, 1)}</span>}
                  <Crack on={Boolean(fx?.hit)} seed={fx?.n || 0} />
                </span>
                {t.conditions?.length > 0 && (
                  <span className="vtt-conditions">{t.conditions.slice(0, 3).map((c) => <span key={c}>{c.slice(0, 3)}</span>)}</span>
                )}
                {fx?.label && <span key={`l${fx.n}`} className="vtt-float font-display">{fx.label}</span>}
                <span className="vtt-name">{t.name}</span>
              </button>
            );
          })}

          {fogOn && (
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
              <defs>
                <mask id={`fog-${scene.id}`}>
                  <rect width={width} height={height} fill="white" />
                  {reveals.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />)}
                </mask>
              </defs>
              <rect width={width} height={height} fill="#030204" opacity={isMaster ? 0.55 : 1} mask={`url(#fog-${scene.id})`} />
            </svg>
          )}

          {pings.map((p) => (
            <span key={p.id} className="vtt-ping" style={{ left: p.x, top: p.y, '--pc': p.color || 'var(--color-ember)' }} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => zoomBy(1.25)} aria-label="Aproximar"><Plus size={18} /></button>
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => zoomBy(0.8)} aria-label="Afastar"><Minus size={18} /></button>
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={fit} aria-label="Centralizar mapa"><LocateFixed size={18} /></button>
      </div>
      {targeting && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <p className="flex items-center gap-2 border-[3px] border-lead bg-abyss/95 px-4 py-2 font-bold text-ember"><Crosshair size={18} /> Escolha o alvo no mapa (Esc cancela)</p>
        </div>
      )}
    </div>
  );
}
