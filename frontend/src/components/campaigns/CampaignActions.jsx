import { Copy, LogOut, Save, Trash2 } from 'lucide-react';
import Button from '../Button';

export default function CampaignActions({ campaign, isMaster, isSaving, editCampaign, onEditCampaign, onSaveCampaign, onLeave, onDelete }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/10 bg-black/25 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-mist">Convite</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded border border-ember/20 bg-black/40 px-2 py-2 text-sm text-ember">{campaign.invite_code}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(campaign.invite_code)}
            className="rounded-md border border-ember/25 p-2 text-ember hover:bg-ember/10"
            title="Copiar convite"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isMaster ? (
        <form onSubmit={onSaveCampaign} className="space-y-2 rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mist">Editar campanha</p>
          <input
            value={editCampaign.name}
            onChange={(event) => onEditCampaign({ ...editCampaign, name: event.target.value })}
            className="w-full rounded-md border border-ember/20 bg-black/35 px-3 py-2 text-sm outline-none focus:border-ember/60"
          />
          <textarea
            value={editCampaign.description}
            onChange={(event) => onEditCampaign({ ...editCampaign, description: event.target.value })}
            className="min-h-20 w-full rounded-md border border-ember/20 bg-black/35 px-3 py-2 text-sm outline-none focus:border-ember/60"
          />
          <Button className="inline-flex w-full items-center justify-center gap-2" disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar campanha'}
          </Button>
        </form>
      ) : null}

      <div className="rounded-md border border-white/10 bg-black/25 p-3">
        {isMaster ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-500/35 bg-red-950/25 px-4 py-2 font-semibold text-red-100 hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
            Excluir campanha
          </button>
        ) : (
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-ember/25 bg-ember/10 px-4 py-2 font-semibold text-ember hover:bg-ember/20"
          >
            <LogOut className="h-4 w-4" />
            Sair da campanha
          </button>
        )}
      </div>
    </div>
  );
}
