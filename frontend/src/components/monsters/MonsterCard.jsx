import { useState } from 'react';
import { ChevronDown, ChevronUp, HeartPulse, Shield } from 'lucide-react';
import Button from '../Button';
import EntityImage from '../EntityImage';
import MonsterDetails from './MonsterDetails';
import MonsterPngDownloadButton from './MonsterPngDownloadButton';

export default function MonsterCard({ monster, rollResult, onRoll, onWarning }) {
  const [open, setOpen] = useState(false);
  const [sessionHealth, setSessionHealth] = useState(monster.base_health);

  function updateSessionHealth(value) {
    const next = Math.max(monster.min_health, Math.min(monster.max_health, Number(value || 0)));
    setSessionHealth(next);
  }

  return (
    <article className="gothic-panel soft-motion overflow-hidden rounded-md">
      <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
        <EntityImage src={monster.image_url} label="Monstro" name={monster.name} className="aspect-square w-full" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-ember/70">{monster.category}</p>
              <h2 className="font-display text-3xl text-white">{monster.name}</h2>
              <p className="text-sm text-mist">{monster.difficulty}</p>
            </div>
            <MonsterPngDownloadButton monster={monster} onWarning={onWarning} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric icon={HeartPulse} label="Vida" value={`${monster.min_health} a ${monster.max_health}`} />
            <Metric icon={Shield} label="Armadura" value={monster.armor} />
            <label className="rounded-md border border-ember/15 bg-black/25 p-3 text-sm text-mist">
              Vida nesta campanha
              <input
                type="number"
                min={monster.min_health}
                max={monster.max_health}
                value={sessionHealth}
                onChange={(event) => updateSessionHealth(event.target.value)}
                className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen((value) => !value)}>
              <span className="inline-flex items-center gap-2">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Detalhes</span>
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-ember/10 p-4">
          <MonsterDetails monster={monster} onRoll={onRoll} />
          {rollResult?.monster?.id === monster.id && (
            <div className="mt-4 rounded-md border border-ember/30 bg-ember/10 p-4">
              <p className="text-xs uppercase tracking-[.22em] text-ember">Resultado</p>
              <h3 className="mt-1 font-display text-2xl text-white">{rollResult.monster.name}</h3>
              <p className="text-sm text-mist">Ataque: {rollResult.attack.name}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <RollInfo label="Dado" value={rollResult.attack.damage_formula} />
                <RollInfo label="Rolagens" value={rollResult.rolls.join(', ')} />
                <RollInfo label="Bônus" value={rollResult.bonus >= 0 ? `+${rollResult.bonus}` : rollResult.bonus} />
                <RollInfo label="Total" value={rollResult.total} />
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-ember/15 bg-black/25 p-3">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-mist"><Icon size={14} /> {label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}

function RollInfo({ label, value }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[.16em] text-mist">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
