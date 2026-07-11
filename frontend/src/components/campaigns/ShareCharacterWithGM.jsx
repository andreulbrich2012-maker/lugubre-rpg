import Button from '../Button';

export default function ShareCharacterWithGM({ characters, selectedId, saving, onShare }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onShare(new FormData(event.currentTarget).get('characterId') || null);
      }}
      className="space-y-3"
    >
      <select
        name="characterId"
        defaultValue={selectedId || ''}
        className="w-full rounded-md border border-ember/20 bg-black/35 px-3 py-2 text-sm outline-none focus:border-ember/60"
      >
        <option value="">Nenhum personagem</option>
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.character_name}
          </option>
        ))}
      </select>
      <Button className="w-full" disabled={saving}>{saving ? 'Salvando...' : 'Compartilhar com o GM'}</Button>
    </form>
  );
}
