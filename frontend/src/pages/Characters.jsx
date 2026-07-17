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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const { data } = await api.get('/characters');
      setCharacters(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Não foi possível carregar seus personagens.');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta ficha? Essa ação não poderá ser desfeita.')) return;
    try {
      await api.delete(`/characters/${id}`);
      setCharacters((current) => current.filter((character) => character.id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Não foi possível excluir a ficha.');
    }
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
        {error && <div role="alert" className="rounded-md border border-red-400/40 bg-red-950/35 px-4 py-3 text-sm text-red-100">{error}</div>}
        {loading && <div className="gothic-panel grid min-h-48 place-items-center rounded-md" aria-label="Carregando personagens"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" /></div>}
        {!loading && !error && characters.length === 0 && <div className="gothic-panel rounded-md p-6 text-center text-mist">Você ainda não criou nenhum personagem.</div>}
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
              <Link to={`/characters/${character.id}/edit`} aria-label={`Editar ${character.character_name}`} title="Editar ficha"><Button variant="ghost" className="w-full"><Edit size={16} /></Button></Link>
              <Button variant="ghost" className="w-full" onClick={() => share(character.id)} aria-label={`Compartilhar ${character.character_name}`} title="Compartilhar ficha"><Share2 size={16} /></Button>
              <Button variant="ghost" className="w-full text-red-200" onClick={() => remove(character.id)} aria-label={`Excluir ${character.character_name}`} title="Excluir ficha"><Trash2 size={16} /></Button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
