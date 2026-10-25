// Luz pela hora do mundo (relogio do mestre, de 15 em 15 min): a cor do ceu vai mudando aos poucos
// entre madrugada, amanhecer, dia, entardecer e noite. resolveLight le tanto os nomes antigos
// ('dia' | 'entardecer' | 'noite') quanto a luz calculada 'ceu:rrggbb:brilho:n'.
// mesmas cores do LIGHT_TINT do compose.js (sem importar: evita ciclo compose -> render -> daylight)
const LIGHT_TINT = { dia: null, entardecer: '#f2b890', noite: '#7482c0' };

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const NIGHT = hex(LIGHT_TINT.noite || '#7482c0');
const DUSK = hex(LIGHT_TINT.entardecer || '#f2b890');
const DAWN = [228, 190, 196];
const DAY = [255, 255, 255];
// [minuto, cor, brilho das luzes]
const KEYS = [
  [0, NIGHT, 1.4], [300, NIGHT, 1.4], [360, DAWN, 0.9], [450, DAY, 0.5],
  [1020, DAY, 0.5], [1110, DUSK, 0.9], [1200, NIGHT, 1.4], [1440, NIGHT, 1.4]
];

export function skyAt(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
  const [m0, c0, g0] = KEYS[i]; const [m1, c1, g1] = KEYS[i + 1];
  const t = m1 > m0 ? (m - m0) / (m1 - m0) : 0;
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  const glow = g0 + (g1 - g0) * t;
  const night = glow > 1.0;
  const rgb = c.map((v) => v.toString(16).padStart(2, '0')).join('');
  return `ceu:${rgb}:${glow.toFixed(2)}:${night ? 'n' : 'd'}`;
}

export function phaseAt(minutes) {
  const m = ((Number(minutes) || 0) % 1440 + 1440) % 1440;
  if (m < 300 || m >= 1200) return 'Noite';
  if (m < 450) return 'Amanhecer';
  if (m < 1020) return 'Dia';
  return 'Entardecer';
}
export const clockLabel = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// { tint: [r,g,b] | null, tintHex, glow, radius, night }
export function resolveLight(light) {
  if (typeof light === 'string' && light.startsWith('ceu:')) {
    const [, rgb, g, n] = light.split(':');
    const tint = hex(`#${rgb}`);
    const plain = tint.every((v) => v >= 250);
    return { tint: plain ? null : tint, tintHex: plain ? null : `#${rgb}`, glow: Number(g) || 0.5, radius: n === 'n' ? 2.6 : 1.8, night: n === 'n' || Number(g) >= 0.85 };
  }
  const name = light || 'dia';
  const tintHex = LIGHT_TINT[name] || null;
  return {
    tint: tintHex ? hex(tintHex) : null, tintHex,
    glow: name === 'noite' ? 1.4 : name === 'entardecer' ? 0.9 : 0.5,
    radius: name === 'noite' ? 2.6 : 1.8,
    night: name === 'noite' || name === 'entardecer'
  };
}
