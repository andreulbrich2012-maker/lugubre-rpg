// Primitivas de pixel art. Tudo e desenhado SO com fillRect em coordenadas
// inteiras (1 unidade = 1 "pixel de efeito"); o canvas e ampliado com
// image-rendering: pixelated, entao nada fica borrado e o teste/preview em node
// so precisa de um fillRect falso.

export function setAlpha(ctx, a) {
  ctx.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
}

export function rect(ctx, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Ponto de s x s centrado em (x, y).
export function dot(ctx, x, y, color, s = 1) {
  const h = Math.floor(s / 2);
  rect(ctx, Math.round(x) - h, Math.round(y) - h, s, s, color);
}

// Linha por passos inteiros (DDA) com espessura quadrada.
export function line(ctx, x0, y0, x1, y1, color, w = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) dot(ctx, x0 + (dx * i) / n, y0 + (dy * i) / n, color, w);
}

// Disco cheio por fileiras (poucos fillRect, bordas de pixel limpas).
export function disc(ctx, cx, cy, r, color) {
  const R = Math.max(0, Math.round(r));
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  if (R === 0) { rect(ctx, x0, y0, 1, 1, color); return; }
  for (let y = -R; y <= R; y++) {
    const w = Math.floor(Math.sqrt(R * R + R * 0.8 - y * y));
    rect(ctx, x0 - w, y0 + y, w * 2 + 1, 1, color);
  }
}

// Anel (ou elipse achatada com sy < 1, para ondas no chao).
export function ring(ctx, cx, cy, r, color, thick = 1, sy = 1) {
  const R = Math.max(1, Math.round(r));
  const ri = Math.max(0, R - Math.max(1, Math.round(thick)));
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const rows = Math.max(1, Math.round(R * sy));
  for (let j = -rows; j <= rows; j++) {
    const y = j / sy;
    const xo = Math.floor(Math.sqrt(Math.max(0, R * R + R * 0.8 - y * y)));
    const inside = Math.abs(y) < ri;
    const xi = inside ? Math.floor(Math.sqrt(Math.max(0, ri * ri - y * y))) : -1;
    if (xi < 0) rect(ctx, x0 - xo, y0 + j, xo * 2 + 1, 1, color);
    else {
      rect(ctx, x0 - xo, y0 + j, xo - xi, 1, color);
      rect(ctx, x0 + xi + 1, y0 + j, xo - xi, 1, color);
    }
  }
}

// Arco amostrado por angulo; cor/espessura podem variar ao longo dele (u: 0 cauda -> 1 cabeca).
export function arc(ctx, cx, cy, r, a0, a1, colorAt, widthAt = () => 1) {
  const span = a1 - a0;
  const steps = Math.max(2, Math.ceil(Math.abs(span) * r * 1.4));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = a0 + span * u;
    const w = Math.max(1, Math.round(widthAt(u)));
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let k = 0; k < w; k++) {
      const rr = r - k;
      rect(ctx, Math.round(cx + ca * rr), Math.round(cy + sa * rr), 1, 1, colorAt(u, k, w));
    }
  }
}

// Desenha um pequeno icone de pixels: linhas de texto, cada letra e uma cor do mapa.
export function glyph(ctx, x, y, rows, colors, flipX = false) {
  const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][flipX ? w - 1 - i : i];
      const c = colors[ch];
      if (c) rect(ctx, Math.round(x) + i, Math.round(y) + j, 1, 1, c);
    }
  }
}

// Estrela de 4 pontas (o "flash branco" do impacto).
export function star4(ctx, cx, cy, arm, color, core = 1) {
  const a = Math.max(1, Math.round(arm));
  rect(ctx, Math.round(cx) - a, Math.round(cy), a * 2 + 1, 1, color);
  rect(ctx, Math.round(cx), Math.round(cy) - a, 1, a * 2 + 1, color);
  if (core > 1) disc(ctx, cx, cy, core - 1, color);
}

export const ease = {
  out: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  back: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
};

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
