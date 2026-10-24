import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleHelp, Crosshair, Dices, Flag, Footprints, Map as MapIcon, MapPin, Maximize2, MessageSquare, Minimize2, NotebookPen, Sparkles, Swords, Target, UserRound, X } from 'lucide-react';
import GameBars from './GameBars';
import Hotbar from './Hotbar';
import DicePanel from './DicePanel';
import { CharacterPanel, HelpPanel, MapsPanel, SkillsPanel } from './GamePanels';
import NotesPanel from '../campaigns/room/NotesPanel';
import AvatarSprite from '../avatar/AvatarSprite';
import { attackFormula, powersOf } from '../campaigns/room/rolls';
import { loadSummary } from '../../lib/load';
import './game.css';

// Modo jogo do jogador: a mesa ocupa a tela, vitais no canto, itens embaixo e um trilho de botoes
// a esquerda que abre paineis a direita (um por vez; Esc fecha). O chat vira gaveta.

const MODE_LABEL = { prep: 'Preparação', exploration: 'Exploração', combat: 'Combate' };

const fsElement = () => (typeof document !== 'undefined' ? document.fullscreenElement || document.webkitFullscreenElement : null);
export const canFullscreen = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

// Chamado no clique (o navegador so deixa entrar em tela cheia com gesto do usuario).
export function requestGameFullscreen() {
  const el = document.documentElement;
  try {
    const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' });
    p?.catch?.(() => null);
  } catch { /* sem tela cheia: fica o modo de tela inteira por CSS */ }
}
function leaveFullscreen() {
  if (!fsElement()) return;
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => null); } catch { /* nada */ }
}

const typing = (el) => el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);

export default function GameMode({
  sheet, rules, userId, campaignId, scene, myToken, isMyTurn, busy, isMaster,
  onRoll, onRollFree, onAttack, pendingDamage, onDamage, onEndTurn, onPlaceToken,
  onOpenMap, onExit, chatOpen, onToggleChat, notes, onNotesChanged, targeting
}) {
  const [panel, setPanel] = useState(null);
  const [slot, setSlot] = useState(null);
  const [isFs, setIsFs] = useState(() => Boolean(fsElement()));
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const chatRef = useRef(chatOpen);
  chatRef.current = chatOpen;

  const inventory = useMemo(() => (Array.isArray(sheet?.inventory) ? sheet.inventory : []), [sheet?.inventory]);
  const summary = useMemo(() => loadSummary(inventory, rules, userId), [inventory, rules, userId]);
  const maps = useMemo(() => [...inventory, ...inventory.flatMap((it) => it.contents || [])].filter((it) => it?.mapSceneId), [inventory]);
  const powers = powersOf(sheet);
  const mode = scene?.mode || 'prep';
  const inCombat = mode === 'combat';
  const actionUsed = inCombat && scene?.turn_state?.action_used;
  const canAct = !inCombat || (isMyTurn && !actionUsed);
  const left = inCombat && isMyTurn ? Math.max(0, (scene.movement_per_turn || 6) - (scene.turn_state?.moved || 0)) : null;

  // abrir um painel fecha o chat (e vice-versa): um por vez na direita
  const openPanel = useCallback((key) => {
    setPanel((cur) => (cur === key ? null : key));
    setSlot(null);
    if (chatRef.current) onToggleChat(false);
  }, [onToggleChat]);
  const toggleChat = useCallback(() => {
    setPanel(null);
    onToggleChat(!chatRef.current);
  }, [onToggleChat]);

  const exit = useCallback(() => { leaveFullscreen(); onExit(); }, [onExit]);

  // tela cheia de verdade: o Esc do navegador sai dela; se havia painel aberto so fecha o painel
  useEffect(() => {
    const onFs = () => {
      const now = Boolean(fsElement());
      setIsFs(now);
      if (now) return;
      if (panelRef.current || chatRef.current) { setPanel(null); onToggleChat(false); } else onExit();
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); };
  }, [onExit, onToggleChat]);
  // sair da pagina com o modo ligado: devolve a tela
  useEffect(() => () => leaveFullscreen(), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (targeting || document.querySelector('[aria-modal="true"]')) return;
        if (panelRef.current) { setPanel(null); return; }
        if (chatRef.current) { onToggleChat(false); return; }
        if (slot != null) { setSlot(null); return; }
        exit();
        return;
      }
      if (typing(e.target)) return;
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (inventory[i]) { e.preventDefault(); setSlot((cur) => (cur === i ? null : i)); }
        return;
      }
      const k = e.key.toLowerCase();
      const map = { c: 'character', p: 'skills', r: 'dice', m: 'maps', n: 'notes', h: 'help', '?': 'help' };
      if (k === 't') { e.preventDefault(); toggleChat(); return; }
      if (map[k]) { e.preventDefault(); openPanel(map[k]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inventory, slot, targeting, exit, openPanel, toggleChat, onToggleChat]);

  // item escolhido sumiu (usou, largou): limpa a selecao
  useEffect(() => { if (slot != null && !inventory[slot]) setSlot(null); }, [slot, inventory]);

  const rail = [
    ['character', 'Personagem', UserRound, 'C'],
    ['skills', 'Perícias', Target, 'P'],
    ['dice', 'Dados', Dices, 'R'],
    ['maps', 'Mapas', MapIcon, 'M'],
    ['notes', 'Notas', NotebookPen, 'N'],
    ['chat', 'Chat', MessageSquare, 'T'],
    ['help', 'Ajuda', CircleHelp, 'H']
  ];
  const TITLES = { character: 'Personagem', skills: 'Perícias', dice: 'Rolar dados', maps: 'Mapas', notes: 'Notas', help: 'Ajuda e atalhos' };

  if (!sheet) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center p-4">
        <div className="game-wood pointer-events-auto max-w-sm p-4 text-center">
          <p className="game-title text-2xl">Sem personagem na mesa</p>
          <p className="mt-1 text-sm text-[#e8c98e]">Mostre uma ficha ao mestre (aba Fichas) para jogar com seu personagem.</p>
          <button type="button" className="btn btn-lit mt-3" onClick={exit}>Sair do modo jogo</button>
        </div>
      </div>
    );
  }

  const skillReason = !canAct ? (inCombat ? (isMyTurn ? 'Você já usou sua ação neste turno.' : 'Espere o seu turno para testar perícias.') : null) : null;
  const showActions = (!myToken && scene && mode !== 'prep') || inCombat || pendingDamage || (powers.length > 0 && mode !== 'prep');

  return (
    <div className="game-mode pointer-events-none absolute inset-0 z-30 select-none" aria-label="Modo jogo">
      {/* vitais no canto de cima */}
      <div className="game-wood pointer-events-auto absolute left-2 top-2 flex w-[min(19rem,calc(100vw-6.75rem))] items-center gap-2 p-1.5 sm:left-3 sm:top-3 sm:p-2">
        <button type="button" className="game-parchment grid h-14 w-12 shrink-0 place-items-end justify-center overflow-hidden sm:h-16 sm:w-14" onClick={() => openPanel('character')} aria-label="Abrir personagem">
          {sheet.appearance ? <AvatarSprite appearance={sheet.appearance} scale={2} title={sheet.character_name} /> : <span className="game-title self-center text-3xl">{sheet.character_name?.[0]}</span>}
        </button>
        <div className="min-w-0 flex-1">
          <p className="game-title truncate text-lg leading-none sm:text-xl">{sheet.character_name}</p>
          <div className="mt-1"><GameBars sheet={sheet} compact /></div>
        </div>
      </div>

      {/* cena e saida no topo direito */}
      <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1.5 sm:right-3 sm:top-3">
        {scene && (
          <span className="game-wood hidden px-2 py-1 text-sm md:inline-block">
            <span className="text-[#f6e6c4]">{scene.name}</span> · <span className={inCombat ? 'font-bold text-[#ff8a7a]' : 'text-[#ffe2a6]'}>{MODE_LABEL[mode] || 'Preparação'}</span>
            {inCombat && <> · rodada <span className="tabular">{scene.round}</span></>}
          </span>
        )}
        {canFullscreen() && (
          <button type="button" className="game-railbtn !h-10 !w-10" onClick={() => (isFs ? leaveFullscreen() : requestGameFullscreen())} aria-label={isFs ? 'Sair da tela cheia' : 'Tela cheia'} title={isFs ? 'Sair da tela cheia' : 'Tela cheia'}>
            {isFs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}
        <button type="button" className="btn btn-glass !min-h-10 !px-3 text-sm" onClick={exit} title="Sair do modo jogo (Esc)">
          <X size={16} /> <span className="hidden sm:inline">Sair</span> <kbd className="hidden text-[10px] opacity-70 sm:inline">Esc</kbd>
        </button>
      </div>

      {/* trilho de botoes a esquerda */}
      <nav className="pointer-events-auto absolute left-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 sm:left-3 sm:gap-2" aria-label="Painéis do jogador">
        {rail.map(([key, label, Icon, kb]) => {
          const on = key === 'chat' ? chatOpen : panel === key;
          return (
            <button key={key} type="button" className="game-railbtn" aria-pressed={on} aria-label={label} onClick={() => (key === 'chat' ? toggleChat() : openPanel(key))}>
              <Icon size={20} aria-hidden="true" />
              <kbd aria-hidden="true">{kb}</kbd>
              <span className="game-tip">{label} <span className="opacity-60">({kb})</span></span>
            </button>
          );
        })}
      </nav>

      {/* painel da direita (folha de baixo no celular) */}
      {panel && (
        <section className="game-panel game-wood pointer-events-auto" aria-label={TITLES[panel]}>
          <header className="flex items-center gap-2 border-b-2 border-[#1c0e06] px-3 py-2 shadow-[0_2px_0_#a8733e33]">
            <h2 className="game-title flex-1 truncate text-2xl leading-none">{TITLES[panel]}</h2>
            <button type="button" className="grid h-8 w-8 place-items-center text-[#ffe2a6] hover:text-white" onClick={() => setPanel(null)} aria-label="Fechar painel (Esc)"><X size={18} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            {panel === 'character' && <CharacterPanel sheet={sheet} summary={summary} onOpenMap={onOpenMap} />}
            {panel === 'skills' && (
              <SkillsPanel
                sheet={sheet}
                disabled={!canAct || busy}
                reason={skillReason}
                onRollSkill={(s) => onRoll({ kind: 'skill', skill: s.key, characterId: sheet.id, label: s.name })}
              />
            )}
            {panel === 'dice' && <DicePanel sheet={sheet} onRoll={onRollFree} busy={busy} />}
            {panel === 'maps' && <MapsPanel maps={maps} onOpenMap={onOpenMap} />}
            {panel === 'notes' && <div className="-m-3 h-[60svh] sm:h-full"><NotesPanel campaignId={campaignId} notes={notes} currentUserId={userId} isMaster={isMaster} onChanged={onNotesChanged} /></div>}
            {panel === 'help' && <HelpPanel />}
          </div>
        </section>
      )}

      {/* acoes do turno (combate, poderes) logo acima da barra de itens */}
      {showActions && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[6.6rem] z-20 flex justify-center px-14 sm:bottom-[7.6rem]">
          <div className="game-wood flex max-w-full flex-wrap items-center justify-center gap-1.5 px-2 py-1.5">
            {!myToken && scene && mode !== 'prep' && (
              <button type="button" className="btn btn-lit !min-h-9 text-sm" onClick={onPlaceToken} disabled={busy}><MapPin size={15} /> Entrar no mapa</button>
            )}
            {inCombat && (
              <span className={`flex items-center gap-1.5 px-2 py-1 text-sm font-bold ${isMyTurn ? 'text-[#ffd27a]' : 'text-[#c9a979]'}`}>
                {isMyTurn ? <><Footprints size={15} /> Seu turno · <span className="tabular">{left.toFixed(1)}</span> passos · {actionUsed ? 'ação usada' : 'ação livre'}</> : 'Aguarde seu turno'}
              </span>
            )}
            {mode !== 'prep' && powers.slice(0, 6).map((p) => (
              <button
                key={`${p.type}-${p.id || p.name}`}
                type="button"
                disabled={!canAct || busy}
                onClick={() => onAttack(p, attackFormula(sheet, p))}
                className="btn btn-glass !min-h-9 !px-2.5 text-sm"
                title={`${p.name}: ${attackFormula(sheet, p)} para acertar, dano ${p.damage}${p.manaCost ? `, ${p.manaCost} de mana` : ''}`}
              >
                {p.type === 'spells' ? <Sparkles size={14} /> : <Swords size={14} />} {p.name}
              </button>
            ))}
            {pendingDamage && <button type="button" className="btn btn-lit !min-h-9 text-sm" disabled={busy} onClick={onDamage}><Crosshair size={15} /> Rolar dano ({pendingDamage.power.damage})</button>}
            {inCombat && isMyTurn && <button type="button" className="btn btn-glass !min-h-9 text-sm" onClick={onEndTurn} disabled={busy}><Flag size={14} /> Encerrar turno</button>}
          </div>
        </div>
      )}

      <Hotbar inventory={inventory} summary={summary} selected={slot} onSelect={setSlot} onOpenMap={onOpenMap} />
    </div>
  );
}
