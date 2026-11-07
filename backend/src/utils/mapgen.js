import { httpError } from './http.js';

const PRINTABLE = /^[\x20-\x7E]*$/;
export const DEFAULT_TILE = '.';
const MAX_LAYERS = 2;

// Valida o formato {cols, rows, layers:{nome:[linhas]}} com 1 caractere ASCII por celula.
export function validateTiles(tiles) {
  if (!tiles || typeof tiles !== 'object') throw httpError('Mapa em tiles inválido.');
  const { cols, rows, layers } = tiles;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 4 || cols > 80 || rows < 4 || rows > 80) {
    throw httpError('O mapa em tiles deve ter entre 4 e 80 colunas e linhas.');
  }
  if (!layers || typeof layers !== 'object' || Array.isArray(layers)) throw httpError('O mapa precisa de camadas (layers).');
  const names = Object.keys(layers);
  if (!names.length || names.length > MAX_LAYERS) throw httpError('O mapa deve ter 1 ou 2 camadas.');
  for (const name of names) {
    const lines = layers[name];
    if (!/^[a-z_]{1,20}$/.test(name)) throw httpError('Nome de camada inválido.');
    if (!Array.isArray(lines) || lines.length !== rows) throw httpError(`A camada "${name}" deve ter ${rows} linhas.`);
    for (const line of lines) {
      if (typeof line !== 'string' || line.length !== cols || !PRINTABLE.test(line)) {
        throw httpError(`Cada linha da camada "${name}" deve ter exatamente ${cols} caracteres ASCII.`);
      }
    }
  }
  return { cols, rows, layers: Object.fromEntries(names.map((name) => [name, [...layers[name]]])) };
}

// Corrige a saida da IA: corta/completa linhas e colunas com o chao padrao.
export function normalizeTiles(rawLayers, cols, rows) {
  const source = rawLayers && typeof rawLayers === 'object' ? rawLayers : {};
  const names = Object.keys(source).filter((name) => /^[a-z_]{1,20}$/.test(name)).slice(0, MAX_LAYERS);
  if (!names.includes('ground')) names.unshift('ground');
  const layers = {};
  for (const name of names.slice(0, MAX_LAYERS)) {
    const lines = Array.isArray(source[name]) ? source[name] : [];
    layers[name] = Array.from({ length: rows }, (_, index) => {
      const clean = String(lines[index] ?? '').replace(/[^\x20-\x7E]/g, DEFAULT_TILE);
      return clean.slice(0, cols).padEnd(cols, DEFAULT_TILE);
    });
  }
  return validateTiles({ cols, rows, layers });
}

const SYSTEM_PROMPT = `Você desenha mapas de RPG de mesa em grade (tiles) para o sistema Lúgubre RPG (fantasia medieval sombria).
Formato: cada camada é uma lista de linhas; cada linha é uma string com EXATAMENTE "cols" caracteres, 1 caractere por célula, e há EXATAMENTE "rows" linhas.
Camadas: "ground" (chão, obrigatória) e "objects" (opcional; use "." onde não houver objeto).
Use SOMENTE os códigos do catálogo enviado pelo usuário. "." é o chão padrão.
Responda SOMENTE com JSON válido, sem texto antes ou depois, no formato:
{"name": "nome curto do mapa", "layers": {"ground": ["..."], "objects": ["..."]}, "notes": "1 a 3 frases para o mestre"}`;

// ponytail: limite em memoria por instancia (serverless reinicia); mover para o banco se abusarem.
const usage = new Map();
const LIMIT_PER_HOUR = 10;
export function checkMapRateLimit(userId, now = Date.now()) {
  const recent = (usage.get(userId) || []).filter((time) => now - time < 3_600_000);
  if (recent.length >= LIMIT_PER_HOUR) throw httpError('Limite de 10 mapas por hora atingido. Tente mais tarde.', 429);
  recent.push(now);
  usage.set(userId, recent);
}
export function resetMapRateLimit() {
  usage.clear();
}

export function mapProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

async function callLlm(provider, userPrompt) {
  const signal = AbortSignal.timeout(25_000);
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MAP_MODEL || 'claude-haiku-5-5',
        max_tokens: 16000,
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    if (!response.ok) throw httpError(`O provedor de IA recusou o pedido (HTTP ${response.status}).`, 502);
    const data = await response.json();
    return (data.content || []).filter((block) => block.type === 'text').map((block) => block.text).join('');
  }
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MAP_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }]
    })
  });
  if (!response.ok) throw httpError(`O provedor de IA recusou o pedido (HTTP ${response.status}).`, 502);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateMap({ description, cols, rows, catalog }) {
  const provider = mapProvider();
  if (!provider) return null;
  const prompt = `Catálogo de códigos:\n${catalog}\n\nTamanho: cols=${cols}, rows=${rows}.\nDescrição do mapa: ${description}`;
  let text;
  try {
    text = await callLlm(provider, prompt);
  } catch (error) {
    if (error.status) throw error;
    // nunca loga headers nem a chave; so o tipo do erro
    console.error('[mapa-ia] falha na chamada', error.name);
    throw httpError(error.name === 'TimeoutError' ? 'A geração do mapa demorou demais. Tente de novo.' : 'Não foi possível falar com o provedor de IA.', 502);
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw httpError('A IA devolveu um mapa inválido. Tente de novo ou use o prompt pronto.', 502);
  }
  return {
    tiles: normalizeTiles(parsed.layers, cols, rows),
    name: String(parsed.name || 'Mapa gerado').slice(0, 120),
    notes: String(parsed.notes || '').slice(0, 2000)
  };
}
