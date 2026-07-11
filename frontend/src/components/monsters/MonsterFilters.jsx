import { monsterCategories, monsterCategoryDescriptions } from './monsterUtils';

export default function MonsterFilters({ activeCategory, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`shrink-0 rounded-md border px-3 py-2 text-sm transition-colors ${!activeCategory ? 'border-ember/60 bg-ember/15 text-white' : 'border-ember/15 bg-black/20 text-mist hover:text-white'}`}
        >
          Todos
        </button>
        {monsterCategories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => onChange(category)}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm transition-colors ${activeCategory === category ? 'border-ember/60 bg-ember/15 text-white' : 'border-ember/15 bg-black/20 text-mist hover:text-white'}`}
          >
            {category}
          </button>
        ))}
      </div>
      {activeCategory && (
        <div className="rounded-md border border-ember/20 bg-black/25 p-3 text-sm text-mist">
          {monsterCategoryDescriptions[activeCategory]}
        </div>
      )}
    </div>
  );
}
