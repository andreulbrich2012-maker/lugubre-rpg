// Contexto 2D falso (so fillRect/clearRect/fillStyle/globalAlpha), suficiente para
// o renderizador. Usado nos testes (sem jsdom/canvas nativo) e no preview em node,
// que transforma o buffer em PPM/PNG para conferir a arte de verdade.

function parseColor(c) {
  if (typeof c !== 'string') return [255, 0, 255];
  if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [255, 0, 255];
}

export function createFakeContext(width = 0, height = 0, { record = true } = {}) {
  const px = width && height ? new Uint8ClampedArray(width * height * 4) : null;
  const calls = [];
  const ctx = {
    width,
    height,
    pixels: px,
    calls,
    fillStyle: '#000000',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    save() {},
    restore() {},
    setTransform() {},
    clearRect(x, y, w, h) {
      if (record) calls.push(['clearRect', x, y, w, h]);
      if (!px) return;
      for (let j = Math.max(0, y); j < Math.min(height, y + h); j++) {
        px.fill(0, (j * width + Math.max(0, x)) * 4, (j * width + Math.min(width, x + w)) * 4);
      }
    },
    fillRect(x, y, w, h) {
      if (![x, y, w, h].every(Number.isFinite)) throw new Error(`fillRect com valor invalido: ${x},${y},${w},${h}`);
      if (record) calls.push(['fillRect', x, y, w, h, ctx.fillStyle, ctx.globalAlpha]);
      if (!px) return;
      const [r, g, b] = parseColor(ctx.fillStyle);
      const a = ctx.globalAlpha;
      const x0 = Math.max(0, Math.floor(x));
      const y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(width, Math.floor(x + w));
      const y1 = Math.min(height, Math.floor(y + h));
      for (let j = y0; j < y1; j++) {
        for (let i = x0; i < x1; i++) {
          const o = (j * width + i) * 4;
          const da = px[o + 3] / 255;
          const oa = a + da * (1 - a);
          if (oa <= 0) continue;
          px[o] = (r * a + px[o] * da * (1 - a)) / oa;
          px[o + 1] = (g * a + px[o + 1] * da * (1 - a)) / oa;
          px[o + 2] = (b * a + px[o + 2] * da * (1 - a)) / oa;
          px[o + 3] = oa * 255;
        }
      }
    }
  };
  return ctx;
}
