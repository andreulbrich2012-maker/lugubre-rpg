import { useMemo } from 'react';
import { monsterPortraitDataUrl, toLook } from '../../lib/monsters/render';
import { primordialByName } from '../glass/primordiais';

// Retrato em pixel art gerado do proprio cadastro (nome, elemento, dificuldade):
// usado quando o monstro nao tem imagem enviada. Fundo tingido pelo Primordial
// e um halo suave atras da criatura para ela destacar do vidro escuro.
export default function MonsterPortrait({ monster, size = 128, className = '', compact = false }) {
  const look = useMemo(() => toLook(monster), [monster]);
  const src = useMemo(() => monsterPortraitDataUrl(look, size), [look, size]);
  const tint = primordialByName[look.element]?.color || primordialByName[monster?.category]?.color;
  return (
    <div
      className={`relative grid place-items-center overflow-hidden border-[3px] border-lead bg-glass ${className}`}
      style={{ background: tint ? `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${tint} 55%, #d8c8a0 12%) 0%, color-mix(in srgb, ${tint} 60%, #000) 70%)` : undefined }}
    >
      <img
        src={src}
        alt={`Retrato de ${monster?.name || look.baseName}`}
        width={size}
        height={size}
        className="h-full max-h-full w-auto object-contain"
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
      {!compact && (
        <span className="pointer-events-none absolute bottom-1 right-1 bg-black/45 px-1.5 text-[10px] uppercase tracking-wide text-mist">
          Nv. {look.level}
        </span>
      )}
    </div>
  );
}

// Imagem enviada de verdade? (os SVGs de /assets/ do seed sao so marcadores de lugar.)
export function hasUploadedImage(monster) {
  const url = monster?.image_url;
  return !!url && !/^\/assets\/.*\.svg$/i.test(url);
}
