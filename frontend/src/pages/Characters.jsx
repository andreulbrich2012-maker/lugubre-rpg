import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Edit, Share2, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import { api } from '../lib/api';

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
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-ember">Personagens</h1>
        <Link to="/characters/new"><Button>Nova ficha</Button></Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {characters.map((character) => (
          <article key={character.id} className="gothic-panel rounded-md p-5">
            <div className="mb-4 h-32 rounded-md bg-[radial-gradient(circle_at_center,rgba(143,29,44,.35),transparent_55%),linear-gradient(135deg,rgba(214,166,95,.12),rgba(0,0,0,.2))]" />
            <Link to={`/characters/${character.id}`} className="font-display text-2xl hover:text-ember">{character.character_name}</Link>
            <p className="text-sm text-mist">{character.race_name || 'Sem raça'} · {character.class_name || 'Sem classe'}</p>
            <p className="mt-3 text-sm text-mist">Esquiva {character.dodge} · Defesa {character.total_defense}</p>
            <div className="mt-4 flex gap-2">
              <Link to={`/characters/${character.id}/edit`}><Button variant="ghost"><Edit size={16} /></Button></Link>
              <Button variant="ghost" onClick={() => share(character.id)}><Share2 size={16} /></Button>
              <Button variant="ghost" onClick={() => remove(character.id)}><Trash2 size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
