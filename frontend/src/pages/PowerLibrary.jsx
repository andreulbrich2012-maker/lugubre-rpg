import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Filter, Plus, Search, X } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import LoadingButton from '../components/LoadingButton';
import { api } from '../lib/api';
import { primordialByName } from '../components/glass/primordiais';

export const powerElements = ['Érebo', 'Nix', 'Tártaro', 'Ananque', 'Éter', 'Gaia', 'Caos', 'Hemera', 'Ponto'];
export const powerTypes = ['magia', 'poder'];

// Os elementos sao os Primordiais: o vidro do cartao leva a cor dele (Hemera nao tem vidro proprio, fica ambar).
const elementTint = (element) => `color-mix(in srgb, ${primordialByName[element]?.color || 'var(--color-ember)'} 70%, #000)`;

export default function PowerLibrary() {
  const [powers, setPowers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [filters, setFilters] = useState({ search: '', type: '', element: '', class: '' });
  const [selected, setSelected] = useState(null);
  const [characterId, setCharacterId] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const classes = useMemo(() => [...new Set(powers.map((power) => power.recommended_class).filter(Boolean))], [powers]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const [powersResponse, charactersResponse] = await Promise.all([
        api.get(`/powers?${params.toString()}`),
        api.get('/characters')
      ]);
      setPowers(powersResponse.data || []);
      setCharacters(charactersResponse.data || []);
      if (!characterId && charactersResponse.data?.[0]) setCharacterId(charactersResponse.data[0].id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, [filters.type, filters.element, filters.class]);

  async function addToCharacter(power = selected) {
    if (!power || !characterId) {
      setMessage({ type: 'error', text: 'Escolha uma ficha antes de adicionar.' });
      return;
    }
    try {
      await api.post(`/characters/${characterId}/powers`, { powerId: power.id });
      setMessage({ type: 'success', text: `${power.name} foi adicionado à ficha.` });
      setSelected(null);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível adicionar à ficha.' });
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-4 sm:py-10">
      <section className="gothic-panel p-4 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl text-bone">Biblioteca de Magias e Poderes</h1>
            <p className="mt-2 max-w-3xl text-sm text-mist">Consulte habilidades cadastradas pelo admin e copie qualquer magia ou poder para uma ficha.</p>
          </div>
          <label className="min-w-0 text-sm text-mist lg:w-72">
            Adicionar em
            <select className="field" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
              <option value="">Escolha uma ficha</option>
              {characters.map((character) => <option key={character.id} value={character.id}>{character.character_name}</option>)}
            </select>
          </label>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); load(); }} className="mt-6 grid gap-3 lg:grid-cols-[1fr_160px_180px_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" />
            <input className="field !mt-0 pl-9" placeholder="Buscar por nome" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          </label>
          <select className="field !mt-0" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
            <option value="">Todos tipos</option>
            {powerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="field !mt-0" value={filters.element} onChange={(event) => setFilters({ ...filters, element: event.target.value })}>
            <option value="">Todos elementos</option>
            {powerElements.map((element) => <option key={element} value={element}>{element}</option>)}
          </select>
          <select className="field !mt-0" value={filters.class} onChange={(event) => setFilters({ ...filters, class: event.target.value })}>
            <option value="">Todas classes</option>
            {classes.map((klass) => <option key={klass} value={klass}>{klass}</option>)}
          </select>
          <LoadingButton loading={loading} loadingText="Buscando..." className="w-full"><Filter size={16} /> Filtrar</LoadingButton>
        </form>

        {message && <div className="mt-4"><Alert type={message.type}>{message.text}</Alert></div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {powers.map((power) => (
            <PowerCard key={power.id} power={power} onDetails={() => setSelected(power)} onAdd={() => addToCharacter(power)} disabled={!characterId} />
          ))}
          {!powers.length && <p className="border-[3px] border-dashed border-lead bg-glass p-8 text-center text-mist sm:col-span-2 xl:col-span-3">Nenhuma magia ou poder encontrado.</p>}
        </div>
      </section>

      {selected && (
        <PowerDetails
          power={selected}
          characters={characters}
          characterId={characterId}
          setCharacterId={setCharacterId}
          onClose={() => setSelected(null)}
          onAdd={() => addToCharacter(selected)}
        />
      )}
    </main>
  );
}

export function PowerCard({ power, onDetails, onAdd, disabled = false, adminActions = null }) {
  return (
    <article className="pane p-4 soft-motion">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center border-[3px] border-lead" style={{ background: elementTint(power.element) }}>
          <BookOpen className="text-bone" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-mist">{power.type}{power.element ? ` · ${power.element}` : ''}</p>
          <h3 className="break-words font-display text-2xl text-bone">{power.name}</h3>
          <p className="mt-1 line-clamp-3 text-sm text-mist">{power.description}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-mist">
        <Badge label="Mana" value={power.mana_cost ?? 0} />
        <Badge label="Dano" value={power.damage_formula || 'efeito'} />
        <Badge label="Alcance" value={power.range || '-'} />
        <Badge label="Nível" value={power.recommended_level || 1} />
      </div>
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onDetails}>Detalhes</Button>
        {onAdd && <Button type="button" className="w-full sm:w-auto" disabled={disabled} onClick={onAdd}><Plus size={15} /> Adicionar</Button>}
        {adminActions}
      </div>
    </article>
  );
}

function PowerDetails({ power, characters, characterId, setCharacterId, onClose, onAdd }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3">
      <section className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-mist">{power.type}{power.element ? ` · ${power.element}` : ''}</p>
            <h2 className="font-display text-3xl text-bone">{power.name}</h2>
          </div>
          <button type="button" aria-label="Fechar" className="grid h-11 w-11 place-items-center border-[3px] border-lead bg-glass text-mist hover:text-ember" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-mist">{power.description}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Badge label="Custo de mana" value={power.mana_cost ?? 0} />
          <Badge label="Dano ou efeito" value={power.damage_formula || 'efeito narrativo'} />
          <Badge label="Alcance" value={power.range || '-'} />
          <Badge label="Duração" value={power.duration || '-'} />
          <Badge label="Requisito" value={power.requirement || '-'} />
          <Badge label="Classe" value={power.recommended_class || '-'} />
        </div>
        <label className="mt-5 block text-sm text-mist">
          Ficha
          <select className="field" value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
            <option value="">Escolha uma ficha</option>
            {characters.map((character) => <option key={character.id} value={character.id}>{character.character_name}</option>)}
          </select>
        </label>
        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
          <Button type="button" disabled={!characterId} onClick={onAdd}><Plus size={15} /> Adicionar à ficha</Button>
        </div>
      </section>
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <div className="pane p-3">
      <p className="text-xs text-mist">{label}</p>
      <p className="tabular mt-1 break-words text-sm text-bone">{value}</p>
    </div>
  );
}
