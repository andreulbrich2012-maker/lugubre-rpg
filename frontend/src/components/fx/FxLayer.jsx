import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { createPlayer } from '../../lib/fx/player.js';

// Camada de efeitos (golpes e magias) em pixel art. Fica DENTRO da camada do mapa
// que ja recebe translate/scale(view.z), entao trabalha em px do mapa: o zoom vem
// de graca e o canvas interno usa 1 pixel por "pixel de arte" (celula/16), ampliado
// com image-rendering: pixelated para ficar nitido como os tiles.
//
// Uso (ref imperativa):
//   const fx = useRef();
//   <FxLayer ref={fx} width={w} height={h} cell={cell} onFrame={...} onImpact={...} />
//   fx.current.play({ kind: 'corte', from: {x,y}, to: {x,y}, element: 'Érebo', result: 'hit', seed: rollId })
//   fx.current.attack(opts)  // evento roll
//   fx.current.impact(opts)  // evento token:hit (espera o ataque do mesmo seed chegar)
//
// onFrame({ shake: {x,y}, tokens: { [tokenId]: {x,y,flash} } }) a cada quadro com efeito
// ativo (e uma vez zerado no fim), para o Board tremer o mapa e empurrar/piscar tokens.
// area ({x, y, w, h} em px do mapa, opcional): mapa grande (ate 1000x1000 celulas) nao cabe
// num canvas so; o canvas cobre so essa janela (a vista) e o desenho e deslocado para ela.
const FxLayer = forwardRef(function FxLayer({ width, height, cell = 64, pixel, reducedMotion, onImpact, onFrame, onDone, area, className = '', style }, ref) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const cb = useRef({ onImpact, onFrame, onDone });
  cb.current = { onImpact, onFrame, onDone };
  const unit = pixel || Math.max(1, cell / 16);
  // janela alinhada ao pixel de arte (unit) para o efeito nao tremer ao mover a vista
  const ax = area ? Math.max(0, Math.floor(area.x / unit)) : 0;
  const ay = area ? Math.max(0, Math.floor(area.y / unit)) : 0;
  const cw = Math.max(1, area ? Math.min(Math.ceil(width / unit) - ax, Math.ceil(area.w / unit) + 1) : Math.ceil(width / unit));
  const ch = Math.max(1, area ? Math.min(Math.ceil(height / unit) - ay, Math.ceil(area.h / unit) + 1) : Math.ceil(height / unit));
  const offRef = useRef([0, 0]);
  offRef.current = [ax, ay];

  const reduced = useMemo(() => {
    if (reducedMotion != null) return reducedMotion;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  }, [reducedMotion]);

  const player = useMemo(() => createPlayer({
    unit,
    cell,
    reduced,
    onImpact: (info) => cb.current.onImpact?.(info),
    onDone: (info) => cb.current.onDone?.(info)
  }), [unit, cell, reduced]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function loop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, -offRef.current[0], -offRef.current[1]);
    const frame = player.step(ctx, performance.now());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cb.current.onFrame?.(frame);
    if (frame.active) rafRef.current = requestAnimationFrame(loop);
    else {
      rafRef.current = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function kick() {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
  }

  useImperativeHandle(ref, () => ({
    play(opts) { const id = player.play(opts, performance.now()); kick(); return id; },
    attack(opts) { const id = player.attack(opts, performance.now()); kick(); return id; },
    impact(opts) { const id = player.impact(opts, performance.now()); kick(); return id; },
    clear() { player.clear(); kick(); }
  }), [player]);

  return (
    <canvas
      ref={canvasRef}
      width={cw}
      height={ch}
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 top-0 ${className}`}
      style={{ width: cw * unit, height: ch * unit, imageRendering: 'pixelated', ...(area ? { left: ax * unit, top: ay * unit } : {}), ...style }}
    />
  );
});

export default FxLayer;
