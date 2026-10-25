// Ponte entre os eventos da API (docs/API-v2.md) e o FxLayer. Ver docs/ANIMACOES.md.
//
//   evento "roll" (kind 'attack')  -> fxFromRoll  -> layer.attack(opts)  (antecipacao + acao)
//   evento "token:hit" (mestre)    -> fxFromHit   -> layer.impact(opts)  (impacto + recuperacao)
//
// A semente e sempre o rollId: todos os clientes sorteiam as mesmas particulas.
import { normalize } from './text.js';

// Centro do token em px do mapa (x/y do token sao o canto superior esquerdo).
// Sobe um pouco porque o sprite do personagem e mais alto que a celula.
export function tokenCenter(token, cell = 70) {
  if (!token) return null;
  const size = (token.size || 1) * cell;
  return { x: (token.x || 0) + size / 2, y: (token.y || 0) + size / 2 - cell * 0.1 };
}

// Resultado visivel na hora da rolagem: 20 natural = critico, 1 natural = falha.
export function rollResult(roll, critOn = 20) {
  const d20 = (roll?.dice || []).find((d) => d.sides === 20);
  if (!d20) return 'hit';
  if (d20.value >= critOn) return 'crit';
  if (d20.value === 1) return 'fumble';
  return 'hit';
}

function findPower(powers, name) {
  if (!name || !powers?.length) return null;
  const n = normalize(name);
  return powers.find((p) => normalize(p.name) === n) || null;
}

/**
 * Monta as opcoes de animacao a partir do evento "roll".
 * @param roll    payload do evento (rollId, kind, characterId, targetTokenId, powerName, label, dice)
 * @param ctx     { tokens, cell, powers?, attackerTokenId?, critOn? }
 * @returns opcoes para layer.attack/play, ou null se nao ha o que animar.
 */
export function fxFromRoll(roll, { tokens = [], cell = 70, powers = [], attackerTokenId, critOn } = {}) {
  if (!roll || roll.kind !== 'attack' || !roll.targetTokenId) return null;
  const target = tokens.find((t) => t.id === roll.targetTokenId);
  const attacker = tokens.find((t) => t.id === (attackerTokenId || roll.attackerTokenId))
    || (roll.characterId ? tokens.find((t) => t.character_id === roll.characterId) : null);
  if (!target) return null;
  const power = findPower(powers, roll.powerName) || { name: roll.powerName || roll.label || '' };
  const result = rollResult(roll, critOn);
  const to = tokenCenter(target, cell);
  return {
    seed: roll.rollId,
    power,
    monster: attacker ? attacker.kind !== 'character' : false,
    from: tokenCenter(attacker, cell) || to,
    to,
    fromId: attacker?.id,
    toId: target.id,
    result,
    // 1 natural: a trapalhada nao depende do mestre, toca inteira ja na rolagem.
    phase: result === 'fumble' ? 'full' : 'attack'
  };
}

/**
 * Monta as opcoes do impacto a partir do evento "token:hit".
 * @param hit      payload (tokenId, outcome 'hit'|'miss'|'heal', down, rollId)
 * @param ctx      { tokens, cell, attack? } attack = o objeto devolvido por fxFromRoll para o mesmo rollId
 * @returns opcoes para layer.impact, ou null (ex.: a falha ja tocou inteira).
 */
export function fxFromHit(hit, { tokens = [], cell = 70, attack = null } = {}) {
  if (!hit?.tokenId) return null;
  if (attack?.phase === 'full') return null;
  const target = tokens.find((t) => t.id === hit.tokenId);
  const to = tokenCenter(target, cell) || attack?.to;
  if (!to) return null;
  const heal = hit.outcome === 'heal';
  let result = hit.outcome === 'miss' ? 'miss' : 'hit';
  if (result === 'hit' && attack?.result === 'crit') result = 'crit';
  const base = attack
    ? { power: attack.power, monster: attack.monster, from: attack.from, fromId: attack.fromId }
    : { family: heal ? 'bencao' : 'corte', element: heal ? 'Éter' : null, from: to };
  return {
    ...base,
    ...(heal && attack ? { family: 'bencao', element: 'Éter', power: undefined } : {}),
    seed: hit.rollId || `${hit.tokenId}-${hit.outcome}`,
    to,
    toId: hit.tokenId,
    result,
    down: Boolean(hit.down)
  };
}

// Estilo de um token durante o efeito (quadro a quadro, direto no elemento, sem
// setState): empurrao (translate), piscada branca e transparencia (alpha da receita:
// invisibilidade, teleporte, forma gasosa, ilusao...). A transparencia vai como
// filter: opacity() para somar com a opacidade de classe (token oculto do mestre).
// Sem efeito ativo devolve strings vazias, que limpam o estilo inline.
// Invisibilidade que dura depois da animacao e estado de jogo (token.hidden), nao daqui.
export function tokenFxStyle(m) {
  if (!m) return { translate: '', filter: '' };
  const translate = m.x || m.y ? `${m.x}px ${m.y}px` : '';
  const parts = [];
  if (m.flash > 0.5) parts.push('brightness(3) saturate(0)');
  const a = m.alpha == null ? 1 : Math.max(0, Math.min(1, m.alpha));
  if (a < 0.999) parts.push(`opacity(${Math.round(a * 100) / 100})`);
  return { translate, filter: parts.join(' ') };
}
