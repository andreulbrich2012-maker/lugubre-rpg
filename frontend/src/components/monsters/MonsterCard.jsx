import { useState } from 'react';
import { ChevronDown, ChevronUp, HeartPulse, Shield } from 'lucide-react';
import Button from '../Button';
import EntityImage from '../EntityImage';
import { primordialByName } from '../glass/primordiais';
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
    <article className="gothic-panel soft-motion overflow-hidden">
      <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
        <EntityImage src={monster.image_url} label="Monstro" name={monster.name} tint={primordialByName[monster.category]?.color} className="aspect-[4/3] w-full sm:aspect-square" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words font-display text-3xl text-bone">{monster.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mist">
                <span className="badge" style={primordialByName[monster.category] ? { background: `color-mix(in srgb, ${primordialByName[monster.category].color} 70%, #000)` } : undefined}>{monster.category}</span>
                {monster.difficulty}
              </p>
            </div>
            <MonsterPngDownloadButton monster={monster} onWarning={onWarning} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric icon={HeartPulse} label="Vida" value={`${monster.min_health} a ${monster.max_health}`} />
            <Metric icon={Shield} label="Armadura" value={monster.armor} />
            <label className="pane p-3 text-sm text-mist">
              Vida nesta campanha
              <input
                type="number"
                min={monster.min_health}
                max={monster.max_health}
                value={sessionHealth}
                onChange={(event) => updateSessionHealth(event.target.value)}
                className="field !mt-0 text-bone"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setOpen((value) => !value)}>
              <span className="inline-flex items-center gap-2">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Detalhes</span>
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t-[3px] border-lead p-4">
          <MonsterDetails monster={monster} onRoll={onRoll} />
          {rollResult?.monster?.id === monster.id && (
            <div className="mt-4 border-[3px] border-lead lit p-4">
              <h3 className="mt-1 font-display text-2xl text-bone">{rollResult.monster.name}</h3>
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
    <div className="pane p-3">
      <p className="flex items-center gap-2 text-xs text-mist"><Icon size={14} /> {label}</p>
      <p className="tabular mt-1 font-display text-2xl text-bone">{value}</p>
    </div>
  );
}

function RollInfo({ label, value }) {
  return (
    <div className="pane p-3">
      <p className="text-xs text-mist">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold text-bone">{value}</p>
    </div>
  );
}
