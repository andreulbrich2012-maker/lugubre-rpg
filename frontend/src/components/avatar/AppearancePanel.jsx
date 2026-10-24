import { useEffect, useState } from 'react';
import { Save, Shirt, X } from 'lucide-react';
import AvatarSprite from './AvatarSprite';
import AvatarCreator from './AvatarCreator';
import { api } from '../../lib/api';
import { defaultAppearance, raceIdFromName } from '../../lib/avatar/appearance';

// Bloco da ficha: boneco andando (vira de direcao sozinho) e o botao "Editar aparencia",
// que abre o criador e salva so a aparencia (PATCH /characters/:id/appearance).
const TURN = ['down', 'left', 'up', 'right'];

export default function AppearancePanel({ sheet, onSaved, className = '' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [turn, setTurn] = useState(0);
  const appearance = sheet.appearance || defaultAppearance(raceIdFromName(sheet.race_name));

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setTurn((n) => (n + 1) % 4), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/characters/${sheet.id}/appearance`, { appearance: draft });
      onSaved?.(data);
      setOpen(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Não foi possível salvar a aparência.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`pane flex items-center gap-3 p-3 ${className}`} aria-label="Aparência do personagem">
      <div className="grid shrink-0 place-items-center rounded-md border-[3px] border-lead p-1" style={{ background: 'repeating-conic-gradient(#3e5a2e 0% 25%, #45642f 0% 50%) 0 0 / 16px 16px' }}>
        <AvatarSprite appearance={appearance} direction={TURN[turn]} moving scale={3} title={`Aparência de ${sheet.character_name}`} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl text-bone">Aparência</p>
        <p className="text-xs text-mist">{sheet.appearance ? 'Este é o boneco que anda no mapa.' : 'Ainda no visual padrão da raça.'}</p>
        <button type="button" className="btn btn-glass mt-2 !min-h-9 text-sm" onClick={() => { setDraft(appearance); setError(''); setOpen(true); }}>
          <Shirt size={16} /> Editar aparência
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-abyss/85 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Editar aparência">
          <div className="gothic-panel w-full max-w-5xl rounded-md border-[3px] border-lead p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-bone">Editar aparência</h2>
              <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <AvatarCreator value={draft} raceId={raceIdFromName(sheet.race_name)} onChange={setDraft} />
            {error && <p className="mt-3 border-[3px] border-lead bg-blood/40 p-2 text-sm text-bone" role="alert">{error}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-glass" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-lit" onClick={save} disabled={saving}><Save size={18} /> {saving ? 'Salvando...' : 'Salvar aparência'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
