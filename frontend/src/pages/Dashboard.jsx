import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, ScrollText, Shield, Swords, Trash2, Users } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import LoadingButton from '../components/LoadingButton';
import { api } from '../lib/api';
import { useAuth } from '../store/authStore';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'characters', label: 'Personagens', icon: ScrollText },
  { id: 'campaigns', label: 'Campanhas', icon: Swords },
  { id: 'friends', label: 'Amigos', icon: Users }
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [dashboard, chars, camps] = await Promise.all([
      api.get('/dashboard'),
      api.get('/characters'),
      api.get('/campaigns')
    ]);
    setSummary(dashboard.data);
    setCharacters(chars.data);
    setCampaigns(camps.data);
    setLoading(false);
  }

  async function removeCharacter(id) {
    await api.delete(`/characters/${id}`);
    load();
  }

  function signOut() {
    logout();
    navigate('/login');
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="gothic-panel rounded-md p-4 lg:sticky lg:top-24 lg:h-[calc(100vh-140px)]">
        <div className="border-b border-ember/10 pb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-ember/70">Conta</p>
          <h1 className="mt-2 font-display text-3xl text-ember">{user?.name}</h1>
          <p className="text-sm text-mist">{user?.email}</p>
        </div>
        <nav className="mt-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${active === tab.id ? 'border-ember/50 bg-ember/15 text-white' : 'border-transparent text-mist hover:border-ember/20 hover:text-white'}`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <Button variant="ghost" className="mt-6 w-full" onClick={signOut}>Sair</Button>
      </aside>

      <section className="min-h-[640px]">
        {loading ? (
          <div className="gothic-panel grid min-h-80 place-items-center rounded-md">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
          </div>
        ) : (
          <>
            {active === 'dashboard' && <DashboardTab summary={summary} user={user} />}
            {active === 'characters' && <CharactersTab characters={characters} onRemove={removeCharacter} />}
            {active === 'campaigns' && <CampaignsTab campaigns={campaigns} onReload={load} />}
            {active === 'friends' && <FriendsTab />}
          </>
        )}
      </section>
    </main>
  );
}

function DashboardTab({ summary, user }) {
  return (
    <div className="space-y-6">
      <section className="gothic-panel rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-mist">Bem-vindo de volta,</p>
            <h2 className="font-display text-4xl text-ember">{user?.name}</h2>
          </div>
          <Shield className="text-ember" size={34} />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Metric label="Personagens" value={summary?.characters_count || 0} />
          <Metric label="Campanhas" value={summary?.campaigns_count || 0} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/characters/new" className="gothic-panel soft-motion rounded-md p-5">
          <h3 className="font-display text-2xl text-white">Criar personagem</h3>
          <p className="mt-2 text-sm text-mist">Comece uma nova ficha com raça, classe, origem e inventário.</p>
        </Link>
        <Link to="/campaigns" className="gothic-panel soft-motion rounded-md p-5">
          <h3 className="font-display text-2xl text-white">Campanhas</h3>
          <p className="mt-2 text-sm text-mist">Crie uma mesa ou entre com um código de convite.</p>
        </Link>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-ember/15 bg-black/25 p-4">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 font-display text-4xl text-white">{value}</p>
    </div>
  );
}

function CharactersTab({ characters, onRemove }) {
  return (
    <div className="gothic-panel rounded-md p-6">
      <Header title="Personagens" action={<Link to="/characters/new"><Button>Criar personagem</Button></Link>} />
      {characters.length === 0 ? (
        <Empty text="Voce ainda nao criou nenhum personagem." />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <article key={character.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <h3 className="font-display text-2xl text-white">{character.character_name}</h3>
              <p className="text-sm text-mist">{character.race_name || 'Sem raca'} · {character.class_name || 'Sem classe'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/characters/${character.id}`}><Button variant="ghost">Abrir ficha</Button></Link>
                <Link to={`/characters/${character.id}/edit`}><Button variant="ghost">Editar</Button></Link>
                <Button variant="ghost" onClick={() => onRemove(character.id)}><Trash2 size={16} /></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignsTab({ campaigns, onReload }) {
  const [create, setCreate] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function createCampaign(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/campaigns', create);
      setCreate({ name: '', description: '' });
      setMessage({ type: 'success', text: 'Campanha criada.' });
      onReload();
    } catch {
      setMessage({ type: 'error', text: 'Nao foi possivel criar a campanha.' });
    } finally {
      setLoading(false);
    }
  }

  async function joinCampaign(event) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/campaigns/join', { inviteCode });
      setInviteCode('');
      setMessage({ type: 'success', text: 'Voce entrou na campanha.' });
      onReload();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Convite invalido.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="gothic-panel rounded-md p-6">
        <Header title="Campanhas" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <form onSubmit={createCampaign} className="space-y-3 rounded-md border border-ember/15 bg-black/25 p-4">
            <h3 className="font-display text-2xl">Criar campanha</h3>
            <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Nome" value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} />
            <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descricao" value={create.description} onChange={(event) => setCreate({ ...create, description: event.target.value })} />
            <LoadingButton loading={loading} loadingText="Salvando...">Criar</LoadingButton>
          </form>
          <form onSubmit={joinCampaign} className="space-y-3 rounded-md border border-ember/15 bg-black/25 p-4">
            <h3 className="font-display text-2xl">Entrar em campanha</h3>
            <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Codigo de convite" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
            <LoadingButton loading={loading} loadingText="Entrando...">Entrar</LoadingButton>
          </form>
        </div>
        {message && <div className="mt-4"><Alert type={message.type}>{message.text}</Alert></div>}
      </section>
      <section className="gothic-panel rounded-md p-6">
        {campaigns.length === 0 ? (
          <Empty text="Voce ainda nao participa de nenhuma campanha." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="rounded-md border border-ember/15 bg-black/25 p-4 soft-motion">
                <h3 className="font-display text-2xl text-white">{campaign.name}</h3>
                <p className="mt-2 text-sm text-mist">{campaign.description}</p>
                <p className="mt-4 text-xs text-ember">Convite: {campaign.invite_code}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FriendsTab() {
  const [friends, setFriends] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState(null);
  const { user } = useAuth();

  const activeFriend = useMemo(() => selected || friends[0]?.friend || null, [selected, friends]);

  async function loadFriends() {
    const { data } = await api.get('/friends');
    setFriends(data);
  }

  async function search(term) {
    setQuery(term);
    if (term.trim().length < 2) return setResults([]);
    const { data } = await api.get(`/friends/search?q=${encodeURIComponent(term)}`);
    setResults(data);
  }

  async function add(email) {
    try {
      const { data } = await api.post('/friends/add', { email });
      setNotice({ type: 'success', text: 'Amigo adicionado.' });
      setSelected(data.friend);
      setQuery('');
      setResults([]);
      loadFriends();
    } catch (err) {
      setNotice({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel adicionar.' });
    }
  }

  async function loadMessages(friendId) {
    if (!friendId) return setMessages([]);
    const { data } = await api.get(`/friends/messages/${friendId}`);
    setMessages(data);
  }

  async function send(event) {
    event.preventDefault();
    if (!draft.trim() || !activeFriend) return;
    await api.post('/friends/messages', { friendId: activeFriend.id, message: draft });
    setDraft('');
    loadMessages(activeFriend.id);
  }

  useEffect(() => { loadFriends(); }, []);
  useEffect(() => { loadMessages(activeFriend?.id); }, [activeFriend?.id]);
  useEffect(() => {
    if (!activeFriend?.id) return undefined;
    const timer = setInterval(() => loadMessages(activeFriend.id), 4000);
    return () => clearInterval(timer);
  }, [activeFriend?.id]);

  return (
    <div className="gothic-panel rounded-md p-6">
      <Header title="Amigos" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div>
            <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Pesquisar usuario ou email" value={query} onChange={(event) => search(event.target.value)} />
            {results.length > 0 && (
              <div className="mt-2 space-y-2 rounded-md border border-ember/15 bg-black/35 p-2">
                {results.map((result) => (
                  <button key={result.id} className="w-full rounded px-2 py-2 text-left text-sm hover:bg-ember/10" onClick={() => add(result.email)}>
                    <span className="block text-white">{result.name}</span>
                    <span className="text-xs text-mist">{result.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {notice && <Alert type={notice.type}>{notice.text}</Alert>}
          <div className="space-y-2">
            {friends.length === 0 ? (
              <Empty text="Pesquise usuarios para adicionar amigos." compact />
            ) : friends.map((friendship) => (
              <button key={friendship.id} onClick={() => setSelected(friendship.friend)} className={`w-full rounded-md border px-3 py-2 text-left ${activeFriend?.id === friendship.friend.id ? 'border-ember/50 bg-ember/15' : 'border-ember/15 bg-black/25'}`}>
                <span className="block text-sm text-white">{friendship.friend.name}</span>
                <span className="text-xs text-mist">{friendship.friend.email}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="rounded-md border border-ember/15 bg-black/25">
          <div className="border-b border-ember/10 p-4">
            <h3 className="font-display text-2xl">{activeFriend?.name || 'Conversa'}</h3>
          </div>
          <div className="h-80 space-y-2 overflow-y-auto p-4">
            {!activeFriend && <Empty text="Selecione ou adicione um amigo para conversar." compact />}
            {messages.map((message) => {
              const mine = message.sender_id === user?.id;
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${mine ? 'bg-blood text-white' : 'bg-ember/10 text-mist'}`}>
                    {message.message}
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-ember/10 p-4">
            <input className="min-w-0 flex-1 rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Digite uma mensagem" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeFriend} />
            <Button disabled={!activeFriend}><MessageCircle size={16} /></Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Header({ title, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-3xl text-ember">{title}</h2>
      {action}
    </div>
  );
}

function Empty({ text, compact = false }) {
  return (
    <div className={`rounded-md border border-dashed border-ember/20 bg-black/20 text-center text-mist ${compact ? 'p-4 text-sm' : 'mt-5 p-8'}`}>
      {text}
    </div>
  );
}
