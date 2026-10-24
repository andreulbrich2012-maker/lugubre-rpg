import { primordialByName } from '../glass/primordiais';
import { monsterCategories, monsterCategoryDescriptions } from './monsterUtils';

export default function MonsterFilters({ activeCategory, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`min-h-11 shrink-0 border-[3px] border-lead px-4 py-2 text-sm font-semibold transition-colors ${!activeCategory ? 'lit text-bone' : 'bg-glass text-mist hover:text-bone'}`}
        >
          Todos
        </button>
        {monsterCategories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => onChange(category)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-[3px] border-lead px-4 py-2 text-sm font-semibold transition-colors ${activeCategory === category ? 'lit text-bone' : 'bg-glass text-mist hover:text-bone'}`}
          >
            <span className="h-3 w-3 border-2 border-lead" style={{ background: primordialByName[category]?.color }} aria-hidden="true" />
            {category}
          </button>
        ))}
      </div>
      {activeCategory && (
        <div className="pane p-3 text-sm text-mist">
          {monsterCategoryDescriptions[activeCategory]}
        </div>
      )}
    </div>
  );
}
