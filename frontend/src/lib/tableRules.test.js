import { describe, expect, it } from 'vitest';
import { modesFor, normalizeRules, playerRights, rightBlock, withMode } from './tableRules';

const U = 'u1';

describe('regras da mesa (espelho do servidor)', () => {
  it('booleanos antigos viram livre/travado', () => {
    const r = normalizeRules({ move: false, powers: true, pickup: false, players: { [U]: { powers: false, move: true } } });
    expect(r.actions).toEqual({ move: 'travado', attack: 'livre', pickup: 'travado', doors: 'livre' });
    expect(r.players[U]).toEqual({ actions: { attack: 'travado' } });
    expect(normalizeRules({}).act).toBe(true);
  });

  it('pausa geral trava tudo e mover travado trava portas', () => {
    expect(playerRights({ act: false }, U)).toMatchObject({ paused: true, move: 'travado', attack: 'travado', pickup: 'travado', doors: 'travado' });
    expect(rightBlock(playerRights({ act: false }, U), 'pickup')).toBe('O mestre pausou a mesa: espere ele liberar.');
    const moveOff = playerRights({ actions: { move: 'travado', doors: 'pedir' } }, U);
    expect(moveOff.doors).toBe('travado');
    expect(rightBlock(moveOff, 'doors')).toBe('O mestre travou o movimento agora.');
    expect(rightBlock(playerRights({ actions: { pickup: 'pedir' } }, U), 'pickup')).toBeNull();
  });

  it('excecao do jogador troca o geral; withMode liga e desliga', () => {
    let r = withMode({}, 'pickup', 'pedir');
    expect(playerRights(r, U).pickup).toBe('pedir');
    r = withMode(r, 'pickup', 'livre', U);
    expect(playerRights(r, U).pickup).toBe('livre');
    expect(playerRights(r, 'outro').pickup).toBe('pedir');
    r = withMode(r, 'pickup', null, U);
    expect(normalizeRules(r).players[U]).toBeUndefined();
    expect(modesFor('move')).toEqual(['livre', 'travado']);
    expect(normalizeRules({ actions: { move: 'pedir' } }).actions.move).toBe('livre');
  });
});
