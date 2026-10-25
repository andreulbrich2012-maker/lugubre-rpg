// Tocador de efeitos independente de React: guarda a fila, agenda o impacto de um
// ataque que ainda esta voando e desenha tudo num contexto 2D. O FxLayer so liga
// isso a um <canvas> e ao requestAnimationFrame; os testes usam direto.
import { createEffect, span } from './effect.js';
import { renderEffect } from './render.js';
// Grimorio: magias com animacao propria (ver spells/ e docs/ANIMACOES.md).
import { createSpellEffect, renderSpell } from './spells/engine.js';
import { spellForOptions } from './spells/match.js';

let nextId = 1;

export function createPlayer({ unit = 4, cell = 64, reduced = false, onImpact, onDone } = {}) {
  const live = [];

  function add(opts, now, phase) {
    const spell = spellForOptions(opts);
    const base = { unit, cell, reduced: opts.reduced ?? reduced, ...opts, phase, id: opts.id ?? nextId++ };
    const eff = (spell && createSpellEffect({ ...base, spell })) || createEffect(base);
    const sp = span(eff);
    let start = now - sp.start;
    // Impacto de um ataque com o mesmo rollId ainda no ar: espera o contato.
    if (phase === 'impact' && opts.seed != null) {
      const flying = live.find((x) => x.eff.phase === 'attack' && x.eff.seed === String(opts.seed));
      if (flying) {
        const contact = flying.start + flying.eff.T.impactAt;
        if (contact > now) {
          start = contact - eff.T.impactAt;
          // O impacto assume o resto do golpe (recuo do atacante, arma voltando).
          eff.linked = true;
          flying.end = Math.min(flying.end, contact);
        } else if (!flying.eff.mv) flying.end = Math.min(flying.end, now);
      }
    }
    const item = { eff, opts, start, end: start + sp.end, impacted: false };
    live.push(item);
    return eff.id;
  }

  return {
    get size() { return live.length; },
    // Golpe completo (galeria, mestre local, ou quando o resultado ja e conhecido).
    play(opts, now) { return add(opts, now, opts.phase || 'full'); },
    // Evento "roll": antecipacao + acao, termina no contato.
    attack(opts, now) { return add(opts, now, 'attack'); },
    // Evento "token:hit": impacto + recuperacao (sincroniza com o ataque em voo).
    impact(opts, now) { return add(opts, now, 'impact'); },
    clear() { live.length = 0; },
    // Desenha o quadro "now" e devolve tremor somado e deslocamento por token.
    step(ctx, now) {
      const shake = { x: 0, y: 0 };
      const tokens = {};
      for (let i = live.length - 1; i >= 0; i--) {
        const item = live[i];
        if (now >= item.end) {
          live.splice(i, 1);
          onDone?.({ id: item.eff.id, seed: item.eff.seed });
          continue;
        }
        const t = now - item.start;
        if (t < 0 || t < span(item.eff).start) continue;
        const fr = item.eff.isSpell ? renderSpell(ctx, item.eff, t) : renderEffect(ctx, item.eff, t);
        if (!item.impacted && item.eff.phase !== 'attack' && t >= item.eff.T.impactAt) {
          item.impacted = true;
          onImpact?.({
            id: item.eff.id,
            seed: item.eff.seed,
            result: item.eff.result,
            down: item.eff.down,
            family: item.eff.family.id,
            move: item.eff.mv ? item.eff.mv.move.id : null,
            weapon: item.eff.mv ? item.eff.cls.weapon : null,
            element: item.eff.cls.element,
            to: item.opts.to,
            toId: item.opts.toId,
            fromId: item.opts.fromId
          });
        }
        if (Math.abs(fr.shake.x) > Math.abs(shake.x)) shake.x = fr.shake.x;
        if (Math.abs(fr.shake.y) > Math.abs(shake.y)) shake.y = fr.shake.y;
        const put = (id, b) => {
          if (!id) return;
          const cur = tokens[id] || { x: 0, y: 0, flash: 0, alpha: 1 };
          tokens[id] = { x: cur.x + b.x, y: cur.y + b.y, flash: Math.max(cur.flash, b.flash), alpha: Math.min(cur.alpha ?? 1, b.alpha ?? 1) };
        };
        put(item.opts.fromId, fr.attacker);
        put(item.opts.toId, fr.target);
      }
      return { shake, tokens, active: live.length > 0 };
    }
  };
}
