import { useEffect, useRef } from 'react';
import { styledCopy } from '../../lib/tiles/styles';
import { buildSpriteSheet, frameRect, FRAME_W, FRAME_H } from '../../lib/avatar/render';
import { FRAME_MS, ANIMS } from '../../lib/avatar/skeleton';
import { onSwing } from '../../lib/avatar/swing';

// Boneco animado em pixel art: parado respira (2 quadros), andando da 4 passos.
// A folha de sprites vem do cache (mesma aparencia = mesmo canvas), entao varios tokens
// iguais na mesa nao recalculam nada. Respeita "menos movimento" do sistema.
// swingId: id do token; quando ele ataca (lib/avatar/swing.js) toca a pose de golpe uma vez.
export default function AvatarSprite({ swingId, appearance, direction = 'down', moving = false, scale = 3, mapStyle, className = '', style, title }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const sheet = buildSpriteSheet(appearance);
    const anim = moving ? 'walk' : 'idle';
    const n = ANIMS[anim];
    let swingDir = null;
    const draw = (f, a = anim) => {
      const r = frameRect(a === 'attack' && swingDir ? swingDir : direction, a, f);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(styledCopy(sheet.canvas, mapStyle), r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
    };
    draw(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const still = reduce && !moving;
    let raf = 0;
    let last = -1;
    let swingAt = -1;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      if (swingAt >= 0) {
        const k = Math.floor((now - swingAt) / FRAME_MS.attack);
        if (k < ANIMS.attack) {
          if (last !== 100 + k) { last = 100 + k; draw(k, 'attack'); }
          return;
        }
        swingAt = -1;
        last = -1;
        if (still) { cancelAnimationFrame(raf); raf = 0; draw(0); return; }
      }
      const f = Math.floor(now / FRAME_MS[anim]) % n;
      if (f === last) return;
      last = f;
      draw(f);
    };
    // menos movimento: o golpe ainda aparece (e curto e diz quem atacou), mas so ele anima
    const off = onSwing(swingId, (dir) => {
      swingDir = dir;
      swingAt = performance.now();
      if (!raf) raf = requestAnimationFrame(loop);
    });
    if (!still) raf = requestAnimationFrame(loop);
    return () => { off(); cancelAnimationFrame(raf); };
  }, [appearance, direction, moving, mapStyle, swingId]);

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
