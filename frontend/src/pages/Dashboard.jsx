import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Camera, ChevronRight, CircleUserRound, Eye, EyeOff, Flame, LayoutDashboard, Menu, MessageCircle, MessageSquareText, Palette, ScrollText, Settings, Shield, Skull, Sparkles, Swords, Trash2, Users, X } from 'lucide-react';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import LoadingButton from '../components/LoadingButton';
import UserMenu from '../components/UserMenu';
import { api } from '../lib/api';
import { MonstersTab } from './Monsters';
import { useAuth } from '../store/authStore';
import FeedbackPanel from '../components/feedback/FeedbackPanel';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'characters', label: 'Personagens', icon: ScrollText },
  { id: 'campaigns', label: 'Campanhas', icon: Swords },
  { id: 'friends', label: 'Amigos', icon: Users },
  { id: 'monsters', label: 'Monstros', icon: Skull },
  { id: 'library', label: 'Biblioteca', icon: BookOpen, href: '/powers' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
  { id: 'settings', label: 'Configuracoes', icon: Settings },
  { id: 'personalization', label: 'Personalizacao', icon: Palette }
];

const immersivePhrases = [
  'As sombras aguardavam teu retorno.',
  'O Grimório permanece aberto.',
  'Uma nova história será escrita.',
  'O destino espera.',
  'As velas ainda queimam.',
  'A névoa se ergue novamente.',
  'O silêncio reconhece teus passos.',
  'A mesa está pronta para mais uma jornada.',
  'Os ecos da última sessão ainda sussurram.',
  'O Lúgubre desperta mais uma vez.'
];

export default function Dashboard() {
  const { user, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [active, setActive] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  function activateTab(tabId) {
    setActive(tabId);
    if (tabId === 'dashboard') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  }

  useEffect(() => {
    load();
    refreshMe().catch(() => null);
  }, []);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab && tabs.some((tab) => tab.id === requestedTab && !tab.href)) {
      setActive(requestedTab);
    }
  }, [searchParams]);

  return (
    <main className="mx-auto grid max-w-[1600px] gap-4 px-3 pb-24 pt-4 sm:px-4 sm:py-5 lg:grid-cols-[270px_minmax(0,1fr)]">
      {sidebarOpen && <button className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`gothic-panel fixed left-3 right-3 top-20 z-40 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-md p-3 lg:sticky lg:left-auto lg:right-auto lg:top-20 lg:z-auto lg:flex lg:h-[calc(100vh-6.5rem)] lg:flex-col ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-ember/10 pb-4">
          <Avatar user={user} size="md" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-mist/70">Conta</p>
            <h1 className="truncate font-display text-xl text-white">{user?.name}</h1>
            <p className="truncate text-xs text-mist">{user?.email}</p>
          </div>
        </div>
        <nav className="mt-4 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const className = `flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${active === tab.id ? 'border-[#8b5cf6]/40 bg-[#7c3aed]/20 text-[#b99af3]' : 'border-transparent text-mist hover:border-[#8b5cf6]/20 hover:bg-white/[.03] hover:text-white'}`;
            if (tab.href) {
              return <Link key={tab.id} to={tab.href} onClick={() => setSidebarOpen(false)} className={className}><Icon size={18} />{tab.label}</Link>;
            }
            return <button key={tab.id} onClick={() => { activateTab(tab.id); setSidebarOpen(false); }} className={className}><Icon size={18} />{tab.label}</button>;
          })}
        </nav>
        <div className="mt-6 rounded-md border border-[#8b5cf6]/20 bg-black/30 p-3 lg:mt-auto">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-[#8b5cf6]/35 bg-[#7c3aed]/15 text-[#9b72e8]"><Sparkles size={20} /></div>
            <div>
              <p className="font-display text-lg text-white">Lúgubre RPG</p>
              <p className="text-xs text-mist">v0.5.0 Beta</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-mist/80">O destino espera.</p>
        </div>
      </aside>

      <section className="min-h-[640px] min-w-0">
        <DashboardTopbar user={user} onMenu={() => setSidebarOpen(true)} onSettings={() => activateTab('settings')} onLogout={signOut} />
        {loading ? (
          <div className="gothic-panel grid min-h-80 place-items-center rounded-md">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ember/30 border-t-ember" />
          </div>
        ) : (
          <>
            {active === 'dashboard' && <DashboardTab summary={summary} user={user} characters={characters} campaigns={campaigns} onSettings={() => activateTab('settings')} />}
            {active === 'characters' && <CharactersTab characters={characters} onRemove={removeCharacter} />}
            {active === 'campaigns' && <CampaignsTab campaigns={campaigns} onReload={load} />}
            {active === 'friends' && <FriendsTab />}
            {active === 'monsters' && <MonstersTab />}
            {active === 'feedback' && <FeedbackPanel />}
            {active === 'settings' && <SettingsTab />}
            {active === 'personalization' && <PersonalizationTab />}
          </>
        )}
      </section>
    </main>
  );
}

function DashboardTopbar({ user, onMenu, onSettings, onLogout }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-md border border-[#8b5cf6]/15 bg-black/25 p-3 lg:hidden">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#9b72e8]">Painel</p>
        <h2 className="truncate font-display text-2xl text-white">Dashboard</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" className="px-3" onClick={onMenu} title="Abrir navegação"><Menu size={18} /></Button>
        <UserMenu user={user} onSettings={onSettings} onLogout={onLogout} />
      </div>
    </div>
  );
}

function DashboardTab({ summary, user, characters, campaigns, onSettings }) {
  const phrase = useMemo(() => immersivePhrases[Math.floor(Math.random() * immersivePhrases.length)], []);
  const characterCount = Number(summary?.characters_count || 0);
  const campaignCount = Number(summary?.campaigns_count || 0);
  const total = characterCount + campaignCount;
  const campaignAngle = total ? Math.round((campaignCount / total) * 360) : 0;
  const characterAngle = total ? Math.round((characterCount / total) * 360) : 0;
  const chartBackground = total
    ? `conic-gradient(#8b5cf6 0deg ${campaignAngle}deg, #4c2a84 ${campaignAngle}deg ${campaignAngle + characterAngle}deg, #211831 ${campaignAngle + characterAngle}deg 360deg)`
    : 'conic-gradient(#211831 0deg 360deg)';

  const actions = [
    { to: '/characters/new', icon: CircleUserRound, title: 'Criar personagem', description: 'Comece uma nova ficha com raça, classe, origem e inventário.', action: 'Criar agora' },
    { to: '/campaigns', icon: Swords, title: 'Campanhas', description: 'Crie uma mesa ou entre com um código de convite.', action: 'Ver campanhas' },
    { to: '/powers', icon: BookOpen, title: 'Biblioteca', description: 'Busque magias, poderes, objetos e adicione direto na ficha.', action: 'Explorar' },
    { to: '/feedback', icon: MessageSquareText, title: 'Feedback', description: 'Envie bugs, ideias e sugestões para melhorar o sistema.', action: 'Enviar feedback' }
  ];

  const activity = [
    {
      icon: Swords,
      title: campaigns?.[0] ? 'Campanha disponível' : 'Campanhas prontas',
      detail: campaigns?.[0]?.name || 'Crie sua primeira mesa',
      time: campaigns?.[0] ? 'Recente' : 'Agora'
    },
    {
      icon: CircleUserRound,
      title: characters?.[0] ? 'Personagem criado' : 'Ficha aguardando',
      detail: characters?.[0]?.character_name || 'Comece um novo personagem',
      time: characters?.[0] ? 'Recente' : 'Agora'
    },
    { icon: BookOpen, title: 'Biblioteca integrada', detail: 'Magias e poderes disponíveis', time: 'Online' }
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_312px]">
        <div className="gothic-panel relative min-h-[150px] overflow-hidden rounded-md">
          <img src="/images/lugubre/lugubre-dashboard-banner.jpg" alt="" aria-hidden="true" decoding="async" className="absolute inset-0 h-full w-full scale-[1.04] object-cover object-[center_48%] opacity-70" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,10,.48),rgba(8,6,18,.58)_50%,rgba(5,4,10,.94)_100%)]" />
          <div className="absolute inset-0 shadow-[inset_0_0_95px_28px_rgba(5,4,10,.68)]" />
          <div className="relative flex min-h-[150px] items-end justify-end p-5 sm:items-center sm:p-6">
            <div className="max-w-xs text-right">
              <p className="font-display text-lg leading-relaxed text-white">“Nas sombras, cada escolha escreve uma nova lenda.”</p>
              <div className="mt-3 flex items-center justify-end gap-2 text-[#9b72e8]">
                <span className="h-px w-12 bg-[#8b5cf6]/40" /><Sparkles size={15} /><span className="h-px w-12 bg-[#8b5cf6]/40" />
              </div>
            </div>
          </div>
        </div>
        <div className="gothic-panel flex min-h-[150px] items-center gap-3 rounded-md p-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl text-white">{user?.name}</p>
            <span className="mt-2 inline-flex rounded border border-[#8b5cf6]/25 bg-[#7c3aed]/20 px-2 py-1 text-[11px] font-semibold text-[#b99af3]">{user?.role === 'admin' ? 'Mestre' : 'Jogador'}</span>
          </div>
          <button type="button" onClick={onSettings} aria-label="Abrir configurações" className="grid h-10 w-10 place-items-center rounded-md text-mist transition-colors hover:bg-[#7c3aed]/15 hover:text-[#b99af3]"><Settings size={19} /></button>
        </div>
      </section>

      <section className="gothic-panel rounded-md p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-mist">Bem-vindo de volta,</p>
            <h2 className="mt-1 break-words font-display text-3xl text-[#9b72e8] sm:text-4xl">{user?.name}</h2>
            <p className="mt-2 text-xs uppercase tracking-[.18em] text-mist/55">{phrase}</p>
          </div>
          <Shield className="shrink-0 text-[#8b5cf6]" size={32} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Metric icon={CircleUserRound} label="Personagens criados" value={characterCount} />
          <Metric icon={Swords} label="Campanhas ativas" value={campaignCount} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => <DashboardAction key={action.to} {...action} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr]">
        <article className="gothic-panel rounded-md p-5">
          <h3 className="font-display text-xl text-[#b99af3]">Atividade recente</h3>
          <div className="mt-4 space-y-4">
            {activity.map(({ icon: Icon, title, detail, time }) => (
              <div key={title} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3">
                <Icon size={21} className="text-[#8b5cf6]" />
                <div className="min-w-0"><p className="truncate text-sm text-white">{title}</p><p className="truncate text-xs text-mist">{detail}</p></div>
                <span className="text-[11px] text-mist/60">{time}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="gothic-panel rounded-md p-5">
          <h3 className="font-display text-xl text-[#b99af3]">Estatísticas rápidas</h3>
          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: chartBackground }}>
              <div className="grid h-[78px] w-[78px] place-items-center rounded-full border border-white/5 bg-[#08070d] text-center">
                <div><p className="font-display text-2xl text-white">{total}</p><p className="text-[10px] text-mist">Total</p></div>
              </div>
            </div>
            <div className="w-full max-w-44 space-y-3 text-sm">
              <StatLegend color="#8b5cf6" label="Campanhas" value={campaignCount} />
              <StatLegend color="#4c2a84" label="Personagens" value={characterCount} />
              <StatLegend color="#211831" label="Outros" value={0} />
            </div>
          </div>
        </article>

        <article className="gothic-panel flex min-h-60 flex-col rounded-md p-5">
          <h3 className="font-display text-xl text-[#b99af3]">Dica do mestre</h3>
          <div className="flex flex-1 items-center gap-5 py-5">
            <Flame className="shrink-0 text-[#8b5cf6]" size={42} />
            <p className="text-sm leading-relaxed text-mist">Use a <span className="text-[#b99af3]">Biblioteca</span> para adicionar magias e poderes diretamente na ficha do personagem.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex min-h-24 items-center gap-4 rounded-md border border-[#8b5cf6]/15 bg-black/30 p-4">
      <Icon className="shrink-0 text-[#8b5cf6]" size={30} />
      <div><p className="text-[11px] uppercase tracking-[.12em] text-mist/70">{label}</p><p className="mt-1 font-display text-3xl text-white">{value}</p></div>
    </div>
  );
}

function DashboardAction({ to, icon: Icon, title, description, action }) {
  return (
    <article className="gothic-panel soft-motion flex min-h-56 flex-col rounded-md p-5">
      <div className="flex items-start gap-4">
        <Icon className="shrink-0 text-[#8b5cf6]" size={34} />
        <div><h3 className="font-display text-2xl text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-mist">{description}</p></div>
      </div>
      <Link to={to} className="mt-auto flex min-h-10 items-center justify-between rounded-md border border-white/10 bg-white/[.025] px-3 text-sm text-mist transition-colors hover:border-[#8b5cf6]/35 hover:bg-[#7c3aed]/10 hover:text-white">
        {action}<ChevronRight size={16} />
      </Link>
    </article>
  );
}

function StatLegend({ color, label, value }) {
  return <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="flex-1 text-mist">{label}</span><span className="text-white">{value}</span></div>;
}

function CharactersTab({ characters, onRemove }) {
  return (
    <div className="gothic-panel rounded-md p-4 sm:p-6">
      <Header title="Personagens" action={<Link to="/characters/new"><Button className="w-full sm:w-auto">Criar personagem</Button></Link>} />
      {characters.length === 0 ? (
        <Empty text="Voce ainda nao criou nenhum personagem." />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <article key={character.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <h3 className="font-display text-2xl text-white">{character.character_name}</h3>
              <p className="text-sm text-mist">{character.race_name || 'Sem raca'} · {character.class_name || 'Sem classe'}</p>
              <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                <Link to={`/characters/${character.id}`}><Button variant="ghost" className="w-full sm:w-auto">Abrir ficha</Button></Link>
                <Link to={`/characters/${character.id}/edit`}><Button variant="ghost" className="w-full sm:w-auto">Editar</Button></Link>
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => onRemove(character.id)}><Trash2 size={16} /></Button>
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
      <section className="gothic-panel rounded-md p-4 sm:p-6">
        <Header title="Campanhas" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <form onSubmit={createCampaign} className="space-y-3 rounded-md border border-ember/15 bg-black/25 p-4">
            <h3 className="font-display text-2xl">Criar campanha</h3>
            <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Nome" value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} />
            <textarea className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Descricao" value={create.description} onChange={(event) => setCreate({ ...create, description: event.target.value })} />
            <LoadingButton loading={loading} loadingText="Salvando..." className="w-full">Criar</LoadingButton>
          </form>
          <form onSubmit={joinCampaign} className="space-y-3 rounded-md border border-ember/15 bg-black/25 p-4">
            <h3 className="font-display text-2xl">Entrar em campanha</h3>
            <input className="w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Codigo de convite" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
            <LoadingButton loading={loading} loadingText="Entrando..." className="w-full">Entrar</LoadingButton>
          </form>
        </div>
        {message && <div className="mt-4"><Alert type={message.type}>{message.text}</Alert></div>}
      </section>
      <section className="gothic-panel rounded-md p-4 sm:p-6">
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
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
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
      setMobileChatOpen(true);
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
    <div className="gothic-panel rounded-md p-4 sm:p-6">
      <Header title="Amigos" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className={`space-y-4 ${mobileChatOpen ? 'hidden lg:block' : 'block'}`}>
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
              <button key={friendship.id} onClick={() => { setSelected(friendship.friend); setMobileChatOpen(true); }} className={`w-full rounded-md border px-3 py-2 text-left ${activeFriend?.id === friendship.friend.id ? 'border-ember/50 bg-ember/15' : 'border-ember/15 bg-black/25'}`}>
                <span className="block text-sm text-white">{friendship.friend.name}</span>
                <span className="text-xs text-mist">{friendship.friend.email}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className={`rounded-md border border-ember/15 bg-black/25 ${mobileChatOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center gap-3 border-b border-ember/10 p-4">
            <Button variant="ghost" className="px-3 lg:hidden" onClick={() => setMobileChatOpen(false)}>Voltar</Button>
            <h3 className="font-display text-2xl">{activeFriend?.name || 'Conversa'}</h3>
          </div>
          <div className="h-[58vh] space-y-2 overflow-y-auto p-3 sm:p-4 lg:h-80">
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
          <form onSubmit={send} className="sticky bottom-20 flex gap-2 border-t border-ember/10 bg-black/35 p-3 backdrop-blur sm:static sm:p-4">
            <input className="min-w-0 flex-1 rounded-md border border-ember/20 bg-black/30 px-3 py-2" placeholder="Digite uma mensagem" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!activeFriend} />
            <Button disabled={!activeFriend}><MessageCircle size={16} /></Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { user, updateProfile, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [preview, setPreview] = useState(user?.profile_image_url || '');
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  function readImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Envie um arquivo de imagem.' });
      return;
    }
    if (file.size > 900_000) {
      setProfileMessage({ type: 'error', text: 'Use uma imagem menor que 900 KB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMessage(null);
    if (!profile.name.trim() || !profile.email.trim()) {
      setProfileMessage({ type: 'error', text: 'Nome e email sao obrigatorios.' });
      return;
    }
    setProfileLoading(true);
    try {
      const updated = await updateProfile({ name: profile.name, email: profile.email, profileImageUrl: preview });
      setPreview(updated.profile_image_url || '');
      setProfileMessage({ type: 'success', text: 'Perfil salvo com sucesso.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel salvar o perfil.' });
    } finally {
      setProfileLoading(false);
    }
  }

  async function uploadProfileImage() {
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const { data } = await api.post('/users/profile-image', { image: preview });
      setUser(data.user);
      setProfileMessage({ type: 'success', text: 'Foto de perfil salva.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel salvar a foto.' });
    } finally {
      setProfileLoading(false);
    }
  }

  async function removeProfileImage() {
    if (!window.confirm('Remover foto de perfil?')) return;
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const { data } = await api.delete('/users/profile-image');
      setUser(data.user);
      setPreview('');
      setProfileMessage({ type: 'success', text: data.message || 'Foto removida com sucesso.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel remover a foto.' });
    } finally {
      setProfileLoading(false);
    }
  }


  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage(null);
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Preencha todos os campos de senha.' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Nova senha e confirmacao precisam ser iguais.' });
      return;
    }
    setPasswordLoading(true);
    try {
      const { data } = await api.put('/users/password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage({ type: 'success', text: data.message || 'Senha alterada com sucesso.' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err?.response?.data?.message || 'Erro ao alterar senha.' });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="gothic-panel rounded-md p-4 sm:p-6">
        <Header title="Configuracoes" />
        <form onSubmit={saveProfile} className="mt-5 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="rounded-md border border-ember/15 bg-black/25 p-4 text-center">
            <div className="mx-auto w-fit">
              <Avatar user={{ ...user, profile_image_url: preview }} size="lg" />
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-ember/30 px-3 py-2 text-sm text-ember hover:bg-ember/10">
              <Camera size={16} />
              Trocar foto
              <input className="hidden" type="file" accept="image/*" onChange={(event) => readImage(event.target.files?.[0])} />
            </label>
            {preview && (
              <button type="button" className="mt-3 inline-flex items-center gap-2 text-sm text-mist hover:text-white" onClick={removeProfileImage}>
                <X size={15} />
                Remover foto
              </button>
            )}
            {preview !== (user?.profile_image_url || '') && (
              <Button type="button" variant="ghost" className="mt-3 w-full" onClick={uploadProfileImage}>Salvar so a foto</Button>
            )}
          </div>
          <div className="space-y-4">
            <DashboardField label="Nome do usuario" value={profile.name} onChange={(name) => setProfile({ ...profile, name })} />
            <DashboardField label="Email do usuario" type="email" value={profile.email} onChange={(email) => setProfile({ ...profile, email })} />
            {profileMessage && <Alert type={profileMessage.type}>{profileMessage.text}</Alert>}
            <LoadingButton loading={profileLoading} loadingText="Salvando..." className="w-full sm:w-auto">Salvar perfil</LoadingButton>
          </div>
        </form>
      </section>

      <section className="gothic-panel rounded-md p-4 sm:p-6">
        <Header title="Trocar senha" />
        <form onSubmit={changePassword} className="mt-5 max-w-xl space-y-4">
          <DashboardField label="Senha atual" type={showPassword ? 'text' : 'password'} value={passwords.currentPassword} onChange={(currentPassword) => setPasswords({ ...passwords, currentPassword })} />
          <DashboardField label="Nova senha" type={showPassword ? 'text' : 'password'} value={passwords.newPassword} onChange={(newPassword) => setPasswords({ ...passwords, newPassword })} />
          <DashboardField label="Confirmar nova senha" type={showPassword ? 'text' : 'password'} value={passwords.confirmPassword} onChange={(confirmPassword) => setPasswords({ ...passwords, confirmPassword })} />
          <button type="button" className="inline-flex items-center gap-2 text-sm text-ember hover:text-white" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPassword ? 'Esconder senha' : 'Mostrar senha'}
          </button>
          {passwordMessage && <Alert type={passwordMessage.type}>{passwordMessage.text}</Alert>}
          <LoadingButton loading={passwordLoading} loadingText="Alterando..." className="w-full sm:w-auto">Alterar senha</LoadingButton>
        </form>
      </section>
    </div>
  );
}

const themeOptions = [
  { id: 'sombrio', name: 'Tema Principal Roxo', text: 'Preto profundo, roxo arcano e dourado discreto.', swatches: ['#05040a', '#6f43d6', '#c7a35b'] },
  { id: 'lugubre', name: 'Tema Lúgubre Clássico', text: 'Vermelho escuro, dourado antigo e preto ritual.', swatches: ['#07070a', '#8f1d2c', '#d6a65f'] },
  { id: 'daltonismo', name: 'Tema Daltonismo', text: 'Alto contraste com azul, amarelo e branco.', swatches: ['#061826', '#1f9bd1', '#ffd166'] }
];

function PersonalizationTab() {
  const { user, updateTheme } = useAuth();
  const [message, setMessage] = useState(null);
  const [loadingTheme, setLoadingTheme] = useState('');

  async function chooseTheme(theme) {
    setLoadingTheme(theme);
    setMessage(null);
    try {
      await updateTheme(theme);
      document.documentElement.dataset.theme = theme;
      setMessage({ type: 'success', text: 'Tema alterado com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Nao foi possivel alterar o tema.' });
    } finally {
      setLoadingTheme('');
    }
  }

  return (
    <section className="gothic-panel rounded-md p-4 sm:p-6">
      <Header title="Personalizacao" />
      <p className="mt-2 text-sm text-mist">Escolha um tema visual. A mudanca aparece na hora e fica salva na sua conta.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {themeOptions.map((theme) => (
          <article key={theme.id} className={`rounded-md border p-4 soft-motion ${user?.theme === theme.id ? 'border-ember/70 bg-ember/10' : 'border-ember/15 bg-black/25'}`}>
            <div className="flex gap-2">
              {theme.swatches.map((color) => <span key={color} className="h-8 w-8 rounded-full border border-white/15" style={{ backgroundColor: color }} />)}
            </div>
            <h3 className="mt-4 font-display text-2xl text-white">{theme.name}</h3>
            <p className="mt-2 text-sm text-mist">{theme.text}</p>
            <LoadingButton loading={loadingTheme === theme.id} loadingText="Aplicando..." className="mt-4 w-full" variant={user?.theme === theme.id ? 'ghost' : 'primary'} onClick={() => chooseTheme(theme.id)}>
              {user?.theme === theme.id ? 'Tema atual' : 'Usar tema'}
            </LoadingButton>
          </article>
        ))}
      </div>
      {message && <div className="mt-5"><Alert type={message.type}>{message.text}</Alert></div>}
    </section>
  );
}

function DashboardField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block text-sm text-mist">
      {label}
      <input className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-2 outline-none transition-colors focus:border-ember" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Header({ title, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
