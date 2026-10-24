// Ponte entre os pixels puros (compose.js) e o navegador: dataURL PNG com cache por
// chave de classificacao. 180 magias caem em poucas combinacoes (elemento x forma),
// entao o cache fica pequeno e cada combinacao e desenhada uma vez so.
import { renderIconPixels, ICON_SIZE } from './compose.js';
import { classifyPower, iconKey } from './classify.js';

const urlCache = new Map();

export function spellIconDataUrl(power) {
  const info = power && power.kind ? power : classifyPower(power);
  const key = iconKey(info);
  const hit = urlCache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const { data } = renderIconPixels(info);
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(new ImageData(data, ICON_SIZE, ICON_SIZE), 0, 0);
  const url = canvas.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}

export { ICON_SIZE };
