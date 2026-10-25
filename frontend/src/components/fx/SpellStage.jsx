import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FxLayer from './FxLayer';
import { drawGrass, drawActor } from '../../lib/fx/stage.js';

// Palco pequeno do grimorio: gramado, conjurador e boneco de treino. Toca uma magia
// do grimorio (spell = id) com resultado e elemento escolhidos. Usa o mesmo FxLayer
// do mapa, entao o que aparece aqui e o que aparece na mesa.
const CELL = 48;
const COLS = 7;
const ROWS = 3;
const W = CELL * COLS;
const H = CELL * ROWS;
const UNIT = CELL / 16;
const FROM = { x: 1.5 * CELL, y: 1.7 * CELL };
const TO = { x: 5.5 * CELL, y: 1.7 * CELL };

const SpellStage = forwardRef(function SpellStage({ onDone, className = '' }, ref) {
  const fx = useRef(null);
  const bg = useRef(null);
  const actors = useRef(null);
  const shaker = useRef(null);
  const wrap = useRef(null);
  const down = useRef(false);
  const counter = useRef(0);
  const [scale, setScale] = useState(1);

  const drawActors = useCallback((tokens = {}) => {
    const c = actors.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    const a = tokens.a || { x: 0, y: 0, flash: 0, alpha: 1 };
    const b = tokens.b || { x: 0, y: 0, flash: 0, alpha: 1 };
    ctx.globalAlpha = a.alpha ?? 1;
    drawActor(ctx, 'hero', (FROM.x + a.x) / UNIT, (FROM.y + a.y) / UNIT, { flash: a.flash });
    ctx.globalAlpha = b.alpha ?? 1;
    drawActor(ctx, 'dummy', (TO.x + b.x) / UNIT, (TO.y + b.y) / UNIT, { flash: b.flash, down: down.current });
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    const c = bg.current;
    if (c) drawGrass(c.getContext('2d'), c.width, c.height, 'grimorio');
    drawActors();
  }, [drawActors]);

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
      fx.current?.play({ spell, result, element: element || null, from: FROM, to: TO, fromId: 'a', toId: 'b', seed: `grimorio-${spell}-${++counter.current}` });
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
      <div className="relative mx-auto overflow-hidden border-[3px] border-lead" style={{ width: W * scale, height: H * scale }}>
        <div ref={shaker} className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, scale: String(scale) }}>
          <canvas ref={bg} width={W / UNIT} height={H / UNIT} className="absolute left-0 top-0" style={{ width: W, height: H, imageRendering: 'pixelated' }} aria-hidden="true" />
          <canvas ref={actors} width={W / UNIT} height={H / UNIT} className="absolute left-0 top-0" style={{ width: W, height: H, imageRendering: 'pixelated' }} aria-hidden="true" />
          <FxLayer ref={fx} width={W} height={H} cell={CELL} onFrame={onFrame} onImpact={onImpact} onDone={onDone} />
        </div>
      </div>
    </div>
  );
});

export default SpellStage;
