import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '../Button';

export default function MonsterAttackForm({ attacks, onChange }) {
  const [confirmIndex, setConfirmIndex] = useState(null);

  function updateAttack(index, patch) {
    onChange(attacks.map((attack, attackIndex) => (attackIndex === index ? { ...attack, ...patch } : attack)));
  }

  function addAttack() {
    onChange([...attacks, { name: '', damageFormula: '1d6', description: '' }]);
  }

  function removeAttack(index) {
    onChange(attacks.filter((_, attackIndex) => attackIndex !== index));
    setConfirmIndex(null);
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
            <Button type="button" variant="ghost" className="px-3 text-red-200" onClick={() => setConfirmIndex(index)}><Trash2 size={16} /></Button>
          </div>
          <textarea className="mt-3 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descrição opcional" value={attack.description || ''} onChange={(event) => updateAttack(index, { description: event.target.value })} />
        </div>
      ))}
      {confirmIndex !== null && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
          <section className="gothic-panel w-full max-w-md rounded-md p-6">
            <h2 className="font-display text-3xl text-ember">Deletar ataque?</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">Tem certeza que deseja deletar este item? Essa ação não poderá ser desfeita.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmIndex(null)}>Cancelar</Button>
              <Button type="button" className="border-red-500/70 bg-red-900/70 hover:bg-red-800" onClick={() => removeAttack(confirmIndex)}>Deletar</Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
