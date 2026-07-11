import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import CampaignActions from '../components/campaigns/CampaignActions';
import CampaignMembersList from '../components/campaigns/CampaignMembersList';
import CampaignMessageBubble from '../components/campaigns/CampaignMessageBubble';
import ShareCharacterWithGM from '../components/campaigns/ShareCharacterWithGM';
import SharedCharacterPreview from '../components/campaigns/SharedCharacterPreview';
import { API_URL, api } from '../lib/api';
import { useAuth } from '../store/authStore';

const tabs = [
  { id: 'chat', label: 'Chat' },
  { id: 'members', label: 'Jogadores' },
  { id: 'sheets', label: 'Fichas' },
  { id: 'actions', label: 'Acoes' }
];

function mergeMessage(current, next) {
  if (current.some((message) => message.id === next.id)) return current;
  return [...current, next];
}

function ConfirmDialog({ confirm, onCancel, onConfirm }) {
  if (!confirm) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
      <div className="gothic-panel w-full max-w-md rounded-md p-5 shadow-glow">
        <h2 className="font-display text-2xl text-ember">{confirm.title}</h2>
        <p className="mt-3 text-sm text-mist">{confirm.message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-red-500/40 bg-red-950/40 px-4 py-2 font-semibold text-red-100 hover:bg-red-900/40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ messages, currentUserId, isMaster, content, setContent, send, editingId, editText, setEditText, startEdit, cancelEdit, saveEdit, deleteMessage }) {
  return (
    <section className="gothic-panel flex min-h-[72vh] min-w-0 flex-col rounded-md p-3 sm:p-4 lg:min-h-[720px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 className="font-display text-3xl text-ember">Chat da campanha</h2>
          <p className="text-xs text-mist">Use **negrito**, *italico*, quebra de linha ou /acao para narrar.</p>
        </div>
      </div>
      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((message) => (
          <CampaignMessageBubble
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            canDeleteAny={isMaster}
            editing={editingId === message.id}
            editText={editText}
            onEditText={setEditText}
            onStartEdit={() => startEdit(message)}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onDelete={() => deleteMessage(message)}
          />
        ))}
        {!messages.length ? <p className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-mist">Nenhuma mensagem ainda.</p> : null}
      </div>
      <form onSubmit={send} className="sticky bottom-20 mt-4 flex flex-col gap-2 border-t border-white/10 bg-black/30 pt-3 backdrop-blur sm:static sm:flex-row sm:border-0 sm:bg-transparent sm:pt-0">
        <textarea
          className="min-h-12 flex-1 rounded-md border border-ember/20 bg-black/35 px-3 py-2 text-sm outline-none focus:border-ember/60"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escreva no chat..."
        />
        <Button className="inline-flex items-center justify-center gap-2 sm:self-end">
          <Send className="h-4 w-4" />
          Enviar
        </Button>
      </form>
    </section>
  );
}

export default function CampaignRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [editCampaign, setEditCampaign] = useState({ name: '', description: '' });
  const token = localStorage.getItem('lugubre-token');
  const socket = useMemo(() => io(API_URL, { auth: { token }, autoConnect: false }), [token]);

  const currentMember = room?.members?.find((member) => member.user_id === user?.id || member.id === user?.id);
  const isMaster = room?.role === 'master' || room?.campaign?.master_id === user?.id || user?.role === 'admin';
  const selectedCharacterId = currentMember?.shared_character_id || currentMember?.character_id || '';

  const loadRoom = useCallback(async () => {
    const { data } = await api.get(`/campaigns/${id}`);
    setRoom(data);
    setMessages(data.messages || []);
    setEditCampaign({
      name: data.campaign?.name || '',
      description: data.campaign?.description || ''
    });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const [roomResponse, charactersResponse] = await Promise.all([
          api.get(`/campaigns/${id}`),
          api.get('/characters')
        ]);
        if (cancelled) return;
        setRoom(roomResponse.data);
        setMessages(roomResponse.data.messages || []);
        setCharacters(charactersResponse.data || []);
        setEditCampaign({
          name: roomResponse.data.campaign?.name || '',
          description: roomResponse.data.campaign?.description || ''
        });
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Não foi possível carregar a campanha.');
      }
    }
    loadInitial();
    const poll = setInterval(() => {
      loadRoom().catch(() => null);
    }, 5000);
    socket.connect();
    socket.emit('campaign:join', id);
    socket.on('campaign:message:new', (message) => setMessages((current) => mergeMessage(current, message)));
    socket.on('campaign:message:updated', (message) => setMessages((current) => current.map((item) => item.id === message.id ? message : item)));
    socket.on('campaign:message:deleted', ({ messageId }) => setMessages((current) => current.filter((item) => item.id !== messageId)));
    socket.on('campaign:members:updated', () => loadRoom().catch(() => null));
    return () => {
      cancelled = true;
      clearInterval(poll);
      socket.disconnect();
    };
  }, [id, loadRoom, socket]);

  async function runAction(action, successMessage) {
    setError('');
    setNotice('');
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Ação não concluída.');
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!content.trim()) return;
    await runAction(async () => {
      const { data } = await api.post(`/campaigns/${id}/messages`, { content });
      setMessages((current) => mergeMessage(current, data));
      setContent('');
    });
  }

  function startEdit(message) {
    setEditingId(message.id);
    setEditText(message.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit() {
    if (!editingId || !editText.trim()) return;
    await runAction(async () => {
      const { data } = await api.put(`/campaigns/${id}/messages/${editingId}`, { content: editText });
      setMessages((current) => current.map((message) => message.id === editingId ? data : message));
      cancelEdit();
    }, 'Mensagem editada.');
  }

  function deleteMessage(message) {
    setConfirm({
      title: 'Excluir mensagem',
      message: 'Tem certeza que deseja deletar esta mensagem? Essa ação não poderá ser desfeita.',
      onConfirm: async () => {
        await runAction(async () => {
          await api.delete(`/campaigns/${id}/messages/${message.id}`);
          setMessages((current) => current.filter((item) => item.id !== message.id));
        }, 'Mensagem excluída.');
      }
    });
  }

  function removeMember(member) {
    setConfirm({
      title: 'Remover jogador',
      message: 'Tem certeza que deseja remover este jogador da campanha?',
      onConfirm: async () => {
        await runAction(async () => {
          await api.delete(`/campaigns/${id}/members/${member.user_id || member.id}`);
          await loadRoom();
        }, 'Jogador removido da campanha.');
      }
    });
  }

  async function saveShare(characterId) {
    setSavingShare(true);
    await runAction(async () => {
      await api.put(`/campaigns/${id}/members/me/character`, { characterId: characterId || null });
      await loadRoom();
    }, 'Personagem compartilhado com o GM.');
    setSavingShare(false);
  }

  async function saveColor(member, color) {
    await runAction(async () => {
      await api.put(`/campaigns/${id}/members/${member.user_id || member.id}/color`, { color });
      await loadRoom();
    }, 'Cor atualizada.');
  }

  async function saveCampaign(event) {
    event.preventDefault();
    setSavingCampaign(true);
    await runAction(async () => {
      const { data } = await api.put(`/campaigns/${id}`, editCampaign);
      setRoom((current) => ({ ...current, campaign: data }));
    }, 'Campanha salva.');
    setSavingCampaign(false);
  }

  function leaveCampaign() {
    setConfirm({
      title: 'Sair da campanha',
      message: 'Tem certeza que deseja sair desta campanha?',
      onConfirm: async () => {
        await runAction(async () => {
          await api.post(`/campaigns/${id}/leave`);
          navigate('/campaigns');
        });
      }
    });
  }

  function deleteCampaign() {
    setConfirm({
      title: 'Excluir campanha',
      message: 'Tem certeza que deseja excluir esta campanha? Essa ação não poderá ser desfeita.',
      onConfirm: async () => {
        await runAction(async () => {
          await api.delete(`/campaigns/${id}`);
          navigate('/campaigns');
        });
      }
    });
  }

  async function confirmAction() {
    const action = confirm?.onConfirm;
    setConfirm(null);
    if (action) await action();
  }

  if (!room && !error) return <main className="px-4 py-10 text-mist">Carregando...</main>;

  return (
    <main className="mx-auto max-w-[1500px] px-3 pb-24 pt-5 sm:px-4 sm:py-8">
      {error ? <Alert type="error">{error}</Alert> : null}
      {notice ? <Alert>{notice}</Alert> : null}

      {room ? (
        <>
          <header className="gothic-panel mb-4 rounded-md p-4 sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-mist">Campanha</p>
                <h1 className="break-words font-display text-3xl text-ember sm:text-5xl">{room.campaign.name}</h1>
                <p className="mt-2 max-w-3xl text-sm text-mist">{room.campaign.description || 'Sem descrição.'}</p>
              </div>
              <div className="rounded-md border border-ember/20 bg-black/30 px-3 py-2 text-sm text-mist">
                {isMaster ? 'Voce e o GM' : 'Voce e jogador'}
              </div>
            </div>
          </header>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-10 shrink-0 rounded-md border px-3 py-2 text-xs font-semibold ${activeTab === tab.id ? 'border-ember/50 bg-ember/15 text-ember' : 'border-white/10 bg-black/25 text-mist'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className={`${activeTab === 'members' || activeTab === 'actions' ? 'block' : 'hidden'} space-y-4 lg:block`}>
              <section className="gothic-panel rounded-md p-4">
                <h2 className="font-display text-2xl text-ember">Jogadores</h2>
                <div className="mt-4">
                  <CampaignMembersList
                    members={room.members || []}
                    currentUserId={user?.id}
                    isMaster={isMaster}
                    onRemove={removeMember}
                    onColorChange={saveColor}
                  />
                </div>
              </section>
              <section className="gothic-panel rounded-md p-4">
                <h2 className="font-display text-2xl text-ember">Personagem</h2>
                <p className="mb-3 text-xs text-mist">A ficha escolhida fica visível para o GM e muda seu nome/foto no chat desta campanha.</p>
                <ShareCharacterWithGM characters={characters} selectedId={selectedCharacterId} saving={savingShare} onShare={saveShare} />
              </section>
              <section className="gothic-panel rounded-md p-4">
                <h2 className="font-display text-2xl text-ember">Ações</h2>
                <div className="mt-4">
                  <CampaignActions
                    campaign={room.campaign}
                    isMaster={isMaster}
                    isSaving={savingCampaign}
                    editCampaign={editCampaign}
                    onEditCampaign={setEditCampaign}
                    onSaveCampaign={saveCampaign}
                    onLeave={leaveCampaign}
                    onDelete={deleteCampaign}
                  />
                </div>
              </section>
            </aside>

            <div className="min-w-0 space-y-4">
              <div className={activeTab === 'chat' ? 'block' : 'hidden lg:block'}>
                <ChatPanel
                  messages={messages}
                  currentUserId={user?.id}
                  isMaster={isMaster}
                  content={content}
                  setContent={setContent}
                  send={send}
                  editingId={editingId}
                  editText={editText}
                  setEditText={setEditText}
                  startEdit={startEdit}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  deleteMessage={deleteMessage}
                />
              </div>
              <section className={`${activeTab === 'sheets' ? 'block' : 'hidden lg:block'} gothic-panel rounded-md p-4`}>
                <h2 className="font-display text-3xl text-ember">Fichas compartilhadas</h2>
                <p className="mb-4 text-sm text-mist">O GM vê sempre a versão atual da ficha vinculada pelo jogador.</p>
                <SharedCharacterPreview members={room.members || []} />
              </section>
            </div>
          </div>
        </>
      ) : null}

      <ConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} onConfirm={confirmAction} />
    </main>
  );
}
