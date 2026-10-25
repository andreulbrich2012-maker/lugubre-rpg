import { useState } from 'react';
import { Footprints, Pause, Play } from 'lucide-react';
import { api } from '../../../lib/api';
import { ACTION_LABELS, ACTIONS, MODE_LABELS, modesFor, normalizeRules, withMode, WALK_ONLY_OFF } from '../../../lib/tableRules';

// Controle da mesa: o que os jogadores podem fazer agora. Um interruptor geral (pausa) e, para
// cada acao, Livre / Pedir (o mestre aprova cada vez) / Bloqueado. Excecoes por jogador ficam fechadas.
const HINT = {
  livre: 'O jogador faz sozinho.',
  pedir: 'Aparece um aviso para você deixar ou não.',
  travado: 'Ninguém faz.'
};
const MODE_STYLE = {
  livre: 'bg-[#1d3b22] text-[#c9f2c9] border-[#3f7a45]',
  pedir: 'bg-[#4a3410] text-[#ffe3a3] border-[#a4781a]',
  travado: 'bg-[#3a0f18] text-[#ffc9d2] border-[#a3182f]'
};

function Segmented({ action, value, onChange, disabled, label }) {
  const options = modesFor(action).map((m) => [m, MODE_LABELS[m]]);
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
      {options.map(([mode, text]) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => !on && onChange(mode)}
            className={`min-h-10 flex-1 border-[3px] px-2 text-sm font-bold ${on ? MODE_STYLE[mode] : 'border-lead bg-black/30 text-mist hover:text-bone'}`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export default function TableControl({ campaignId, rules: raw, members, onRulesChange, notify }) {
  const rules = normalizeRules(raw);
  const [saving, setSaving] = useState(false);
  const players = members.filter((m) => m.role !== 'master');
  const nameOf = (m) => m.shared_character?.character_name || m.display_name || m.name || 'Jogador';
  const exceptions = Object.values(rules.players).reduce((n, p) => n + Object.keys(p.actions || {}).length, 0);

  async function save(next, ok) {
    setSaving(true);
    try {
      const { data } = await api.put(`/campaigns/${campaignId}/rules`, next);
      onRulesChange?.(normalizeRules(data));
      if (ok) notify?.(ok);
    } catch (err) {
      notify?.(err.response?.data?.message || 'Não deu para salvar.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const act = rules.act;
  return (
    <div className="space-y-3">
      <button
        type="button"
        role="switch"
        aria-checked={act}
        disabled={saving}
        onClick={() => save({ ...rules, act: !act }, act ? 'Mesa pausada: os jogadores esperam.' : 'Mesa liberada.')}
        className={`flex w-full items-center gap-3 border-[3px] px-3 py-3 text-left ${act ? MODE_STYLE.livre : MODE_STYLE.travado}`}
      >
        {act ? <Play size={22} /> : <Pause size={22} />}
        <span className="flex-1">
          <span className="block text-base font-bold">Jogadores podem agir: {act ? 'sim' : 'não (pausa)'}</span>
          <span className="block text-xs opacity-80">{act ? 'Toque para pausar tudo de uma vez.' : 'Ninguém anda, ataca, pega ou passa por portas. Toque para liberar.'}</span>
        </span>
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={rules.walkOnly}
        disabled={saving}
        onClick={() => save({ ...rules, walkOnly: !rules.walkOnly }, rules.walkOnly ? 'Mapa completo de novo: ataques, itens e comércio seguem as regras abaixo.' : 'Mapa só para caminhar: o resto fica com você.')}
        className={`flex w-full items-center gap-3 border-[3px] px-3 py-3 text-left ${rules.walkOnly ? 'border-ember bg-ember/15 text-bone' : 'border-lead bg-black/20 text-bone'}`}
      >
        <Footprints size={22} className={rules.walkOnly ? 'text-ember' : 'text-mist'} />
        <span className="flex-1">
          <span className="block text-base font-bold">Mapa só para caminhar: {rules.walkOnly ? 'ligado' : 'desligado'}</span>
          <span className="block text-xs opacity-80">{rules.walkOnly ? 'Jogadores só andam e entram nas construções. Atacar, pegar itens e comprar ficam com você. Toque para desligar.' : 'Para quem prefere narrar o resto: os jogadores só andam pelo mapa.'}</span>
        </span>
      </button>

      <div className={`space-y-2 ${act ? '' : 'opacity-50'}`}>
        {ACTIONS.map((a) => {
          const off = rules.walkOnly && WALK_ONLY_OFF.includes(a);
          return (
            <div key={a} className={off ? 'opacity-50' : ''}>
              <p className="mb-1 text-sm font-bold text-bone">{ACTION_LABELS[a]}{off && <span className="ml-2 text-xs font-normal text-ember">desligado: mapa só para caminhar</span>}</p>
              <Segmented action={a} value={off ? 'travado' : rules.actions[a]} label={ACTION_LABELS[a]} disabled={saving || off} onChange={(mode) => save(withMode(rules, a, mode), `${ACTION_LABELS[a]}: ${MODE_LABELS[mode]}.`)} />
            </div>
          );
        })}
        <p className="text-xs text-mist">Livre: {HINT.livre} Pedir: {HINT.pedir} Mover bloqueado também fecha as portas. Rolagens de perícia continuam livres.</p>
      </div>

      {players.length > 0 && (
        <details className="border-[3px] border-lead bg-black/20">
          <summary className="cursor-pointer px-2 py-2 text-sm font-bold text-bone">Por jogador{exceptions ? ` (${exceptions} ${exceptions === 1 ? 'exceção' : 'exceções'})` : ''}</summary>
          <div className="space-y-3 px-2 pb-3">
            <p className="text-xs text-mist">“Geral” segue o que está acima. Escolha outro modo só para quem precisa.</p>
            {players.map((m) => {
              const own = rules.players[m.user_id]?.actions || {};
              return (
                <div key={m.user_id} className="space-y-1">
                  <p className="font-bold text-bone">{nameOf(m)}</p>
                  {ACTIONS.map((a) => (
                    <label key={a} className="grid grid-cols-[1fr_9rem] items-center gap-2 text-sm text-mist">
                      {ACTION_LABELS[a]}
                      <select className={`field !mt-0 !min-h-9 !py-1 ${own[a] ? 'font-bold text-bone' : ''}`} disabled={saving} value={own[a] || ''} aria-label={`${ACTION_LABELS[a]} de ${nameOf(m)}`}
                        onChange={(e) => { const mode = e.target.value || null; save(withMode(rules, a, mode, m.user_id), `${nameOf(m)} · ${ACTION_LABELS[a]}: ${mode ? MODE_LABELS[mode] : 'segue o geral'}.`); }}>
                        <option value="">Geral ({MODE_LABELS[rules.actions[a]]})</option>
                        {modesFor(a).map((mode) => <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
