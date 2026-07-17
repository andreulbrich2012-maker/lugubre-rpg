import { useState } from 'react';

export default function EntityImage({ src, label = 'Imagem', name = '', className = '', compact = false }) {
  const [broken, setBroken] = useState(false);
  const hasImage = src && !broken;

  if (hasImage) {
    return (
      <div className={`overflow-hidden rounded-md border border-ember/20 bg-black/30 ${className}`}>
        <img src={src} alt={name ? `${label} de ${name}` : label} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }

  return (
    <div className={`grid place-items-center rounded-md border border-ember/20 bg-[radial-gradient(circle_at_center,rgba(143,29,44,.28),transparent_58%),linear-gradient(135deg,rgba(214,166,95,.10),rgba(0,0,0,.35))] text-center ${className}`}>
      <div className="px-3">
        <p className={`${compact ? 'text-xs' : 'text-sm'} uppercase tracking-[.22em] text-ember`}>{label}</p>
        {name && <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{name}</p>}
      </div>
    </div>
  );
}
