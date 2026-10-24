import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { drawMap, isAnimatedCode, FRAME_MS } from '../../lib/tiles/render';

// Mapa de blocos em <canvas>, pixel nitido. So anima (agua, fogo, portal) quando o mapa
// tem bloco animado, a aba esta visivel e a pessoa nao pediu menos movimento.
const TileMapCanvas = forwardRef(function TileMapCanvas({ map, cellSize = 48, showGrid = false, roofs = false, className = '', style, ...rest }, ref) {
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  const animated = useMemo(() => {
    if (!map?.layers) return false;
    return [...map.layers.ground, ...map.layers.objects].some((row) => [...row].some(isAnimatedCode));
  }, [map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map?.cols) return undefined;
    const ctx = canvas.getContext('2d');
    const draw = (time) => drawMap(ctx, map, { cellSize, time, showGrid, roofs });
    draw(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!animated || reduce) return undefined;

    let raf = 0;
    let last = -1;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const step = Math.floor(now / FRAME_MS);
      if (step === last || document.hidden) return;
      last = step;
      draw(now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, cellSize, showGrid, roofs, animated]);

  return (
    <canvas
      ref={canvasRef}
      width={(map?.cols || 0) * cellSize}
      height={(map?.rows || 0) * cellSize}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', maxWidth: 'none', ...style }}
      {...rest}
    />
  );
});

export default TileMapCanvas;
