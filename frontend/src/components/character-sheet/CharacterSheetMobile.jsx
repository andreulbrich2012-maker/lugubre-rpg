import { Backpack, BookOpen, ChevronRight, Dice5, Dices, Edit, History, Plus, Search, Shield, Sparkles, Swords, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../Button';
import { ResourceStepper } from './ResourceStepper';

const tabs = [
  { id: 'summary', label: 'Resumo', Icon: Shield },
  { id: 'skills', label: 'Perícias', Icon: BookOpen },
  { id: 'combat', label: 'Combate', Icon: Swords },
  { id: 'powers', label: 'Poderes', Icon: Sparkles },
  { id: 'inventory', label: 'Inventário', Icon: Backpack },
  { id: 'dice', label: 'Dados', Icon: Dices },
  { id: 'history', label: 'Histórico', Icon: History }
];

const resourceDefinitions = [
  { type: 'life', label: 'Vida', current: 'lifeCurrent', max: 'lifeMax' },
  { type: 'sanity', label: 'Sanidade', current: 'sanityCurrent', max: 'sanityMax' },
  { type: 'mana', label: 'Mana', current: 'mana', max: 'manaMax' }
];

const attributeLabels = { forca: 'FOR', agilidade: 'AGI', vigor: 'VIG', intelecto: 'INT', presenca: 'PRE' };

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase text-ember/75">{eyebrow}</p>
        <h2 className="font-display text-xl text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-md border border-white/10 bg-black/25 px-2 py-2 text-center"><strong className="block text-xl text-white">{value}</strong><span className="text-[9px] font-bold uppercase text-mist">{label}</span></div>;
}

function ResourceSheet({ draft, status, onAdjust, onRetry, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[900] lg:hidden" role="dialog" aria-modal="true" aria-label="Editar Vida, Sanidade e Mana">
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Fechar edição de recursos" />
      <section className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-xl border-t border-ember/35 bg-[#0b0a0e] px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/25" />
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase text-ember/75">Sessão</p><h2 className="font-display text-2xl text-white">Editar recursos</h2></div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-md border border-white/15 text-mist" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </div>
        <p className="mb-3 text-xs text-mist">Cada toque altera exatamente um ponto. Reduzir o máximo também ajusta o atual quando necessário.</p>
        <div className="grid gap-3">
          {resourceDefinitions.map((resource) => <ResourceStepper key={resource.type} {...resource} current={draft[resource.current]} max={draft[resource.max]} status={status[resource.type]} onAdjust={(field, delta) => onAdjust(resource.type, field, delta)} onRetry={() => onRetry(resource.type)} />)}
        </div>
      </section>
    </div>
  );
}

function SkillPanel({ sheet, draft, skillsCatalog, roll, onTrainingChange, onOtherChange, onRoll }) {
  const [query, setQuery] = useState('');
  const [attribute, setAttribute] = useState('all');
  const [trainedOnly, setTrainedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const filteredSkills = useMemo(() => skillsCatalog.filter((skill) => {
    const matchesQuery = skill.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));
    const matchesAttribute = attribute === 'all' || skill.attribute === attribute;
    const matchesTraining = !trainedOnly || Number(draft.skills?.[skill.key] || 0) > 0;
    return matchesQuery && matchesAttribute && matchesTraining;
  }).sort((left, right) => {
    const trainingDifference = Number(draft.skills?.[right.key] || 0) - Number(draft.skills?.[left.key] || 0);
    return trainingDifference || left.name.localeCompare(right.name, 'pt-BR');
  }), [attribute, draft.skills, query, skillsCatalog, trainedOnly]);
  const skills = filteredSkills.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(8); }, [attribute, query, trainedOnly]);

  return (
    <section>
      <SectionTitle eyebrow="Consulta rápida" title="Perícias" />
      <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 text-mist">
        <Search size={17} /><span className="sr-only">Buscar perícia</span>
        <input className="min-h-0 w-full border-0 bg-transparent p-0 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar perícia" />
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <select className="min-h-11 rounded-md border border-white/10 bg-black/30 px-2 text-xs" value={attribute} onChange={(event) => setAttribute(event.target.value)} aria-label="Filtrar por atributo">
          <option value="all">Atributos</option><option value="forca">Força</option><option value="agilidade">Agilidade</option><option value="vigor">Vigor</option><option value="intelecto">Intelecto</option><option value="presenca">Presença</option>
        </select>
        <button type="button" className={`col-span-2 min-h-11 rounded-md border px-3 text-xs font-semibold ${trainedOnly ? 'border-ember/50 bg-ember/15 text-white' : 'border-white/10 bg-black/30 text-mist'}`} onClick={() => setTrainedOnly((value) => !value)}>Somente treinadas</button>
      </div>
      <div className="mt-3 grid gap-2">
        {skills.map((skill) => {
          const training = Number(draft.skills?.[skill.key] || 0);
          const other = Number(draft.skillBonuses?.[skill.key] || 0);
          const base = Number(sheet.attributes?.[skill.attribute] ?? 2);
          return (
            <article key={skill.key} className="rounded-md border border-white/10 bg-black/25 p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-2">
                <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{skill.name}</h3><p className="text-[10px] uppercase text-mist">{attributeLabels[skill.attribute] || skill.attribute} · {base + training + other >= 0 ? '+' : ''}{base + training + other}</p></div>
                <span className="text-sm font-bold text-ember">T {training} · O {other}</span>
                <button type="button" className="grid h-11 w-11 place-items-center rounded-md border border-ember/30 text-ember" onClick={() => onRoll(skill, training, other)} aria-label={`Rolar ${skill.name}`}><Dice5 size={18} /></button>
              </div>
              <details className="mt-2 border-t border-white/10 pt-2">
                <summary className="cursor-pointer text-[10px] font-bold uppercase text-mist">Ajustar modificadores</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-md border border-white/10"><button type="button" className="h-11" onClick={() => onTrainingChange(skill.key, training - 5)} aria-label={`Diminuir treino de ${skill.name}`}>-</button><output className="grid place-items-center text-blue-300">{training}</output><button type="button" className="h-11" onClick={() => onTrainingChange(skill.key, training + 5)} aria-label={`Aumentar treino de ${skill.name}`}>+</button></div>
                  <label className="sr-only" htmlFor={`other-${skill.key}`}>Outros em {skill.name}</label><input id={`other-${skill.key}`} type="number" className="h-11 rounded-md border border-white/10 bg-black/30 text-center" value={other} onChange={(event) => onOtherChange(skill.key, event.target.value)} />
                </div>
              </details>
            </article>
          );
        })}
      </div>
      {filteredSkills.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2"><p className="self-center text-xs text-mist">Mostrando {skills.length} de {filteredSkills.length}</p>{filteredSkills.length > visibleCount ? <button type="button" className="min-h-11 rounded-md border border-ember/25 bg-ember/10 text-xs font-bold text-ember" onClick={() => setVisibleCount((count) => count + 8)}>Mostrar mais</button> : filteredSkills.length > 8 ? <button type="button" className="min-h-11 rounded-md border border-white/10 bg-black/25 text-xs font-bold text-mist" onClick={() => setVisibleCount(8)}>Recolher</button> : <span />}</div>}
      {filteredSkills.length === 0 && <p className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-mist">Nenhuma perícia corresponde aos filtros.</p>}
      {roll && <div className="mt-3 rounded-md border border-ember/25 bg-ember/10 p-3 text-sm"><strong className="text-white">{roll.name}</strong><p className="text-mist">D20 {roll.die} + bônus {roll.bonus} = <span className="font-bold text-ember">{roll.total}</span></p></div>}
    </section>
  );
}

function PowerPanel({ title, items, type, roll, onAdd, onEdit, onDelete, onRoll }) {
  return (
    <section>
      <SectionTitle eyebrow={type === 'attacks' ? 'Combate' : 'Magias e poderes'} title={title} action={<button type="button" className="grid h-11 w-11 place-items-center rounded-md border border-ember/30 text-ember" onClick={() => onAdd(type)} aria-label={`Adicionar ${type === 'attacks' ? 'ataque' : 'magia'}`}><Plus size={18} /></button>} />
      <div className="grid gap-2">
        {items.map((item, index) => <article key={item.id || `${item.name}-${index}`} className="rounded-md border border-white/10 bg-black/25 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-white">{item.name}</h3><p className="mt-1 text-xs text-mist">{item.damage} · {type === 'attacks' ? `${item.skill || 'Luta'} · ${item.range || '-'}` : `${item.element || 'Érebo'} · ${Number(item.manaCost || 0)} mana`}</p></div><button type="button" className="min-h-11 rounded-md border border-ember/30 px-3 text-xs font-bold text-ember" onClick={() => onRoll(item, type === 'attacks' ? 'Ataque' : 'Magia')}>Rolar</button></div><details className="mt-2 border-t border-white/10 pt-2"><summary className="cursor-pointer text-[10px] font-bold uppercase text-mist">Detalhes e ações</summary><p className="mt-2 text-xs leading-relaxed text-mist">Crítico {item.criticalValue || 20}+ · x{item.criticalMultiplier || 2}. {item.description || 'Sem descrição.'}</p><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant="ghost" className="min-h-11" onClick={() => onEdit(type, item)}><Edit size={15} /> Editar</Button><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 text-sm text-red-200" onClick={() => onDelete(type, item)}><Trash2 size={15} /> Excluir</button></div></details></article>)}
        {items.length === 0 && <p className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-mist">Nenhum registro nesta seção.</p>}
      </div>
      {roll && roll.type === (type === 'attacks' ? 'Ataque' : 'Magia') && <div className="mt-3 rounded-md border border-ember/25 bg-ember/10 p-3 text-sm text-mist">{roll.name}: <strong className="text-white">{roll.total}</strong></div>}
    </section>
  );
}

function InventoryPanel({ inventory, wallet, onAdd, onEdit, onDelete, onWalletChange }) {
  const categories = ['Todos', 'Comida', 'Armas', 'Carteira', 'Outros'];
  const [category, setCategory] = useState('Todos');
  const visibleItems = category === 'Todos' || category === 'Carteira' ? inventory : inventory.filter((item) => (item.category || 'Outros') === category);
  const total = Number(wallet.bronze || 0) + Number(wallet.silver || 0) * 10 + Number(wallet.platinum || 0) * 100 + Number(wallet.gold || 0) * 500;
  const coins = [['bronze', 'Bronze', 1], ['silver', 'Prata', 10], ['platinum', 'Platina', 100], ['gold', 'Ouro', 500]];
  return <section><SectionTitle eyebrow="Carga e economia" title="Inventário" action={<button type="button" className="grid h-11 w-11 place-items-center rounded-md border border-ember/30 text-ember" onClick={onAdd} aria-label="Adicionar item"><Plus size={18} /></button>} /><div className="grid grid-cols-3 gap-2">{categories.map((item) => <button key={item} type="button" className={`min-h-10 rounded-md border px-2 text-[10px] font-bold uppercase ${category === item ? 'border-ember/45 bg-ember/15 text-white' : 'border-white/10 bg-black/25 text-mist'}`} onClick={() => setCategory(item)}>{item}</button>)}</div>{category === 'Carteira' && <div className="mt-3 rounded-md border border-ember/20 bg-black/25 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-mist">Carteira</span><strong className="text-ember">{total} Dracmas</strong></div><div className="mt-3 grid gap-2">{coins.map(([key, label, rate]) => <div key={key} className="grid grid-cols-[1fr_44px_54px_44px] items-center overflow-hidden rounded-md border border-white/10"><span className="px-2 text-xs text-mist">{label} · {rate}</span><button type="button" className="h-11 border-l border-white/10" onClick={() => onWalletChange((current) => ({ ...current, [key]: Math.max(0, Number(current[key] || 0) - 1) }))} aria-label={`Diminuir ${label}`}>-</button><output className="text-center font-bold">{Number(wallet[key] || 0)}</output><button type="button" className="h-11 border-l border-white/10" onClick={() => onWalletChange((current) => ({ ...current, [key]: Number(current[key] || 0) + 1 }))} aria-label={`Aumentar ${label}`}>+</button></div>)}</div></div>}<div className="mt-3 grid gap-2">{category !== 'Carteira' && visibleItems.map((item, index) => <article key={item.id || `${item.name}-${index}`} className="rounded-md border border-white/10 bg-black/25 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{Number(item.quantity ?? 1)}x {item.name}</h3><p className="text-xs text-mist">{item.category || 'Outros'} · {Number(item.weight || 0)} kg</p></div><ChevronRight size={18} className="text-ember" /></div><details className="mt-2 border-t border-white/10 pt-2"><summary className="cursor-pointer text-[10px] font-bold uppercase text-mist">Detalhes e ações</summary><p className="mt-2 text-xs text-mist">{item.description || 'Sem descrição.'}</p><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant="ghost" className="min-h-11" onClick={() => onEdit(item)}><Edit size={15} /> Editar</Button><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-400/30 text-sm text-red-200" onClick={() => onDelete(item)}><Trash2 size={15} /> Excluir</button></div></details></article>)}{category !== 'Carteira' && visibleItems.length === 0 && <p className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-mist">Inventário vazio nesta categoria.</p>}</div></section>;
}

function DicePanel({ modifier, roll, onRoll, onModifierChange }) {
  return <section><SectionTitle eyebrow="Rolagem" title="Dados rápidos" /><div className="rounded-md border border-white/10 bg-black/25 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-mist">Soma</span><div className="grid grid-cols-[44px_58px_44px] overflow-hidden rounded-md border border-white/10"><button type="button" className="h-11" onClick={() => onModifierChange(Number(modifier || 0) - 1)} aria-label="Diminuir Soma">-</button><output className="grid place-items-center font-bold">{Number(modifier || 0)}</output><button type="button" className="h-11" onClick={() => onModifierChange(Number(modifier || 0) + 1)} aria-label="Aumentar Soma">+</button></div></div><div className="mt-3 grid grid-cols-4 gap-2">{[4, 6, 8, 10, 12, 16, 20].map((sides) => <button key={sides} type="button" className="grid aspect-square min-h-14 place-items-center rounded-md border border-ember/25 bg-ember/5 font-bold text-ember" onClick={() => onRoll(sides)} aria-label={`Rolar d${sides}`}>d{sides}</button>)}</div></div>{roll && <div className="mt-3 rounded-md border border-ember/25 bg-ember/10 p-4 text-center"><p className="text-xs uppercase text-mist">d{roll.sides} · natural {roll.die} · soma {roll.modifier}</p><strong className="mt-1 block text-4xl text-white">{roll.total}</strong></div>}</section>;
}

export default function CharacterSheetMobile({ sheet, draft, origin, totalDefense, inventory, attacks, spells, vitalStatus, skillRoll, damageRoll, quickRoll, onAdjustVital, onRetryVital, onTrainingChange, onOtherChange, onRollSkill, onAddPower, onEditPower, onDeletePower, onRollPower, onAddItem, onEditItem, onDeleteItem, onWalletChange, onRollQuickDie, onQuickModifierChange, onSwapReference }) {
  const storageKey = `lugubre-sheet-tab:${sheet.id}`;
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem(storageKey) || 'summary');
  const [resourceSheetOpen, setResourceSheetOpen] = useState(false);
  useEffect(() => { sessionStorage.setItem(storageKey, activeTab); }, [activeTab, storageKey]);

  const changeTab = (tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const warnings = sheet.reference_warnings || [];
  const wallet = draft.wallet || sheet.wallet || { bronze: 0, silver: 0, platinum: 0, gold: 0 };

  return (
    <section className="lg:hidden" data-testid="mobile-character-sheet">
      <div className="sticky top-0 z-10 bg-[#080709]/95 backdrop-blur">
        <header className="border-b border-ember/15 px-3 py-2">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-ember/30 bg-black/40">{sheet.photo ? <img src={sheet.photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full bg-[radial-gradient(circle,rgba(126,68,170,.45),transparent_65%)]" />}</div>
            <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl text-white">{sheet.character_name}</h1><p className="truncate text-[11px] text-mist">Nível {sheet.level || 1} · {sheet.race_name || 'Sem raça'} · {sheet.class_name || 'Sem classe'}</p><p className="truncate text-[10px] text-ember/80">{origin}</p></div>
            <Link to={`/characters/${sheet.id}/edit`} className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-ember/30 text-ember" aria-label="Editar ficha base"><Edit size={18} /></Link>
          </div>
        </header>
        <nav className="mx-auto grid max-w-3xl grid-cols-4 gap-1 border-b border-white/10 p-2 min-[700px]:grid-cols-7" aria-label="Seções compactas da ficha">
          {tabs.map(({ id, label, Icon }) => <button key={id} type="button" className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-bold ${activeTab === id ? 'border-ember/45 bg-ember/15 text-white' : 'border-white/10 bg-black/20 text-mist'}`} onClick={() => changeTab(id)} aria-pressed={activeTab === id}><Icon size={14} className="shrink-0" /><span className="truncate">{label}</span></button>)}
        </nav>
      </div>
      <div className="mx-auto max-w-3xl px-2 py-3">
        {activeTab === 'summary' && <section className="min-[700px]:grid min-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] min-[700px]:gap-3"><div className="grid content-start gap-2">{resourceDefinitions.map((resource) => <ResourceStepper key={resource.type} compact {...resource} current={draft[resource.current]} max={draft[resource.max]} status={vitalStatus[resource.type]} onAdjust={(field, delta) => onAdjustVital(resource.type, field, delta)} onExpand={() => setResourceSheetOpen(true)} />)}</div><div><div className="mt-2 grid grid-cols-3 gap-2 min-[700px]:mt-0"><Metric label="Defesa" value={totalDefense} /><Metric label="Bloqueio" value="10" /><Metric label="Esquiva" value={sheet.dodge} /></div><div className="mt-2 grid grid-cols-5 gap-1.5">{Object.entries(attributeLabels).map(([key, label]) => <div key={key} className="rounded-full border border-white/15 bg-white/[.06] px-1 py-2 text-center"><strong className="block text-lg text-white">{sheet.attributes?.[key] ?? 2}</strong><span className="text-[8px] font-bold text-mist">{label}</span></div>)}</div>{warnings.length > 0 && <div className="mt-3 grid gap-2">{warnings.map((warning) => <button key={`${warning.type}-${warning.id || warning.current_name}`} type="button" className="rounded-md border border-amber-400/25 bg-amber-950/20 p-3 text-left text-xs text-amber-100" onClick={() => onSwapReference(warning)}>Referência removida: {warning.current_name || warning.type}. Toque para trocar.</button>)}</div>}<div className="mt-3 grid grid-cols-3 gap-2"><button type="button" className="min-h-11 rounded-md border border-ember/25 bg-ember/10 text-xs font-bold text-ember" onClick={() => changeTab('dice')}>Rolar d20</button><button type="button" className="min-h-11 rounded-md border border-white/10 bg-black/25 text-xs font-bold text-mist" onClick={() => changeTab('skills')}>Perícias</button><button type="button" className="min-h-11 rounded-md border border-white/10 bg-black/25 text-xs font-bold text-mist" onClick={() => changeTab('combat')}>Ataques</button></div></div></section>}
        {activeTab === 'skills' && <SkillPanel sheet={sheet} draft={draft} skillsCatalog={sheet.skills_catalog || []} roll={skillRoll} onTrainingChange={onTrainingChange} onOtherChange={onOtherChange} onRoll={onRollSkill} />}
        {activeTab === 'combat' && <PowerPanel title="Ataques" items={attacks} type="attacks" roll={damageRoll} onAdd={onAddPower} onEdit={onEditPower} onDelete={onDeletePower} onRoll={onRollPower} />}
        {activeTab === 'powers' && <PowerPanel title="Magias e poderes" items={spells} type="spells" roll={damageRoll} onAdd={onAddPower} onEdit={onEditPower} onDelete={onDeletePower} onRoll={onRollPower} />}
        {activeTab === 'inventory' && <InventoryPanel inventory={inventory} wallet={wallet} onAdd={onAddItem} onEdit={onEditItem} onDelete={onDeleteItem} onWalletChange={onWalletChange} />}
        {activeTab === 'dice' && <DicePanel modifier={draft.diceSettings?.quickRollModifier ?? 0} roll={quickRoll} onRoll={onRollQuickDie} onModifierChange={onQuickModifierChange} />}
        {activeTab === 'history' && <section><SectionTitle eyebrow="Persistência" title="Últimos salvamentos" /><div className="grid gap-2">{(sheet.save_history || []).map((save) => <article key={save.id || save.saved_at} className="rounded-md border border-white/10 bg-black/25 p-3"><p className="text-sm text-white">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(save.saved_at))}</p><p className="mt-1 text-[10px] font-bold uppercase text-mist">{save.label || 'Snapshot'}</p></article>)}{!(sheet.save_history || []).length && <p className="text-sm text-mist">Nenhum salvamento registrado.</p>}</div></section>}
      </div>
      {resourceSheetOpen && <ResourceSheet draft={draft} status={vitalStatus} onAdjust={onAdjustVital} onRetry={onRetryVital} onClose={() => setResourceSheetOpen(false)} />}
    </section>
  );
}
