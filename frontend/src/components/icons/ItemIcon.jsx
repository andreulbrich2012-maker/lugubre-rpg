import { useMemo } from 'react';
import { iconFor } from '../../lib/icons/items.js';
import { iconDataUrl, iconSpec } from '../../lib/icons/render.js';

// Icone pixel art de item/arma. Recebe o item (escolha automatica pelo nome/categoria)
// ou um iconId direto. O PNG 16x16 e ampliado pelo CSS sem suavizar, entao use multiplos de 16.
export default function ItemIcon({ item, iconId, size = 32, className = '', title }) {
  const id = iconId || iconFor(item);
  const src = useMemo(() => iconDataUrl(id), [id]);
  if (!src) return null;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden={title ? undefined : true}
      title={title ?? iconSpec(id)?.label}
      draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  );
}
