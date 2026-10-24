import { useMemo } from 'react';
import { classifyPower, FORM_LABELS, WEAPONS } from '../../lib/spellicons/classify';
import { spellIconDataUrl } from '../../lib/spellicons/render';

// Icone pixel art 24x24 de uma magia/tecnica, ampliado sem borrar (multiplos de 24 ficam nitidos).
export default function SpellIcon({ power, size = 48, className = '', title }) {
  const info = useMemo(() => classifyPower(power), [power]);
  const src = useMemo(() => spellIconDataUrl(info), [info]);
  const weapon = info.weapon ? WEAPONS.find((w) => w.id === info.weapon)?.label : '';
  const label = title ?? [weapon, FORM_LABELS[info.form]].filter(Boolean).join(' · ');
  if (!src) return <span className={className} style={{ display: 'inline-block', width: size, height: size }} aria-hidden="true" />;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      title={label}
      draggable={false}
      className={className}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  );
}
