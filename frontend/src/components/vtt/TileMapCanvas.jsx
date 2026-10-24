import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { drawMap, FRAME_MS, MapRenderer } from '../../lib/tiles/render';

// Mapa de blocos em <canvas>, pixel nitido. So anima (agua, fogo, portal) quando a vista tem
// bloco animado, a aba esta visivel e a pessoa nao pediu menos movimento.
//
// Mapa grande (ate 1000x1000 celulas): com `viewport` ({x, y, w, h} em px do mapa, o mesmo
// sistema de cellSize) e `scale` (px de tela por px do mapa), o canvas cobre so a vista (com
// folga) na resolucao da tela, dentro de uma <div> do tamanho do mapa inteiro (os eventos de
// ponteiro continuam no mapa todo). O desenho e em pedacos cacheados (render.js/chunks.js):
// pintar uma celula refaz so os pedacos em volta; o que ainda nao ficou pronto aparece na
// miniatura e e completado nos proximos instantes, sem travar a tela.
const SNAP = 8; // a janela anda de 8 em 8 celulas: arrastar dentro dela nao redesenha nada
const MAX_BACKING = 6000; // lado maximo do canvas (px)
const BIG = 4096; // acima disso (px de CSS) o mapa vira janela/pedacos

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function windowFor(map, cellSize, viewport, scale) {
  const { cols, rows } = map;
  const x0 = clamp(Math.floor(viewport.x / cellSize / SNAP) * SNAP - SNAP, 0, cols);
  const y0 = clamp(Math.floor(viewport.y / cellSize / SNAP) * SNAP - SNAP, 0, rows);
  const x1 = clamp(Math.ceil((viewport.x + viewport.w) / cellSize / SNAP) * SNAP + SNAP, 0, cols);
  const y1 = clamp(Math.ceil((viewport.y + viewport.h) / cellSize / SNAP) * SNAP + SNAP, 0, rows);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  let P = Math.min(64, cellSize * scale * dpr);
  // degraus de 1/4 de oitava: a roda do mouse nao realoca o canvas a cada tique
  P = 2 ** (Math.round(Math.log2(Math.max(P, 0.25)) * 4) / 4);
  P = Math.min(P, MAX_BACKING / Math.max(1, x1 - x0), MAX_BACKING / Math.max(1, y1 - y0));
  return { x0, y0, x1: Math.max(x0 + 1, x1), y1: Math.max(y0 + 1, y1), P };
}

const TileMapCanvas = forwardRef(function TileMapCanvas({ map, cellSize = 48, showGrid = false, roofs = false, viewport, scale = 1, buildingBlocks = false, className = '', style, ...rest }, ref) {
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);
  const rendererRef = useRef(null);
  if (!rendererRef.current) rendererRef.current = new MapRenderer();
  useEffect(() => {
    const r = rendererRef.current;
    // so em desenvolvimento: window.__tileRenderers para medir memoria dos pedacos (r.stats)
    if (import.meta.env?.DEV) (window.__tileRenderers ||= new Set()).add(r);
    return () => { r.dispose(); window.__tileRenderers?.delete(r); };
  }, []);

  const cols = map?.cols || 0;
  const rows = map?.rows || 0;
  const big = cols * cellSize > BIG || rows * cellSize > BIG;
  const windowed = Boolean(viewport && big && cols);
  let geo;
  if (windowed) geo = windowFor(map, cellSize, viewport, scale);
  else {
    // sem vista: mapa grande desenha em ate 16 px/celula (nativo) e o CSS amplia nitido; enorme vira miniatura
    const P = big ? Math.max(1, Math.min(16, Math.floor(BIG / Math.max(cols, rows, 1)))) : cellSize;
    geo = { x0: 0, y0: 0, x1: cols, y1: rows, P };
  }
  const { x0, y0, x1, y1, P } = geo;
  const bw = Math.max(1, Math.round((x1 - x0) * P));
  const bh = Math.max(1, Math.round((y1 - y0) * P));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cols) return undefined;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let timer = 0;
    let alive = true;
    let last = -1;
    let animating = false;
    const draw = (time) => {
      const res = drawMap(ctx, map, {
        renderer: rendererRef.current, cellSize: P, time, showGrid, roofs, buildingBlocks,
        view: { x0, y0, x1, y1 }, offset: { x: Math.round(x0 * P), y: Math.round(y0 * P) },
        budgetMs: 24, animate: !reduce
      });
      // pedacos que faltam: continua logo (setTimeout anda mesmo com a aba escondida)
      clearTimeout(timer);
      if (res.pending && alive) timer = setTimeout(() => draw(performance.now()), 16);
      return res;
    };
    const first = draw(performance.now());
    const loop = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const step = Math.floor(now / FRAME_MS);
      if (step === last || document.hidden) return;
      last = step;
      const res = draw(now);
      if (!res.animated && !res.pending) { cancelAnimationFrame(raf); raf = 0; animating = false; }
    };
    if (first.animated && !reduce) { animating = true; raf = requestAnimationFrame(loop); }
    return () => {
      alive = false;
      clearTimeout(timer);
      if (animating) cancelAnimationFrame(raf);
    };
  }, [map, cols, x0, y0, x1, y1, P, showGrid, roofs, buildingBlocks]);

  if (windowed) {
    return (
      <div className={className} style={{ ...(/\b(absolute|fixed)\b/.test(className) ? {} : { position: 'relative' }), width: cols * cellSize, height: rows * cellSize, ...style }} {...rest}>
        <canvas
          ref={canvasRef}
          width={bw}
          height={bh}
          aria-hidden="true"
          style={{ position: 'absolute', imageRendering: 'pixelated', display: 'block', maxWidth: 'none', pointerEvents: 'none', left: x0 * cellSize, top: y0 * cellSize, width: (x1 - x0) * cellSize, height: (y1 - y0) * cellSize }}
        />
      </div>
    );
  }
  return (
    <canvas
      ref={canvasRef}
      width={bw}
      height={bh}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', maxWidth: 'none', width: cols * cellSize, height: rows * cellSize, ...style }}
      {...rest}
    />
  );
});

export default TileMapCanvas;
