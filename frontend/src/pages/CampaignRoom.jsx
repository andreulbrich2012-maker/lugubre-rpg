import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Crown } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import CampaignActions from '../components/campaigns/CampaignActions';
import CampaignDiaryTab from '../components/campaigns/CampaignDiaryTab';
import CampaignMembersList from '../components/campaigns/CampaignMembersList';
import CampaignShopsTab from '../components/campaigns/CampaignShopsTab';
import ChatPanel from '../components/campaigns/room/ChatPanel';
import NotesPanel from '../components/campaigns/room/NotesPanel';
import SheetsPanel from '../components/campaigns/room/SheetsPanel';
import { useCampaignFeed } from '../hooks/useCampaignFeed';
import { api } from '../lib/api';
import { useAuth } from '../store/authStore';

// Sala da campanha: chat, notas, fichas, diario, loja e grupo.
// 07/11 (pedido do Andre): o mapa/mesa virtual saiu deste site; ele vai para um site so de RPG.
// O estado chega pelo feed de eventos (polling), porque a Vercel nao roda Socket.io.

export default function CampaignRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [myCharacters, setMyCharacters] = useState([]);
  const [content, setContent] = useState('');
  const [editing, setEditingState] = useState({ id: null, text: '' });
  const [editCampaign, setEditCampaign] = useState({ name: '', description: '' });
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sheetReload, setSheetReload] = useState(0);
  const noticeTimer = useRef(null);

  const isMaster = Boolean(room?.isMaster || room?.role === 'master');
  const myMember = room?.members?.find((m) => m.user_id === user?.id);
  const tab = searchParams.get('tab') || 'chat';
  const setTab = (t) => setSearchParams(t === 'chat' ? {} : { tab: t });

  const notify = useCallback((text, type = 'success') => {
    setNotice({ text, type });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadRoom = useCallback(async () => {
    const { data } = await api.get(`/campaigns/${id}`, { params: { light: 1 } });
    setRoom(data);
    return data;
  }, [id]);

  const loadNotes = useCallback(() => api.get(`/campaigns/${id}/notes`).then(({ data }) => setNotes(data)).catch(() => null), [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadRoom();
        if (cancelled) return;
        setEditCampaign({ name: data.campaign?.name || '', description: data.campaign?.description || '' });
        await Promise.all([
          api.get(`/campaigns/${id}/messages`).then(({ data: m }) => !cancelled && setMessages(m)),
          api.get('/characters').then(({ data: c }) => !cancelled && setMyCharacters(Array.isArray(c) ? c : [])).catch(() => null),
          loadNotes()
        ]);
      } catch (err) {
        if (!cancelled) setError(err.response?.status === 404 ? 'Campanha não encontrada.' : err.response?.data?.message || 'Não foi possível abrir a campanha.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, loadRoom, loadNotes]);

  const applyEvents = useCallback((events) => {
    let reloadRoom = false;
    let reloadNotes = false;
    events.forEach((ev) => {
      const p = ev.payload || {};
      switch (ev.type) {
        case 'message:created': setMessages((cur) => (cur.some((m) => m.id === p.message.id) ? cur : [...cur, p.message])); break;
        case 'message:updated': setMessages((cur) => cur.map((m) => (m.id === p.message.id ? p.message : m))); break;
        case 'message:deleted': setMessages((cur) => cur.filter((m) => m.id !== p.messageId)); break;
        case 'members:changed': case 'character:shared': reloadRoom = true; break;
        case 'character:updated': setSheetReload((n) => n + 1); break;
        case 'notes:changed': reloadNotes = true; break;
        default: break;
      }
    });
    if (reloadRoom) loadRoom().catch(() => null);
    if (reloadNotes) loadNotes();
  }, [loadRoom, loadNotes]);

  useCampaignFeed(id, applyEvents, { enabled: Boolean(room) });

  async function send(event) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    setContent('');
    try {
      const { data } = await api.post(`/campaigns/${id}/messages`, { content: text });
      setMessages((cur) => (cur.some((m) => m.id === data.id) ? cur : [...cur, data]));
    } catch (err) {
      setContent(text);
      notify(err.response?.data?.message || 'Mensagem não enviada.', 'error');
    }
  }

  async function saveEdit(messageId, text) {
    if (!text.trim()) return;
    try {
      const { data } = await api.put(`/campaigns/${id}/messages/${messageId}`, { content: text });
      setMessages((cur) => cur.map((m) => (m.id === messageId ? data : m)));
      setEditingState({ id: null, text: '' });
    } catch (err) { notify(err.response?.data?.message || 'Não deu para editar.', 'error'); }
  }

  async function deleteMessage(message) {
    if (!window.confirm('Apagar esta mensagem?')) return;
    await api.delete(`/campaigns/${id}/messages/${message.id}`).catch(() => null);
    setMessages((cur) => cur.filter((m) => m.id !== message.id));
  }

  async function share(characterId) {
    setSharing(true);
    try {
      const { data } = await api.put(`/campaigns/${id}/members/me/character`, { characterId });
      notify(data.notice || (characterId ? 'Personagem compartilhado com o mestre.' : 'Personagem retirado da campanha.'));
      await loadRoom();
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para compartilhar.', 'error');
    } finally {
      setSharing(false);
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    setSavingCampaign(true);
    try {
      const { data } = await api.put(`/campaigns/${id}`, editCampaign);
      setRoom((cur) => ({ ...cur, campaign: data }));
      notify('Campanha salva.');
    } catch (err) { notify(err.response?.data?.message || 'Não deu para salvar.', 'error'); } finally { setSavingCampaign(false); }
  }

  const tabs = useMemo(() => [
    ['chat', 'Chat'],
    ['notes', 'Notas'],
    ['sheets', 'Fichas'],
    ['diary', 'Diário'],
    ['shops', 'Loja'],
    ['group', 'Grupo']
  ], []);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-10"><Alert type="error">{error}</Alert><Button className="mt-4" onClick={() => navigate('/campaigns')}>Voltar às campanhas</Button></main>;
  if (!room) return <main className="grid min-h-[60vh] place-items-center text-mist" aria-label="Abrindo a campanha">Abrindo a campanha…</main>;

  return (
    <main className="mx-auto flex max-w-5xl flex-col px-3 py-4 sm:px-4 sm:py-6">
      <header className="gothic-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <h1 className="min-w-0 truncate font-display text-3xl leading-none text-bone sm:text-4xl">{room.campaign.name}</h1>
        <span className="flex items-center gap-1 text-sm text-mist">{isMaster ? <><Crown size={14} className="text-ember" /> Você é o mestre</> : 'Você é jogador'}</span>
        {isMaster && room.campaign.invite_code && (
          <button type="button" className="ml-auto flex items-center gap-1 text-sm text-mist hover:text-bone" onClick={() => navigator.clipboard?.writeText(room.campaign.invite_code).then(() => notify('Código de convite copiado.'))}>
            Convite <span className="font-bold tracking-wider text-ember">{room.campaign.invite_code}</span> <Copy size={13} />
          </button>
        )}
        {room.campaign.description && <p className="w-full text-sm text-mist">{room.campaign.description}</p>}
      </header>

      {notice && (
        <div role="status" className={`fixed left-1/2 top-20 z-[60] -translate-x-1/2 border-[3px] border-lead px-4 py-2 shadow-2xl ${notice.type === 'error' ? 'bg-[#2a0b12] text-red-100' : 'lit'}`}>{notice.text}</div>
      )}

      <section className="gothic-panel mt-4 flex min-h-[70svh] flex-col" aria-label="Campanha">
        <nav className="flex overflow-x-auto border-b-[3px] border-lead" aria-label="Seções da campanha">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`shrink-0 px-4 py-3 text-sm font-bold ${tab === key ? 'lit' : 'text-mist hover:text-bone'}`}>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex min-h-[60svh] flex-1 flex-col">
          {tab === 'chat' && (
            <div className="flex h-[70svh] flex-col">
              <ChatPanel
                messages={messages}
                currentUserId={user?.id}
                isMaster={isMaster}
                content={content}
                setContent={setContent}
                onSend={send}
                editing={{ ...editing, set: setEditingState }}
                onEdit={saveEdit}
                onDelete={deleteMessage}
              />
            </div>
          )}
          {tab === 'notes' && <NotesPanel campaignId={id} notes={notes} currentUserId={user?.id} isMaster={isMaster} onChanged={loadNotes} />}
          {tab === 'sheets' && <SheetsPanel campaignId={id} members={room.members || []} myCharacters={myCharacters} myMember={myMember} isMaster={isMaster} onShare={share} sharing={sharing} reloadKey={sheetReload} />}
          {tab === 'diary' && <div className="p-3"><CampaignDiaryTab campaignId={id} isMaster={isMaster} currentUserId={user?.id} /></div>}
          {tab === 'shops' && <div className="p-3"><CampaignShopsTab campaignId={id} isMaster={isMaster} characters={myCharacters} /></div>}
          {tab === 'group' && (
            <div className="space-y-6 p-3">
              <section>
                <h2 className="font-display text-2xl text-bone">Jogadores</h2>
                <div className="mt-3">
                  <CampaignMembersList
                    members={room.members || []}
                    currentUserId={user?.id}
                    isMaster={isMaster}
                    onRemove={async (m) => {
                      if (!window.confirm('Remover este jogador da campanha?')) return;
                      await api.delete(`/campaigns/${id}/members/${m.user_id || m.id}`).catch(() => null);
                      loadRoom();
                    }}
                    onColorChange={async (m, color) => {
                      await api.put(`/campaigns/${id}/members/${m.user_id || m.id}/color`, { color }).catch(() => null);
                      loadRoom();
                    }}
                  />
                </div>
              </section>
              <section>
                <h2 className="font-display text-2xl text-bone">Campanha</h2>
                <div className="mt-3">
                  <CampaignActions
                    campaign={room.campaign}
                    isMaster={isMaster}
                    isSaving={savingCampaign}
                    editCampaign={editCampaign}
                    onEditCampaign={setEditCampaign}
                    onSaveCampaign={saveCampaign}
                    onLeave={async () => { if (window.confirm('Sair desta campanha?')) { await api.post(`/campaigns/${id}/leave`).catch(() => null); navigate('/campaigns'); } }}
                    onDelete={async () => { if (window.confirm('Excluir esta campanha? Isso não pode ser desfeito.')) { await api.delete(`/campaigns/${id}`).catch(() => null); navigate('/campaigns'); } }}
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
