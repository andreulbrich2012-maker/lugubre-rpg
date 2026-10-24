import { useEffect, useMemo, useRef } from 'react';
import { styledCopy } from '../../lib/tiles/styles';
import { buildMonsterSheet, monsterFrameRect, toLook } from '../../lib/monsters/render';
import { FRAME_MS, ANIMS } from '../../lib/monsters/compose';

// Monstro animado em pixel art: parado respira (2 quadros), andando da 4 passos,
// 'attack' mostra o bote. A folha vem do cache (mesmo monstro = mesmo canvas),
// entao varios tokens iguais na mesa nao recalculam nada. Respeita "menos movimento".
// scale multiplica o tamanho natural do quadro (16/24/32/40 px conforme o nivel).
export default function MonsterSprite({ monster, look: lookProp, direction = 'down', moving = false, attacking = false, scale = 3, mapStyle, className = '', style, title }) {
  const ref = useRef(null);
  const look = useMemo(() => lookProp || toLook(monster), [lookProp, monster]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const sheet = buildMonsterSheet(look);
    const anim = attacking ? 'attack' : moving ? 'walk' : 'idle';
    const n = ANIMS[anim];
    const draw = (f) => {
      const r = monsterFrameRect(sheet.w, direction, anim, f);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(styledCopy(sheet.canvas, mapStyle), r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
    };
    draw(0);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (n <= 1 || (reduce && !moving)) return undefined;
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
  }, [look, direction, moving, attacking, mapStyle]);

  return (
    <canvas
      ref={ref}
      width={look.size * scale}
      height={look.size * scale}
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
      role="img"
      aria-label={title || `Sprite de ${look.name || 'monstro'}`}
    />
  );
}
