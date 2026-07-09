import MonsterAttackRollButton from './MonsterAttackRollButton';

export default function MonsterDetails({ monster, onRoll }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Vida" value={`${monster.min_health} a ${monster.max_health}`} />
        <Info label="Armadura" value={monster.armor} />
        <Info label="Dificuldade" value={monster.difficulty} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[.22em] text-ember/70">Itens / Drop</p>
        <p className="mt-1 text-sm text-mist">{monster.items?.length ? monster.items.join(', ') : 'Nenhum drop cadastrado.'}</p>
      </div>
      {monster.description && (
        <div>
          <p className="text-xs uppercase tracking-[.22em] text-ember/70">Descrição</p>
          <p className="mt-1 text-sm leading-relaxed text-mist">{monster.description}</p>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-[.22em] text-ember/70">Ataques</p>
        <div className="mt-2 space-y-2">
          {monster.attacks?.length ? monster.attacks.map((attack) => (
            <div key={attack.id} className="rounded-md border border-ember/15 bg-black/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-white">{attack.name}</h4>
                  <p className="text-sm text-ember">{attack.damage_formula}</p>
                </div>
                <MonsterAttackRollButton monster={monster} attack={attack} onRoll={onRoll} />
              </div>
              {attack.description && <p className="mt-2 text-sm text-mist">{attack.description}</p>}
            </div>
          )) : (
            <p className="text-sm text-mist">Nenhum ataque cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-md border border-ember/15 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[.18em] text-mist">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}
