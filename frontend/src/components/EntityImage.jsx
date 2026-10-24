import { useState } from 'react';

export default function EntityImage({ src, label = 'Imagem', name = '', className = '', compact = false, tint }) {
  const [broken, setBroken] = useState(false);
  const hasImage = src && !broken;

  if (hasImage) {
    return (
      <div className={`overflow-hidden border-[3px] border-lead bg-glass ${className}`}>
        <img src={src} alt={name ? `${label} de ${name}` : label} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }

  return (
    <div className={`grid place-items-center border-[3px] border-lead bg-glass text-center ${className}`} style={tint ? { background: `color-mix(in srgb, ${tint} 70%, #000)` } : undefined}>
      <div className="px-3">
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-mist`}>{label}</p>
        {name && <p className="mt-1 line-clamp-2 text-sm font-display text-bone">{name}</p>}
      </div>
    </div>
  );
}
