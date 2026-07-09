import { useEffect, useMemo, useState } from 'react';
import { Skull } from 'lucide-react';
import Alert from '../components/Alert';
import MonsterCard from '../components/monsters/MonsterCard';
import MonsterFilters from '../components/monsters/MonsterFilters';
import { api } from '../lib/api';

export default function Monsters() {
  return (
    <main className="mx-auto max-w-7xl px-3 py-8 sm:px-4">
      <MonstersTab />
    </main>
  );
}

export function MonstersTab() {
  const [monsters, setMonsters] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [rollResult, setRollResult] = useState(null);

  async function load() {
    setLoading(true);
    const url = category ? `/monsters?category=${encodeURIComponent(category)}` : '/monsters';
    const { data } = await api.get(url);
    setMonsters(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [category]);

  const totalAttacks = useMemo(() => monsters.reduce((sum, monster) => sum + (monster.attacks?.length || 0), 0), [monsters]);

  return (
    <>
      <section className="gothic-panel rounded-md p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.28em] text-ember/70">Bestiário</p>
            <h1 className="font-display text-4xl text-ember">Monstros</h1>
            <p className="mt-2 max-w-2xl text-sm text-mist">Criaturas cadastradas pelo admin para uso em campanhas, com faixas de vida, drops e rolagens de ataque.</p>
          </div>
          <div className="rounded-md border border-ember/15 bg-black/25 p-4 text-right">
            <Skull className="ml-auto text-ember" />
            <p className="mt-2 font-display text-3xl text-white">{monsters.length}</p>
            <p className="text-xs uppercase tracking-[.18em] text-mist">{totalAttacks} ataques</p>
          </div>
        </div>
        <div className="mt-6">
          <MonsterFilters activeCategory={category} onChange={setCategory} />
        </div>
      </section>

      {notice && <div className="mt-5"><Alert type={notice.type}>{notice.text}</Alert></div>}

      {loading ? (
        <div className="gothic-panel mt-6 grid min-h-80 place-items-center rounded-md">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
        </div>
      ) : monsters.length === 0 ? (
        <div className="gothic-panel mt-6 rounded-md p-10 text-center text-mist">Nenhum monstro encontrado nesta categoria.</div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {monsters.map((monster) => (
            <MonsterCard
              key={monster.id}
              monster={monster}
              rollResult={rollResult}
              onRoll={(result) => setRollResult(result)}
              onWarning={(text) => setNotice({ type: 'error', text })}
            />
          ))}
        </div>
      )}
    </>
  );
}
