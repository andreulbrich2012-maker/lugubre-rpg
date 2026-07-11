import Alert from '../Alert';
import Button from '../Button';
import MonsterAttackForm from './MonsterAttackForm';
import { difficultyOptions, monsterCategories } from './monsterUtils';

export default function MonsterForm({ form, setForm, editing, message, loading, onSubmit, onCancel }) {
  const minHealth = Math.max(0, Number(form.baseHealth || 0) - 4);
  const maxHealth = Number(form.baseHealth || 0) + 4;

  function readImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = String(reader.result);
      setForm({ ...form, imageUrl, tokenUrl: form.tokenUrl || imageUrl });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={onSubmit} className="gothic-panel rounded-md p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.22em] text-ember/70">Admin</p>
          <h2 className="font-display text-3xl text-white">{editing ? 'Editar monstro' : 'Adicionar monstro'}</h2>
        </div>
        {editing && <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onCancel}>Cancelar edição</Button>}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="Dificuldade" as="select" value={form.difficulty} onChange={(difficulty) => setForm({ ...form, difficulty })} options={difficultyOptions} />
        <Field label="Categoria / elemento" as="select" value={form.category} onChange={(category) => setForm({ ...form, category })} options={monsterCategories} />
        <Field label="Armadura" type="number" value={form.armor} onChange={(armor) => setForm({ ...form, armor })} />
        <Field label="Vida base" type="number" value={form.baseHealth} onChange={(baseHealth) => setForm({ ...form, baseHealth })} />
        <div className="rounded-md border border-ember/15 bg-black/25 p-3">
          <p className="text-xs uppercase tracking-[.18em] text-mist">Faixa calculada</p>
          <p className="mt-1 font-display text-2xl text-white">{minHealth} a {maxHealth}</p>
        </div>
        <Field label="URL da imagem/token" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl, tokenUrl: form.tokenUrl || imageUrl })} />
        <label className="block text-sm text-mist">
          Foto dos arquivos
          <input className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm text-mist">
          Itens / drop
          <textarea className="mt-1 min-h-24 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Fragmento de Cinza, Núcleo Flamejante" value={form.items} onChange={(event) => setForm({ ...form, items: event.target.value })} />
        </label>
        <label className="block text-sm text-mist">
          Descrição
          <textarea className="mt-1 min-h-24 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
      </div>

      <div className="mt-5">
        <MonsterAttackForm attacks={form.attacks} onChange={(attacks) => setForm({ ...form, attacks })} />
      </div>

      {message && <div className="mt-5"><Alert type={message.type}>{message.text}</Alert></div>}
      <Button className="mt-5 w-full sm:w-auto" disabled={loading}>{loading ? 'Salvando...' : editing ? 'Salvar monstro' : 'Criar monstro'}</Button>
    </form>
  );
}

function Field({ label, value, onChange, type = 'text', as = 'input', options = [] }) {
  return (
    <label className="block text-sm text-mist">
      {label}
      {as === 'select' ? (
        <select className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
