const attributeLabels = {
  forca: 'FOR',
  agilidade: 'AGI',
  presenca: 'PRE',
  intelecto: 'INT',
  vigor: 'VIG'
};

function ResourcePill({ label, current, max, tone }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-1 font-display text-xl text-white">{Number(current || 0)} / {Number(max || 0)}</p>
    </div>
  );
}

export default function SharedCharacterPreview({ members }) {
  const shared = members.filter((member) => member.shared_character);

  if (!shared.length) {
    return <p className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-mist">Nenhum personagem compartilhado com o GM ainda.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {shared.map((member) => {
        const character = member.shared_character;
        const skills = Object.entries(character.skills || {}).filter(([, value]) => Number(value) > 0).slice(0, 8);
        return (
          <article key={character.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
            <div className="flex gap-3">
              {character.photo ? <img src={character.photo} alt={`Retrato de ${character.character_name}`} className="h-16 w-16 rounded-md border border-white/15 object-cover" /> : null}
              <div className="min-w-0">
                <h3 className="font-display text-2xl text-ember">{character.character_name}</h3>
                <p className="text-xs text-mist">Jogador: {member.name} · Nivel {character.level || 1}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ResourcePill label="Vida" current={character.life_current} max={character.life_max} tone="border-red-500/25 bg-red-950/20" />
              <ResourcePill label="Sanidade" current={character.sanity_current} max={character.sanity_max} tone="border-purple-400/25 bg-purple-950/20" />
              <ResourcePill label="Mana" current={character.mana} max={character.mana_max} tone="border-amber-400/25 bg-amber-950/20" />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Object.entries(attributeLabels).map(([key, label]) => (
                <div key={key} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-center">
                  <p className="font-display text-xl text-white">{Number(character.attributes?.[key] || 0)}</p>
                  <p className="text-[10px] font-bold text-mist">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember">Pericias</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.length ? skills.map(([key, value]) => (
                    <span key={key} className="rounded border border-white/10 bg-black/25 px-2 py-1 text-xs text-mist">{key}: {value}</span>
                  )) : <span className="text-xs text-mist">Sem treino registrado.</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember">Inventario</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(character.inventory || []).slice(0, 6).map((item) => (
                    <span key={item.id || item.name} className="rounded border border-white/10 bg-black/25 px-2 py-1 text-xs text-mist">{item.name}</span>
                  ))}
                  {!character.inventory?.length ? <span className="text-xs text-mist">Vazio.</span> : null}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="text-xs text-mist">Ataques: {(character.attacks || []).map((item) => item.name).join(', ') || 'nenhum'}</p>
              <p className="text-xs text-mist">Magias: {(character.spells || []).map((item) => item.name).join(', ') || 'nenhuma'}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
