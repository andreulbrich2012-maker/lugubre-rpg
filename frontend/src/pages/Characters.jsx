import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Edit, Share2, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import EntityImage from '../components/EntityImage';
import { api } from '../lib/api';

function formatSaveDate(value) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function Characters() {
  const [characters, setCharacters] = useState([]);

  async function load() {
    const { data } = await api.get('/characters');
    setCharacters(data);
  }

  async function remove(id) {
    await api.delete(`/characters/${id}`);
    load();
  }

  async function share(id) {
    const { data } = await api.get(`/characters/${id}/share`);
    navigator.clipboard?.writeText(`${location.origin}${data.url}`);
    alert('Link de compartilhamento copiado.');
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl text-ember">Personagens</h1>
        <Link to="/characters/new"><Button className="w-full sm:w-auto">Nova ficha</Button></Link>
      </div>
      <div className="mt-8 space-y-4">
        {characters.map((character) => (
          <article key={character.id} className="gothic-panel grid gap-4 rounded-md p-4 md:grid-cols-[96px_1fr_300px_auto] md:items-center">
            <EntityImage src={character.photo} label="Personagem" name={character.character_name} className="h-24" compact />
            <div className="min-w-0">
              <Link to={`/characters/${character.id}`} className="font-display text-2xl hover:text-ember">{character.character_name}</Link>
              <p className="text-sm text-mist">Jogador: {character.player_name || 'Sem jogador'}</p>
              <p className="mt-1 text-sm text-mist">{character.race_name || 'Sem raça'} · {character.class_name || 'Sem classe'} · nível {character.level || 1}</p>
              <p className="mt-2 text-sm text-mist">Esquiva {character.dodge} · Defesa {character.total_defense}</p>
            </div>
            <div className="rounded-md border border-ember/15 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[.2em] text-ember">Salvamentos</p>
              <div className="mt-2 space-y-1">
                {(character.save_history || []).length ? character.save_history.map((save) => (
                  <p key={save.id || save.saved_at} className="text-xs text-mist">{formatSaveDate(save.saved_at)} · {save.label || 'Snapshot'}</p>
                )) : <p className="text-xs text-mist">Nenhum salvamento registrado</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:flex md:justify-end">
              <Link to={`/characters/${character.id}/edit`}><Button variant="ghost" className="w-full"><Edit size={16} /></Button></Link>
              <Button variant="ghost" className="w-full" onClick={() => share(character.id)}><Share2 size={16} /></Button>
              <Button variant="ghost" className="w-full" onClick={() => remove(character.id)}><Trash2 size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
