import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FxLayer from './FxLayer';
import { drawGrass, drawActor } from '../../lib/fx/stage.js';
import { spellBounds, fitStage } from '../../lib/fx/spells/bounds.js';

// Palco pequeno do grimorio: gramado, conjurador e boneco de treino. Toca uma magia
// do grimorio (spell = id) com resultado e elemento escolhidos. Usa o mesmo FxLayer
// do mapa, entao o que aparece aqui e o que aparece na mesa. Magia alta afasta a
// camera (stageFit) para nao cortar o topo.
const CELL = 48;
const COLS = 7;
const ROWS = 3;
const W = CELL * COLS;
const H = CELL * ROWS;
const UNIT = CELL / 16;
const FROM = { x: 1.5 * CELL, y: 1.7 * CELL };
const TO = { x: 5.5 * CELL, y: 1.7 * CELL };
const NOFIT = { f: 1, g: 1, ox: 0, oy: 0 };

// Magia alta (coluna, olho gigante, dragao, meteoro) nao cabe em 3 celulas: mede a
// caixa da magia (bounds.js), estica o palco para cima (g, ate 2x) e, se ainda nao
// couber, "afasta a camera" (f) com o ceu extra em cima. Cache por magia+resultado.
const fitCache = new Map();
function stageFit(spell, result = 'hit') {
  const key = `${spell}|${result}`;
  if (!fitCache.has(key)) {
    const b = spellBounds({ spell, result, unit: UNIT, cell: CELL, from: FROM, to: TO, seed: 'palco' });
    fitCache.set(key, fitStage(W, H, b));
  }
  return fitCache.get(key);
}

const SpellStage = forwardRef(function SpellStage({ onDone, className = '' }, ref) {
  const fx = useRef(null);
  const bg = useRef(null);
  const actors = useRef(null);
  const shaker = useRef(null);
  const wrap = useRef(null);
  const down = useRef(false);
  const counter = useRef(0);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(NOFIT);
  const fitRef = useRef(NOFIT);
  const VW = Math.round(W * fit.f);
  const VH = Math.round(H * fit.g * fit.f);

  const drawActors = useCallback((tokens = {}) => {
    const c = actors.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const a = tokens.a || { x: 0, y: 0, flash: 0, alpha: 1 };
    const b = tokens.b || { x: 0, y: 0, flash: 0, alpha: 1 };
    const { ox, oy } = fitRef.current;
    ctx.globalAlpha = a.alpha ?? 1;
    drawActor(ctx, 'hero', (FROM.x + ox + a.x) / UNIT, (FROM.y + oy + a.y) / UNIT, { flash: a.flash });
    ctx.globalAlpha = b.alpha ?? 1;
    drawActor(ctx, 'dummy', (TO.x + ox + b.x) / UNIT, (TO.y + oy + b.y) / UNIT, { flash: b.flash, down: down.current });
    ctx.globalAlpha = 1;
  }, []);

  // grama e bonecos de novo quando o tamanho do mundo virtual muda
  useEffect(() => {
    const c = bg.current;
    if (c) drawGrass(c.getContext('2d'), c.width, c.height, 'grimorio');
    drawActors();
  }, [drawActors, fit]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.max(0.6, Math.min(2.5, entry.contentRect.width / W))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    play({ spell, result = 'hit', element = null }) {
      down.current = false;
      fx.current?.clear();
      const nf = stageFit(spell, result);
      fitRef.current = nf;
      setFit(nf);
      const from = { x: FROM.x + nf.ox, y: FROM.y + nf.oy };
      const to = { x: TO.x + nf.ox, y: TO.y + nf.oy };
      fx.current?.play({ spell, result, element: element || null, from, to, fromId: 'a', toId: 'b', seed: `grimorio-${spell}-${++counter.current}` });
    },
    clear() { fx.current?.clear(); down.current = false; drawActors(); }
  }), [drawActors]);

  const onFrame = useCallback(({ shake, tokens }) => {
    if (shaker.current) shaker.current.style.transform = `translate(${shake.x}px, ${shake.y}px)`;
    drawActors(tokens);
  }, [drawActors]);

  const onImpact = useCallback((info) => { if (info.down) down.current = true; }, []);

  return (
    <div ref={wrap} className={`w-full ${className}`}>
      <div className="relative mx-auto overflow-hidden border-[3px] border-lead" style={{ width: W * scale, height: H * fit.g * scale }}>
        <div ref={shaker} className="absolute left-0 top-0 origin-top-left" data-fit={fit.f} style={{ width: VW, height: VH, scale: String(scale / fit.f) }}>
          <canvas ref={bg} width={Math.ceil(VW / UNIT)} height={Math.ceil(VH / UNIT)} className="absolute left-0 top-0" style={{ width: VW, height: VH, imageRendering: 'pixelated' }} aria-hidden="true" />
          <canvas ref={actors} width={Math.ceil(VW / UNIT)} height={Math.ceil(VH / UNIT)} className="absolute left-0 top-0" style={{ width: VW, height: VH, imageRendering: 'pixelated' }} aria-hidden="true" />
          <FxLayer ref={fx} width={VW} height={VH} cell={CELL} onFrame={onFrame} onImpact={onImpact} onDone={onDone} />
        </div>
      </div>
    </div>
  );
});

export default SpellStage;
