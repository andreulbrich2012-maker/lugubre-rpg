import { useState } from 'react';
import { Crosshair, Dices, Flag, Footprints, MapPin, Sparkles, Swords } from 'lucide-react';
import { VitalBar, vitalOf } from './SheetsPanel';
import { attackFormula, powersOf } from './rolls';

// Barra do jogador na mesa: vitais sempre no mesmo lugar, a acao do turno e os dados.
const QUICK = [4, 6, 8, 10, 12, 20, 100];

export default function ActionBar({ sheet, myToken, scene, isMyTurn, turnState, onRoll, onAttack, pendingDamage, onDamage, onEndTurn, onPlaceToken, busy }) {
  const [skill, setSkill] = useState('');
  const mode = scene?.mode || 'prep';
  const inCombat = mode === 'combat';
  const actionUsed = inCombat && turnState?.action_used;
  const canAct = !inCombat || (isMyTurn && !actionUsed);
  const left = inCombat && isMyTurn ? Math.max(0, (scene.movement_per_turn || 6) - (turnState?.moved || 0)) : null;
  const powers = powersOf(sheet);

  if (!sheet) {
    return (
      <div className="border-t-[4px] border-lead bg-abyss/95 px-4 py-3 text-sm text-mist">
        Mostre uma ficha ao mestre (aba Fichas) para jogar na mesa com seu personagem.
      </div>
    );
  }

  return (
    <div className="action-bar border-t-[4px] border-lead bg-abyss/95">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-3 py-3">
        <div className="flex min-w-[13rem] flex-1 items-center gap-3 lg:max-w-sm">
          {sheet.photo ? <img src={sheet.photo} alt="" className="h-12 w-12 border-[3px] border-lead object-cover" /> : <span className="grid h-12 w-12 place-items-center border-[3px] border-lead bg-glass font-display text-2xl text-ember">{sheet.character_name?.[0]}</span>}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-display text-lg leading-none text-bone">{sheet.character_name}</p>
            <VitalBar compact label="Vida" color="#7a1630" {...vitalOf(sheet, 'life')} />
            <div className="grid grid-cols-2 gap-2">
              <VitalBar compact label="San" color="var(--p-eter)" {...vitalOf(sheet, 'sanity')} />
              <VitalBar compact label="Mana" color="var(--p-ponto)" {...vitalOf(sheet, 'mana')} />
            </div>
          </div>
        </div>

        {!myToken && scene && mode !== 'prep' && (
          <button type="button" className="btn btn-lit" onClick={onPlaceToken} disabled={busy}><MapPin size={16} /> Entrar no mapa</button>
        )}

        {inCombat && (
          <div className={`flex items-center gap-2 border-[3px] border-lead px-3 py-1.5 text-sm ${isMyTurn ? 'lit' : 'bg-black/40 text-mist'}`}>
            {isMyTurn ? <><Footprints size={16} /> Seu turno · <span className="tabular">{left.toFixed(1)}</span> passos · {actionUsed ? 'ação usada' : 'ação livre'}</> : 'Aguarde seu turno'}
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {powers.slice(0, 8).map((p) => (
            <button
              key={`${p.type}-${p.id || p.name}`}
              type="button"
              disabled={!canAct || busy}
              onClick={() => onAttack(p, attackFormula(sheet, p))}
              className="btn btn-glass !min-h-10 !px-3 text-sm"
              title={`${p.name}: ${attackFormula(sheet, p)} para acertar, dano ${p.damage}${p.manaCost ? `, ${p.manaCost} de mana` : ''}`}
            >
              {p.type === 'spells' ? <Sparkles size={15} /> : <Swords size={15} />} {p.name}
            </button>
          ))}
          {pendingDamage && (
            <button type="button" className="btn btn-lit !min-h-10 text-sm" disabled={busy} onClick={onDamage}>
              <Crosshair size={15} /> Rolar dano ({pendingDamage.power.damage})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor="skill-roll">Perícia</label>
          <select id="skill-roll" className="field !mt-0 !min-h-10 !w-40 !py-1.5 text-sm" value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Perícia…</option>
            {(sheet.skills_catalog || []).map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </select>
          <button type="button" className="btn btn-glass !min-h-10 !px-3 text-sm" disabled={!skill || !canAct || busy} onClick={() => onRoll({ kind: 'skill', skill, characterId: sheet.id, label: (sheet.skills_catalog || []).find((s) => s.key === skill)?.name })}>
            Testar
          </button>
        </div>

        <details className="relative">
          <summary className="btn btn-glass !min-h-10 !px-3 text-sm list-none"><Dices size={16} /> Dados</summary>
          <div className="absolute bottom-full right-0 z-30 mb-2 grid w-48 grid-cols-4 gap-1 border-[3px] border-lead bg-abyss p-2">
            {QUICK.map((d) => (
              <button key={d} type="button" className="btn btn-glass !min-h-9 !p-0 text-sm" disabled={busy} onClick={() => onRoll({ kind: 'free', formula: `1d${d}`, label: `d${d}`, characterId: sheet.id })}>d{d}</button>
            ))}
          </div>
        </details>

        {inCombat && isMyTurn && (
          <button type="button" className="btn btn-glass !min-h-10 text-sm" onClick={onEndTurn} disabled={busy}><Flag size={15} /> Encerrar turno</button>
        )}
      </div>
    </div>
  );
}
