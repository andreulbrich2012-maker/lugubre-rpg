import { useEffect, useRef } from 'react';
import { buildSpriteSheet, frameRect, FRAME_W, FRAME_H } from '../../lib/avatar/render';
import { FRAME_MS, ANIMS } from '../../lib/avatar/skeleton';

// Boneco animado em pixel art: parado respira (2 quadros), andando da 4 passos.
// A folha de sprites vem do cache (mesma aparencia = mesmo canvas), entao varios tokens
// iguais na mesa nao recalculam nada. Respeita "menos movimento" do sistema.
export default function AvatarSprite({ appearance, direction = 'down', moving = false, scale = 3, className = '', style, title }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const sheet = buildSpriteSheet(appearance);
    const anim = moving ? 'walk' : 'idle';
    const n = ANIMS[anim];
    const draw = (f) => {
      const r = frameRect(direction, anim, f);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
    };
    draw(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce && !moving) return undefined;
    let raf = 0;
    let last = -1;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const f = Math.floor(now / FRAME_MS[anim]) % n;
      if (f === last) return;
      last = f;
      draw(f);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [appearance, direction, moving]);

  return (
    <canvas
      ref={ref}
      width={FRAME_W * scale}
      height={FRAME_H * scale}
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
      role="img"
      aria-label={title || 'Aparência do personagem'}
    />
  );
}
