import { Dice5 } from 'lucide-react';
import Button from '../Button';
import { api } from '../../lib/api';

export default function MonsterAttackRollButton({ monster, attack, onRoll }) {
  async function rollAttack() {
    const { data } = await api.post(`/monsters/${monster.id}/attacks/${attack.id}/roll`);
    onRoll(data);
  }

  return (
    <Button type="button" variant="ghost" className="px-3 py-1.5 text-sm" onClick={rollAttack}>
      <span className="inline-flex items-center gap-2"><Dice5 size={15} /> Rolar</span>
    </Button>
  );
}
