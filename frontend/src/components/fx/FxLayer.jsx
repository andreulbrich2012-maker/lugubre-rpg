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
const FxLayer = forwardRef(function FxLayer({ width, height, cell = 64, pixel, reducedMotion, onImpact, onFrame, onDone, className = '', style }, ref) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const cb = useRef({ onImpact, onFrame, onDone });
  cb.current = { onImpact, onFrame, onDone };
  const unit = pixel || Math.max(1, cell / 16);
  const cw = Math.max(1, Math.ceil(width / unit));
  const ch = Math.max(1, Math.ceil(height / unit));

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frame = player.step(ctx, performance.now());
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
      style={{ width: cw * unit, height: ch * unit, imageRendering: 'pixelated', ...style }}
    />
  );
});

export default FxLayer;
