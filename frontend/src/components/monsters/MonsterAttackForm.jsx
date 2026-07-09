import { Plus, Trash2 } from 'lucide-react';
import Button from '../Button';

export default function MonsterAttackForm({ attacks, onChange }) {
  function updateAttack(index, patch) {
    onChange(attacks.map((attack, attackIndex) => (attackIndex === index ? { ...attack, ...patch } : attack)));
  }

  function addAttack() {
    onChange([...attacks, { name: '', damageFormula: '1d6', description: '' }]);
  }

  function removeAttack(index) {
    onChange(attacks.filter((_, attackIndex) => attackIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[.22em] text-ember">Ataques</p>
        <Button type="button" variant="ghost" className="px-3 py-1.5 text-sm" onClick={addAttack}>
          <span className="inline-flex items-center gap-2"><Plus size={14} /> Ataque</span>
        </Button>
      </div>
      {attacks.map((attack, index) => (
        <div key={attack.id || index} className="rounded-md border border-ember/15 bg-black/25 p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Nome do ataque" value={attack.name} onChange={(event) => updateAttack(index, { name: event.target.value })} />
            <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="1d8+2" value={attack.damageFormula} onChange={(event) => updateAttack(index, { damageFormula: event.target.value })} />
            <Button type="button" variant="ghost" className="px-3" onClick={() => removeAttack(index)}><Trash2 size={16} /></Button>
          </div>
          <textarea className="mt-3 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descrição opcional" value={attack.description || ''} onChange={(event) => updateAttack(index, { description: event.target.value })} />
        </div>
      ))}
    </div>
  );
}
