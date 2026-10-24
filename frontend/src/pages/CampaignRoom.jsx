import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fxFromRoll, fxFromHit } from '../lib/fx/sync';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Crown, Swords, X } from 'lucide-react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import Board from '../components/vtt/Board';
import CampaignActions from '../components/campaigns/CampaignActions';
import CampaignDiaryTab from '../components/campaigns/CampaignDiaryTab';
import CampaignMembersList from '../components/campaigns/CampaignMembersList';
import CampaignShopsTab from '../components/campaigns/CampaignShopsTab';
import ActionBar from '../components/campaigns/room/ActionBar';
import ChatPanel from '../components/campaigns/room/ChatPanel';
import DiceOverlay from '../components/campaigns/room/DiceOverlay';
import GMPanel from '../components/campaigns/room/GMPanel';
import NotesPanel from '../components/campaigns/room/NotesPanel';
import SheetsPanel from '../components/campaigns/room/SheetsPanel';
import { useCampaignFeed } from '../hooks/useCampaignFeed';
import { api } from '../lib/api';
import { PICKUP_RANGE, tokenItemDistance } from '../lib/tiles/format';
import { useAuth } from '../store/authStore';

const TileMapEditor = lazy(() => import('../components/vtt/TileMapEditor'));

// Sala da campanha v2: a mesa virtual no centro, o painel lateral com chat, notas, fichas e o painel do mestre.
// O estado chega pelo feed de eventos (polling), porque a Vercel nao roda Socket.io.

const MODE_LABEL = { prep: 'Preparação', exploration: 'Exploração', combat: 'Combate' };

function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = { ...list[i], ...item };
  return next;
}

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
  const [sheet, setSheet] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [viewSceneId, setViewSceneId] = useState(null);
  const [scene, setScene] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [targeting, setTargeting] = useState(null);
  const [pendingDamage, setPendingDamage] = useState(null);
  const [pending, setPending] = useState([]);
  const [effects, setEffects] = useState({});
  const [pings, setPings] = useState([]);
  const [rollQueue, setRollQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState('');
  const [editing, setEditingState] = useState({ id: null, text: '' });
  const [editCampaign, setEditCampaign] = useState({ name: '', description: '' });
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [tileEditor, setTileEditor] = useState(null);
  const [sheetReload, setSheetReload] = useState(0);
  const fxCounter = useRef(0);
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

  // ---- carregamento ----
  const loadRoom = useCallback(async () => {
    const { data } = await api.get(`/campaigns/${id}`, { params: { light: 1 } });
    setRoom(data);
    return data;
  }, [id]);

  const loadNotes = useCallback(() => api.get(`/campaigns/${id}/notes`).then(({ data }) => setNotes(data)).catch(() => null), [id]);
  const loadNpcs = useCallback(() => api.get(`/campaigns/${id}/npcs`).then(({ data }) => setNpcs(data)).catch(() => null), [id]);

  const loadScenes = useCallback(async (keepView) => {
    const { data } = await api.get(`/campaigns/${id}/scenes`);
    setScenes(data);
    setViewSceneId((cur) => {
      if (keepView && cur && data.some((s) => s.id === cur)) return cur;
      return (data.find((s) => s.is_active) || data[0])?.id || null;
    });
    return data;
  }, [id]);

  const loadScene = useCallback(async (sceneId) => {
    if (!sceneId) { setScene(null); setTokens([]); return; }
    const [s, t] = await Promise.all([
      api.get(`/campaigns/${id}/scenes/${sceneId}`),
      api.get(`/campaigns/${id}/scenes/${sceneId}/tokens`)
    ]);
    setScene(s.data);
    setTokens(t.data);
  }, [id]);

  const loadSheet = useCallback(async (member) => {
    if (!member?.shared_character_id) { setSheet(null); return; }
    const { data } = await api.get(`/campaigns/${id}/characters/${member.shared_character_id}`).catch(() => ({ data: null }));
    setSheet(data);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadRoom();
        if (cancelled) return;
        setEditCampaign({ name: data.campaign?.name || '', description: data.campaign?.description || '' });
        const me = data.members?.find((m) => m.user_id === user?.id);
        await Promise.all([
          api.get(`/campaigns/${id}/messages`).then(({ data: m }) => !cancelled && setMessages(m)),
          api.get('/characters').then(({ data: c }) => !cancelled && setMyCharacters(Array.isArray(c) ? c : [])).catch(() => null),
          loadNotes(),
          loadScenes(false),
          loadSheet(me),
          data.isMaster ? loadNpcs() : null
        ]);
      } catch (err) {
        if (!cancelled) setError(err.response?.status === 404 ? 'Campanha não encontrada.' : err.response?.data?.message || 'Não foi possível abrir a campanha.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, user?.id, loadRoom, loadNotes, loadScenes, loadSheet, loadNpcs]);

  useEffect(() => { loadScene(viewSceneId).catch(() => null); }, [viewSceneId, loadScene]);

  // ---- feed de eventos ----
  const showHit = useCallback((p) => {
    const n = ++fxCounter.current;
    const label = p.outcome === 'miss' ? 'Errou' : p.outcome === 'heal' ? 'Curado' : p.down ? 'Caído!' : 'Tomou dano!';
    setEffects((cur) => ({ ...cur, [p.tokenId]: { n, hit: p.outcome === 'hit', label, down: p.down } }));
    setTimeout(() => setEffects((cur) => (cur[p.tokenId]?.n === n ? { ...cur, [p.tokenId]: { ...cur[p.tokenId], label: null, hit: false } } : cur)), 2600);
  }, []);

  const stateRef = useRef({});
  stateRef.current = { isMaster, viewSceneId, myMember, sheet, sceneIds: scenes.map((s) => s.id), tokens, cell: scene?.grid_size || 70 };
  // Animacoes de golpe/magia (lib/fx): o evento roll toca o ataque, o token:hit do mestre
  // toca o impacto; a semente e o rollId, entao todos veem as mesmas particulas.
  const fxRef = useRef(null);
  const fxAttacks = useRef(new Map());

  const applyEvents = useCallback((events) => {
    const { isMaster: master, viewSceneId: sid, myMember: me, sheet: mySheet, sceneIds } = stateRef.current;
    const reload = { room: false, notes: false, scenes: false, scene: false, sheet: false };
    events.forEach((ev) => {
      const p = ev.payload || {};
      if (master && p.view === 'player') return;
      switch (ev.type) {
        case 'message:created': setMessages((cur) => (cur.some((m) => m.id === p.message.id) ? cur : [...cur, p.message])); break;
        case 'message:updated': setMessages((cur) => cur.map((m) => (m.id === p.message.id ? p.message : m))); break;
        case 'message:deleted': setMessages((cur) => cur.filter((m) => m.id !== p.messageId)); break;
        case 'members:changed': case 'character:shared': reload.room = true; break;
        case 'character:updated':
          if (mySheet && p.characterId === mySheet.id) reload.sheet = true;
          setSheetReload((n) => n + 1);
          break;
        case 'notes:changed': reload.notes = true; break;
        case 'scene:activated': case 'scene:deleted': reload.scenes = true; break;
        case 'scene:updated':
          if (p.scene?.id && !sceneIds.includes(p.scene.id)) reload.scenes = true;
          if (p.scene?.id === sid) {
            if (p.map_changed) reload.scene = true;
            else if (p.items) setScene((cur) => (cur?.tiles ? { ...cur, tiles: { ...cur.tiles, items: p.items } } : cur));
            else setScene((cur) => (cur ? { ...cur, ...p.scene } : cur));
          }
          setScenes((cur) => cur.map((s) => (s.id === p.scene?.id ? { ...s, ...p.scene } : s)));
          break;
        case 'initiative': case 'combat':
          if (p.sceneId === sid) setScene((cur) => (cur ? { ...cur, ...p } : cur));
          break;
        case 'token:moved':
          if (p.sceneId === sid) setTokens((cur) => cur.map((t) => (t.id === p.tokenId ? { ...t, x: p.x, y: p.y } : t)));
          break;
        case 'token:updated':
          if (p.removed) setTokens((cur) => cur.filter((t) => t.id !== p.tokenId));
          else if (p.token?.scene_id === sid) setTokens((cur) => upsert(cur, p.token));
          break;
        case 'token:removed': setTokens((cur) => cur.filter((t) => t.id !== p.tokenId)); break;
        case 'token:hit':
          if (p.view === 'owner') {
            if (mySheet) setSheet((s) => ({ ...s, life_current: p.life_current }));
            break;
          }
          if (p.sceneId === sid) {
            showHit(p);
            {
              const { tokens: toks, cell: c } = stateRef.current;
              const imp = fxFromHit(p, { tokens: toks, cell: c, attack: fxAttacks.current.get(p.rollId) });
              if (imp) fxRef.current?.impact(imp);
            }
            setTokens((cur) => cur.map((t) => (t.id === p.tokenId ? { ...t, down: p.down, ...(p.hp_current != null ? { hp_current: p.hp_current } : {}) } : t)));
          }
          break;
        case 'roll':
          setRollQueue((q) => [...q, p]);
          if (p.kind === 'attack' && p.targetTokenId) {
            const { tokens: toks, cell: c } = stateRef.current;
            const atk = fxFromRoll(p, { tokens: toks, cell: c, powers: [...(mySheet?.attacks || []), ...(mySheet?.spells || [])] });
            if (atk) {
              fxAttacks.current.set(p.rollId, atk);
              if (fxAttacks.current.size > 20) fxAttacks.current.delete(fxAttacks.current.keys().next().value);
              if (atk.phase === 'full') fxRef.current?.play(atk); else fxRef.current?.attack(atk);
            }
          }
          if (p.messageId && !p.secret) {
            setMessages((cur) => (cur.some((m) => m.id === p.messageId) ? cur : [...cur, { id: p.messageId, message_type: 'roll', meta: p, user_id: p.userId, user_name: p.userName, color: p.color, created_at: p.created_at }]));
          }
          if (master && p.targetTokenId && (p.kind === 'attack' || p.kind === 'damage')) {
            setPending((cur) => {
              const rest = p.kind === 'damage' ? cur.filter((x) => !(x.targetTokenId === p.targetTokenId && x.userId === p.userId)) : cur;
              return rest.some((x) => x.rollId === p.rollId) ? rest : [...rest, p];
            });
          }
          break;
        case 'ping':
          if (p.sceneId === sid) {
            const pid = `${ev.id}`;
            setPings((cur) => [...cur, { ...p, id: pid }]);
            setTimeout(() => setPings((cur) => cur.filter((x) => x.id !== pid)), 2200);
          }
          break;
        default: break;
      }
    });
    if (reload.room) loadRoom().then((data) => loadSheet(data.members?.find((m) => m.user_id === me?.user_id))).catch(() => null);
    if (reload.notes) loadNotes();
    if (reload.scenes) loadScenes(true).catch(() => null);
    if (reload.scene) loadScene(sid).catch(() => null);
    if (reload.sheet && !reload.room) loadSheet(me);
  }, [loadRoom, loadNotes, loadScenes, loadScene, loadSheet, showHit]);

  useCampaignFeed(id, applyEvents, { enabled: Boolean(room) });

  // ---- mesa ----
  const turnTokenId = scene?.mode === 'combat' ? (scene.turn_state?.tokenId || scene.current_token_id || scene.initiative?.[scene.turn_index]?.tokenId) : null;
  const myToken = tokens.find((t) => t.kind === 'character' && sheet && t.character_id === sheet.id);
  const isMyTurn = Boolean(myToken && turnTokenId === myToken.id);

  const canMove = useCallback((t) => {
    if (isMaster) return true;
    const mine = t.owner_id === user?.id || t.controlled_by === user?.id || (sheet && t.character_id === sheet.id);
    if (!mine) return false;
    if (scene?.mode === 'exploration') return true;
    return scene?.mode === 'combat' && t.id === turnTokenId;
  }, [isMaster, user?.id, sheet, scene?.mode, turnTokenId]);

  const budget = useCallback((t, pos) => {
    if (isMaster || scene?.mode !== 'combat') return true;
    const cell = scene.grid_size || 70;
    const dist = Math.hypot(pos.x - t.x, pos.y - t.y) / cell;
    return (scene.turn_state?.moved || 0) + dist <= (scene.movement_per_turn || 6) + 0.25;
  }, [isMaster, scene]);

  // Mesmas regras do servidor, so para explicar no botao por que nao da para pegar.
  const pickupBlock = useCallback((item) => {
    if (!scene || scene.mode === 'prep') return 'A mesa está em preparação.';
    if (!myToken) return 'Coloque seu personagem no mapa primeiro.';
    if (scene.mode === 'combat') {
      if (!isMyTurn) return 'Não é o seu turno.';
      if (scene.turn_state?.action_used) return 'Você já usou sua ação neste turno.';
    }
    if (tokenItemDistance(myToken, item, scene.grid_size || 70) > PICKUP_RANGE) return 'Chegue mais perto para pegar.';
    return null;
  }, [scene, myToken, isMyTurn]);

  const pickup = useCallback(async (item, characterId) => {
    try {
      const { data } = await api.post(`/campaigns/${id}/scenes/${scene.id}/pickup`, { itemId: item.id, ...(characterId ? { characterId } : {}) });
      // some na hora para quem pegou; o evento scene:updated confirma para todos
      setScene((cur) => (cur?.tiles ? { ...cur, tiles: { ...cur.tiles, items: (cur.tiles.items || []).filter((it) => it.id !== item.id) } } : cur));
      notify(data.received?.kind === 'dracmas' ? `+${data.received.dracmas} dracmas na bolsa.` : `${item.name} foi para o inventário.`);
      setSheetReload((n) => n + 1);
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para pegar.', 'error');
      loadScene(stateRef.current.viewSceneId).catch(() => null);
    }
  }, [id, scene?.id, notify, loadScene]);

  const moveToken = useCallback(async (t, x, y) => {
    try {
      await api.patch(`/campaigns/${id}/tokens/${t.id}`, { x: Math.round(x), y: Math.round(y) });
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para mover.', 'error');
      loadScene(stateRef.current.viewSceneId).catch(() => null);
    }
  }, [id, notify, loadScene]);

  const ping = useCallback((x, y) => {
    if (!scene) return;
    api.post(`/campaigns/${id}/ping`, { x: Math.round(x), y: Math.round(y), sceneId: scene.id }).catch(() => null);
  }, [id, scene]);

  useEffect(() => {
    if (!targeting) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setTargeting(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [targeting]);

  async function roll(body) {
    setBusy(true);
    try {
      const { data } = await api.post(`/campaigns/${id}/rolls`, body);
      return data;
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para rolar agora.', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function attackTarget(target) {
    const { power, formula } = targeting;
    setTargeting(null);
    const cost = Number(power.manaCost || 0);
    const mana = Number(sheet?.mana_current ?? sheet?.mana ?? 0);
    if (power.type === 'spells' && cost > mana) { notify(`Mana insuficiente para ${power.name} (precisa de ${cost}).`, 'error'); return; }
    const r = await roll({ kind: 'attack', formula, label: power.name, characterId: sheet.id, powerName: power.name, targetTokenId: target.id });
    if (!r) return;
    if (power.type === 'spells' && cost > 0) {
      api.patch(`/campaigns/${id}/characters/${sheet.id}/vitals`, { mana_current: mana - cost }).then(({ data }) => setSheet((s) => ({ ...s, ...data, mana: data.mana_current }))).catch(() => null);
    }
    const crit = r.dice?.[0]?.sides === 20 && r.dice[0].value >= Number(power.criticalValue || 20);
    setPendingDamage({ power, target, crit });
  }

  async function rollDamage() {
    const { power, target, crit } = pendingDamage;
    setPendingDamage(null);
    await roll({ kind: 'damage', formula: power.damage, label: `Dano: ${power.name}${crit ? ` (crítico ×${power.criticalMultiplier || 2})` : ''}`, characterId: sheet.id, powerName: power.name, targetTokenId: target.id });
  }

  async function resolve(p, outcome, amount) {
    setBusy(true);
    try {
      await api.post(`/campaigns/${id}/tokens/${p.targetTokenId}/hit`, { amount: Math.max(0, amount || 0), outcome, ...(p.rollId ? { rollId: p.rollId } : {}) });
      setPending((cur) => cur.filter((x) => !(x.targetTokenId === p.targetTokenId && (!p.userId || x.userId === p.userId))));
    } catch (err) {
      notify(err.response?.data?.message || 'Não deu para aplicar.', 'error');
    } finally {
      setBusy(false);
    }
  }

  // ---- chat, grupo ----
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
      const fresh = await loadRoom();
      await loadSheet(fresh.members?.find((m) => m.user_id === user?.id));
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

  async function placeMyToken() {
    const c = scene.grid_size || 70;
    try {
      await api.post(`/campaigns/${id}/scenes/${scene.id}/tokens`, { kind: 'character', x: c * 2, y: c * 2 });
      loadScene(scene.id);
    } catch (err) { notify(err.response?.data?.message || 'Não deu para entrar no mapa.', 'error'); }
  }

  const tabs = useMemo(() => [
    ['chat', 'Chat'],
    ['notes', 'Notas'],
    ['sheets', 'Fichas'],
    isMaster && ['gm', 'Mestre'],
    ['diary', 'Diário'],
    ['shops', 'Loja'],
    ['group', 'Grupo']
  ].filter(Boolean), [isMaster]);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-10"><Alert type="error">{error}</Alert><Button className="mt-4" onClick={() => navigate('/campaigns')}>Voltar às campanhas</Button></main>;
  if (!room) return <main className="grid min-h-[60vh] place-items-center text-mist" aria-label="Abrindo a campanha">Abrindo a mesa…</main>;

  const order = (scene?.initiative || []).map((e) => ({ ...e, token: tokens.find((t) => t.id === e.tokenId) })).filter((e) => e.token);
  const currentRoll = rollQueue[0];

  return (
    <main className="campaign-room flex flex-col lg:h-[calc(100svh-4.3rem)]">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[4px] border-lead bg-abyss px-3 py-2">
        <h1 className="min-w-0 truncate font-display text-2xl leading-none text-bone sm:text-3xl">{room.campaign.name}</h1>
        {scene && (
          <span className="border-[3px] border-lead bg-black/40 px-2 py-0.5 text-sm text-mist">
            {scene.name} · <span className={scene.mode === 'combat' ? 'font-bold text-[#e0566e]' : 'text-bone'}>{MODE_LABEL[scene.mode] || 'Preparação'}</span>
            {scene.mode === 'combat' && <> · rodada <span className="tabular">{scene.round}</span></>}
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-mist">{isMaster ? <><Crown size={14} className="text-ember" /> Você é o mestre</> : 'Você é jogador'}</span>
        {isMaster && room.campaign.invite_code && (
          <button type="button" className="ml-auto flex items-center gap-1 text-sm text-mist hover:text-bone" onClick={() => navigator.clipboard?.writeText(room.campaign.invite_code).then(() => notify('Código de convite copiado.'))}>
            Convite <span className="font-bold tracking-wider text-ember">{room.campaign.invite_code}</span> <Copy size={13} />
          </button>
        )}
      </header>

      {notice && (
        <div role="status" className={`fixed left-1/2 top-20 z-[60] -translate-x-1/2 border-[3px] border-lead px-4 py-2 shadow-2xl ${notice.type === 'error' ? 'bg-[#2a0b12] text-red-100' : 'lit'}`}>{notice.text}</div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative flex min-h-[46svh] min-w-0 flex-1 flex-col lg:min-h-0" aria-label="Mesa virtual">
          {scene?.mode === 'combat' && order.length > 0 && (
            <ol className="flex gap-1 overflow-x-auto border-b-[3px] border-lead bg-black/60 px-2 py-1.5" aria-label="Ordem de iniciativa">
              {order.map((e, i) => (
                <li key={e.tokenId} className={`flex shrink-0 items-center gap-1.5 border-2 border-lead px-2 py-1 text-sm ${e.tokenId === turnTokenId ? 'lit font-bold' : 'text-mist'}`}>
                  <Swords size={12} className={e.tokenId === turnTokenId ? '' : 'opacity-0'} />
                  <span className="tabular text-xs opacity-70">{i + 1}</span> {e.token.name}
                  {isMaster && <span className="tabular text-xs opacity-60">({e.value})</span>}
                </li>
              ))}
            </ol>
          )}
          <div className="relative min-h-0 flex-1">
            {scene ? (
              <Board
                scene={scene}
                tokens={tokens}
                isMaster={isMaster}
                canMove={canMove}
                selectedId={selectedId || (!isMaster ? myToken?.id : null)}
                onSelect={setSelectedId}
                onMove={moveToken}
                targeting={Boolean(targeting)}
                onTarget={attackTarget}
                activeTokenId={turnTokenId}
                effects={effects}
                pings={pings}
                onPing={ping}
                budget={budget}
                myTokenId={myToken?.id}
                onPickup={pickup}
                pickupBlock={pickupBlock}
                fxRef={fxRef}
              />
            ) : (
              <div className="grid h-full min-h-[50svh] place-items-center bg-[#050407] p-6 text-center">
                <div>
                  <p className="font-display text-3xl text-bone">{isMaster ? 'A mesa está vazia.' : 'O mestre ainda não abriu a mesa.'}</p>
                  <p className="mt-2 text-mist">{isMaster ? 'Crie uma cena no painel do Mestre: mapa do PC, pixel art ou gerado por IA.' : 'Enquanto isso, converse no chat e prepare sua ficha.'}</p>
                  {isMaster && <Button className="mt-4" onClick={() => setTab('gm')}>Abrir painel do Mestre</Button>}
                </div>
              </div>
            )}
            {currentRoll && <DiceOverlay key={currentRoll.rollId} roll={currentRoll} onDone={() => setRollQueue((q) => q.slice(1))} />}
            {targeting && (
              <button type="button" className="btn btn-glass absolute left-3 top-3 z-10 !min-h-10 text-sm" onClick={() => setTargeting(null)}><X size={15} /> Cancelar alvo</button>
            )}
          </div>
          {!isMaster && (
            <ActionBar
              sheet={sheet}
              myToken={myToken}
              scene={scene}
              isMyTurn={isMyTurn}
              turnState={scene?.turn_state}
              busy={busy}
              onRoll={roll}
              onAttack={(power, formula) => setTargeting({ power, formula })}
              pendingDamage={pendingDamage}
              onDamage={rollDamage}
              onEndTurn={() => api.post(`/campaigns/${id}/scenes/${scene.id}/combat/end-turn`).catch((err) => notify(err.response?.data?.message || 'Não deu.', 'error'))}
              onPlaceToken={placeMyToken}
            />
          )}
        </section>

        <aside className="flex min-h-[70svh] w-full flex-col border-t-[4px] border-lead bg-abyss lg:min-h-0 lg:w-[400px] lg:border-l-[4px] lg:border-t-0 xl:w-[430px]" aria-label="Painel da campanha">
          <nav className="flex overflow-x-auto border-b-[3px] border-lead" aria-label="Seções da campanha">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`relative shrink-0 px-3 py-3 text-sm font-bold ${tab === key ? 'lit' : 'text-mist hover:text-bone'}`}>
                {label}
                {key === 'gm' && pending.length > 0 && <span className="ml-1 inline-grid h-5 min-w-5 place-items-center bg-[#a3182f] px-1 text-xs text-white tabular">{pending.length}</span>}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1">
            {tab === 'chat' && (
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
            )}
            {tab === 'notes' && <NotesPanel campaignId={id} notes={notes} currentUserId={user?.id} isMaster={isMaster} onChanged={loadNotes} />}
            {tab === 'sheets' && <SheetsPanel campaignId={id} members={room.members || []} myCharacters={myCharacters} myMember={myMember} isMaster={isMaster} onShare={share} sharing={sharing} reloadKey={sheetReload} />}
            {tab === 'gm' && isMaster && (
              <GMPanel
                campaignId={id}
                scenes={scenes}
                scene={scene}
                viewSceneId={viewSceneId}
                onViewScene={setViewSceneId}
                tokens={tokens}
                members={room.members || []}
                npcs={npcs}
                pending={pending}
                onResolve={resolve}
                onDismiss={(p) => setPending((cur) => cur.filter((x) => x.rollId !== p.rollId))}
                onChanged={() => { loadScenes(true).catch(() => null); loadScene(stateRef.current.viewSceneId).catch(() => null); loadNpcs(); }}
                onOpenTileEditor={setTileEditor}
                notify={notify}
              />
            )}
            {tab === 'diary' && <div className="h-full overflow-y-auto p-3"><CampaignDiaryTab campaignId={id} isMaster={isMaster} currentUserId={user?.id} /></div>}
            {tab === 'shops' && <div className="h-full overflow-y-auto p-3"><CampaignShopsTab campaignId={id} isMaster={isMaster} characters={myCharacters} /></div>}
            {tab === 'group' && (
              <div className="h-full space-y-6 overflow-y-auto p-3">
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
        </aside>
      </div>

      {tileEditor && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-abyss" role="dialog" aria-modal="true" aria-label="Editor de mapa em pixel art">
          <Suspense fallback={<p className="p-6 text-mist">Abrindo o editor…</p>}>
            <TileMapEditor
              initialMap={tileEditor.map_kind === 'tiles' ? tileEditor.tiles : null}
              onCancel={() => setTileEditor(null)}
              onSave={async (map, meta) => {
                const cell = tileEditor.grid_size || 70;
                try {
                  await api.patch(`/campaigns/${id}/scenes/${tileEditor.id}`, { map_kind: 'tiles', tiles: map, width: map.cols * cell, height: map.rows * cell, ...(meta?.name && /^Cena \d+$/.test(tileEditor.name) ? { name: meta.name } : {}) });
                  setTileEditor(null);
                  notify('Mapa salvo.');
                  loadScene(stateRef.current.viewSceneId).catch(() => null);
                } catch (err) { notify(err.response?.data?.message || 'Não deu para salvar o mapa.', 'error'); }
              }}
            />
          </Suspense>
        </div>
      )}
    </main>
  );
}
