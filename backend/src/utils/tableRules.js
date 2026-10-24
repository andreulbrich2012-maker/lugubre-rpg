// Regras da mesa que o mestre controla (campaigns.table_rules):
// { move, powers, pickup: liga/desliga para todos; turn: tokenId da vez fora do combate (null = livre);
//   players: { [userId]: { move?, powers?, pickup? } } excecoes por jogador (false trava so ele) }
import { z } from 'zod';
import { httpError } from './http.js';

const flags = { move: z.boolean().optional(), powers: z.boolean().optional(), pickup: z.boolean().optional() };
export const tableRulesSchema = z.object({
  ...flags,
  turn: z.string().uuid().nullable().optional(),
  players: z.record(z.string().uuid(), z.object(flags)).optional()
});

export function normalizeRules(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    move: r.move !== false,
    powers: r.powers !== false,
    pickup: r.pickup !== false,
    turn: r.turn || null,
    players: r.players && typeof r.players === 'object' ? r.players : {}
  };
}

// O que um jogador pode fazer agora (o mestre sempre pode tudo).
export function playerRights(rules, userId) {
  const r = normalizeRules(rules);
  const own = r.players[userId] || {};
  return {
    move: r.move && own.move !== false,
    powers: r.powers && own.powers !== false,
    pickup: r.pickup && own.pickup !== false,
    turn: r.turn
  };
}

const MESSAGES = {
  move: 'O mestre travou o movimento agora.',
  powers: 'O mestre travou poderes e ataques agora.',
  pickup: 'O mestre não liberou pegar itens agora.'
};

// Lanca erro em pt-BR se o jogador nao pode. turnTokenIds = tokens do jogador envolvidos na acao.
export function assertRight(rules, userId, right, { turnTokenIds = [], inCombat = false } = {}) {
  const rights = playerRights(rules, userId);
  if (right && !rights[right]) throw httpError(MESSAGES[right], 403);
  if (!inCombat && rights.turn && !turnTokenIds.includes(rights.turn)) throw httpError('Agora é a vez de outro personagem.', 409);
}
