import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, DoorOpen, Eye, EyeOff, Footprints, Hand, Lock, LockOpen, LocateFixed, Minus, MousePointer2, Plus, X } from 'lucide-react';
import TileMapCanvas from './TileMapCanvas';
import Crack from '../glass/Crack';
import { buildingAt, isSolid, PICKUP_RANGE, tokenBuilding, tokenItemDistance } from '../../lib/tiles/format';
import { detectBuildings } from '../../lib/tiles/compose';
import { buildingPixels, doorCell, MATERIALS, ROOF_STYLE_OPTIONS, DESIGN_BY_ID, FACINGS } from '../../lib/buildings';
import { getTile } from '../../lib/tiles/catalog';
import { chunkLayout, pickLod } from '../../lib/tiles/chunks';
import AvatarSprite from '../avatar/AvatarSprite';
import FxLayer from '../fx/FxLayer';
import ItemIcon from '../icons/ItemIcon';
import ContainerContents from './ContainerContents';
import MonsterSprite from '../monsters/MonsterSprite';
import { monsterLook } from '../../lib/monsters/classify';
import { skyAt, clockLabel, phaseAt, resolveLight } from '../../lib/tiles/daylight';
import { padMap, PAD } from '../../lib/tiles/outside';
import { Moon, Sun } from 'lucide-react';

// Construcao 3D (estilo Stardew): fachada + telhado em perspectiva, desenhada uma vez no tamanho
// nativo (16 px/celula) e ampliada nitida pelo CSS. z-index pela linha de baixo da pegada:
// token atras (ao norte) fica escondido pela casa, token na frente passa por cima.
// Pixels das casas guardados fora do componente (mapa grande: a casa sai e volta da vista ao
// andar e nao precisa ser redesenhada). LRU pequeno: o resto refaz quando voltar.
const HOUSE_CACHE = new Map();
const HOUSE_CACHE_MAX = 400;
function housePixels(building, tiles, light) {
  let byTiles = HOUSE_CACHE.get(building);
  const hit = byTiles && byTiles.tiles === tiles && byTiles.light === light ? byTiles.img : null;
  if (hit) { HOUSE_CACHE.delete(building); HOUSE_CACHE.set(building, byTiles); return hit; }
  const img = buildingPixels(building, tiles, { light });
  HOUSE_CACHE.delete(building);
  HOUSE_CACHE.set(building, { tiles, light, img });
  if (HOUSE_CACHE.size > HOUSE_CACHE_MAX) HOUSE_CACHE.delete(HOUSE_CACHE.keys().next().value);
  return img;
}

function peekHouse(building, tiles, light) {
  const e = HOUSE_CACHE.get(building);
  return e && e.tiles === tiles && e.light === light ? e.img : null;
}
// Fila de casas a desenhar: no maximo ~10 ms por vez (mapa grande: centenas de casas entram na
// vista de uma vez ao aproximar; sem fila a tela travava quase 1 s).
const houseQueue = [];
let houseTimer = 0;
function pumpHouses() {
  houseTimer = 0;
  const t = performance.now();
  while (houseQueue.length && performance.now() - t < 10) houseQueue.shift()();
  if (houseQueue.length) houseTimer = setTimeout(pumpHouses, 0);
}
function requestHouse(job) {
  houseQueue.push(job);
  if (!houseTimer) houseTimer = setTimeout(pumpHouses, 0);
  return () => { const i = houseQueue.indexOf(job); if (i >= 0) houseQueue.splice(i, 1); };
}

function House({ building, tiles, light, open, cell, lazy = false }) {
  const ref = useRef(null);
  const [lazyImg, setLazyImg] = useState(() => (lazy ? peekHouse(building, tiles, light) : null));
  const eager = useMemo(() => (lazy ? null : housePixels(building, tiles, light)), [lazy, building, tiles, light]);
  useEffect(() => {
    if (!lazy) return undefined;
    const hit = peekHouse(building, tiles, light);
    if (hit) { setLazyImg(hit); return undefined; }
    return requestHouse(() => setLazyImg(housePixels(building, tiles, light)));
  }, [lazy, building, tiles, light]);
  const img = lazy ? lazyImg : eager;
  useEffect(() => {
    const c = ref.current;
    if (!c || !img) return;
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  }, [img]);
  const k = cell / 16;
  if (!img) return null;
  return (
    <div
      className={`vtt-house ${open ? 'is-open' : ''}`}
      style={{ left: building.x * cell + (img.offsetX || 0) * k, top: building.y * cell + img.offsetY * k, width: img.width * k, height: img.height * k, zIndex: 10 + (building.y + building.h) * 2 }}
      aria-label={`${building.name || 'Construção'}${building.locked ? ' (trancada)' : ''}`}
    >
      <canvas ref={ref} aria-hidden="true" />
    </div>
  );
}

// Mesa virtual: mapa (imagem ou pixel art), grade, tokens, neblina, pings e efeitos de acerto.
// Movimento: arrastar ou WASD/setas na velocidade que o mestre escolheu; em combate o servidor confere o limite.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Fora do mapa: nevoa leve que engrossa longe da borda (a continuacao em si e o padMap).
function EdgeMist({ cell, width, height }) {
  const pad = PAD * cell;
  const fade = 'rgba(10,12,14,.5)';
  const side = (style) => <div className="pointer-events-none absolute" style={style} aria-hidden="true" />;
  return (
    <>
      {side({ left: -pad, top: -pad, width: width + pad * 2, height: pad, background: `linear-gradient(to top, transparent 40%, ${fade})` })}
      {side({ left: -pad, top: height, width: width + pad * 2, height: pad, background: `linear-gradient(to bottom, transparent 40%, ${fade})` })}
      {side({ left: -pad, top: 0, width: pad, height, background: `linear-gradient(to left, transparent 40%, ${fade})` })}
      {side({ left: width, top: 0, width: pad, height, background: `linear-gradient(to right, transparent 40%, ${fade})` })}
    </>
  );
}

// Visao do jogador: escurece tudo fora de um circulo em volta do proprio personagem. Posicao
// lida a cada quadro (o token anda sem re-render); raio em celulas do mapa.
function VisionMask({ tokenRef, view, cell, radius }) {
  const el = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const posRef = useRef(tokenRef);
  posRef.current = tokenRef;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = posRef.current();
      const v = viewRef.current;
      if (!el.current || !t) return;
      const half = ((t.size || 1) * cell) / 2;
      const x = v.x + (t.x + half) * v.z; const y = v.y + (t.y + half) * v.z;
      const r = radius * cell * v.z;
      el.current.style.background = `radial-gradient(circle at ${x}px ${y}px, transparent ${r * 0.72}px, rgba(4,3,8,.82) ${r}px, rgba(4,3,8,.97) ${r * 1.25}px)`;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [cell, radius]);
  return <div ref={el} className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true" />;
}

export default function Board({
  scene,
  tokens,
  isMaster,
  canMove,
  selectedId,
  onSelect,
  onMove,
  targeting,
  onTarget,
  activeTokenId,
  effects = {},
  pings = [],
  onPing,
  gmCursor,
  onCursor,
  showCursor,
  onToggleCursor,
  budget,
  myTokenId,
  onPickup,
  pickupBlock,
  fxRef,
  onEnterBuilding,
  onExitScene,
  onPatchBuilding,
  onCreateInterior,
  onViewScene,
  onPatchItem,
  rights,
  clock,
  onClockChange,
  visionCells = null,
  speedFactor = 1
}) {
  const cell = scene?.grid_size || 70;
  const isTiles = scene?.map_kind === 'tiles' && scene?.tiles;
  const width = isTiles ? scene.tiles.cols * cell : scene?.width || cell * 24;
  const height = isTiles ? scene.tiles.rows * cell : scene?.height || cell * 16;
  const viewportRef = useRef(null);
  // luz da cena: com o relogio do mestre ligado, as cenas de fora seguem a hora (interior nao)
  const sceneLight = isTiles && clock?.on && !scene?.parent_scene_id ? skyAt(clock.minutes) : (scene?.tiles?.light || 'dia');
  const litTiles = useMemo(() => (isTiles && scene.tiles.light !== sceneLight ? { ...scene.tiles, light: sceneLight } : scene?.tiles), [isTiles, scene?.tiles, sceneLight]);
  // margem so depende do mapa (luz troca sem refazer a margem)
  const paddedBase = useMemo(() => (isTiles ? padMap(scene.tiles) : null), [isTiles, scene?.tiles]);
  const paddedTiles = useMemo(() => (paddedBase && paddedBase.light !== sceneLight ? { ...paddedBase, light: sceneLight } : paddedBase), [paddedBase, sceneLight]);
  const shakeRef = useRef(null);
  const tokenEls = useRef({});
  // Animacoes (lib/fx): tremida do mapa e empurrao/piscada dos tokens direto no estilo,
  // sem setState a 60 fps.
  const onFxFrame = useCallback(({ shake, tokens: moves }) => {
    if (shakeRef.current) shakeRef.current.style.transform = shake && (shake.x || shake.y) ? `translate(${shake.x}px, ${shake.y}px)` : '';
    for (const [id, el] of Object.entries(tokenEls.current)) {
      if (!el) continue;
      const m = moves?.[id];
      el.style.translate = m && (m.x || m.y) ? `${m.x}px ${m.y}px` : '';
      el.style.filter = m && m.flash > 0.5 ? 'brightness(3) saturate(0)' : '';
    }
  }, []);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  // tamanho da area da mesa (para saber o que aparece: mapa grande desenha so a vista)
  const [vsize, setVsize] = useState({ w: 1200, h: 800 });
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const read = () => setVsize((cur) => (cur.w === el.clientWidth && cur.h === el.clientHeight ? cur : { w: el.clientWidth, h: el.clientHeight }));
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // zoom minimo: mapa enorme (1000x1000) precisa caber inteiro na tela
  const minZoom = Math.min(0.15, Math.min(vsize.w / width, vsize.h / height) * 0.9);
  const [local, setLocal] = useState({});
  const localRef = useRef(local);
  localRef.current = local;
  const drag = useRef(null);
  const keys = useRef(new Set());
  const sendTimer = useRef({});

  const tokenPos = useCallback((t) => localRef.current[t.id] || { x: t.x, y: t.y }, []);

  // ---- modo jogo (parte 3): boneco animado, camera seguindo o jogador ----
  // Direcao e "andando" de cada token saem da diferenca entre a posicao nova e a anterior
  // (vale para o proprio WASD e para o que chega do servidor dos outros jogadores).
  const [motion, setMotion] = useState({});
  const prevPos = useRef({});
  const stopTimers = useRef({});
  const appearanceCache = useRef({});
  useEffect(() => {
    const next = {};
    for (const t of tokens) {
      if (t.appearance) appearanceCache.current[t.character_id || t.id] = t.appearance;
      const pos = local[t.id] || { x: t.x, y: t.y };
      const prev = prevPos.current[t.id];
      prevPos.current[t.id] = pos;
      if (!prev) continue;
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      next[t.id] = { dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up', moving: true };
      clearTimeout(stopTimers.current[t.id]);
      stopTimers.current[t.id] = setTimeout(() => setMotion((cur) => (cur[t.id] ? { ...cur, [t.id]: { ...cur[t.id], moving: false } } : cur)), 220);
    }
    if (Object.keys(next).length) setMotion((cur) => ({ ...cur, ...next }));
  }, [tokens, local]);
  useEffect(() => () => Object.values(stopTimers.current).forEach(clearTimeout), []);

  // Jogador com personagem no mapa de blocos: camera perto e seguindo; o mestre fica com a visao geral.
  const canFollow = Boolean(isTiles && !isMaster && myTokenId && tokens.some((t) => t.id === myTokenId));
  const [follow, setFollow] = useState(true);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  // ---- itens pegaveis e telhados ----
  const items = useMemo(() => (isTiles ? scene.tiles.items || [] : []), [isTiles, scene?.tiles]);
  // Telhado automatico (plano de arte): sala fechada com porta ganha telhado mesmo quando o
  // mapa (IA ou a mao) nao declarou "buildings". Deterministico: igual para todos.
  const buildings = useMemo(() => {
    if (!isTiles) return [];
    if (scene.tiles.buildings?.length) return scene.tiles.buildings;
    // interior: as paredes sao a borda do mapa, nao e uma casa para cobrir com telhado
    if (scene.parent_scene_id) return [];
    return detectBuildings(scene.tiles);
  }, [isTiles, scene?.tiles, scene?.parent_scene_id]);
  const tilesWithRoofs = useMemo(() => (isTiles ? { ...scene.tiles, buildings } : null), [isTiles, scene?.tiles, buildings]);
  const [roofToggle, setRoofToggle] = useState({}); // escolha local de cada pessoa (id -> aberto?)
  const [interiors, setInteriors] = useState(false); // mestre: "ver interiores"
  const [popover, setPopover] = useState(null); // celula {x, y} com itens
  const [hover, setHover] = useState(null);
  useEffect(() => { setRoofToggle({}); setPopover(null); setHover(null); }, [scene?.id]);

  // Interior abre sozinho quando o token da pessoa esta dentro (posicao local, ja enquanto anda).
  const myToken = tokens.find((t) => t.id === myTokenId);
  const myPos = myToken && (local[myToken.id] || { x: myToken.x, y: myToken.y });
  const myBuildingId = isTiles && myPos ? tokenBuilding(tilesWithRoofs, { ...myToken, ...myPos }, cell)?.id : null;
  const roofOpen = useCallback((b) => (b.interior ? false : roofToggle[b.id] ?? (b.id === myBuildingId || (isMaster && interiors))), [roofToggle, myBuildingId, isMaster, interiors]);
  const [housePop, setHousePop] = useState(null); // mestre: construcao clicada (painel)
  const isInterior = Boolean(isTiles && scene?.parent_scene_id);
  const toggleRoof = useCallback((b) => setRoofToggle((cur) => ({ ...cur, [b.id]: !roofOpen(b) })), [roofOpen]);
  const underRoof = useCallback((x, y) => {
    const b = isTiles ? buildingAt(tilesWithRoofs, x, y) : null;
    return Boolean(b && !roofOpen(b));
  }, [isTiles, scene?.tiles, roofOpen]);
  const visibleItems = useMemo(() => items.filter((it) => !underRoof(it.x, it.y)), [items, underRoof]);
  const itemsAt = useCallback((x, y) => visibleItems.filter((it) => it.x === x && it.y === y), [visibleItems]);
  useEffect(() => { if (popover && !itemsAt(popover.x, popover.y).length) setPopover(null); }, [popover, itemsAt]);

  // E (modo jogo): item ao alcance abre o "Pegar"; porta perto abre o interior da construcao
  // (ou avisa que esta trancada); dentro/ao lado de uma construcao alterna o telhado.
  useEffect(() => {
    if (!myToken || !isTiles) return undefined;
    const DOORS = new Set(['D', 'X', '(', '?', ']']);
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'e' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
      const pos = { ...myToken, ...(localRef.current[myToken.id] || {}) };
      const near = visibleItems.map((it) => [tokenItemDistance(pos, it, cell), it]).filter(([d]) => d <= PICKUP_RANGE).sort((a, b) => a[0] - b[0])[0];
      if (near) { e.preventDefault(); setPopover({ x: near[1].x, y: near[1].y }); return; }
      const half = ((myToken.size || 1) * cell) / 2;
      const cx = (pos.x + half) / cell;
      const cy = (pos.y + half) / cell;
      // porta de uma construcao com interior: entra na outra cena (o servidor confere tranca e regras)
      for (const b of buildings) {
        if (!b.interior) continue;
        const dc = doorCell(b, scene.tiles);
        if (Math.hypot(dc.x + 0.5 - cx, dc.y + 0.5 - cy) > 1.6) continue;
        e.preventDefault();
        if (b.locked && !isMaster) { setNotice(`${b.name || 'Construção'}: a porta está trancada.`); return; }
        onEnterBuilding?.(b, isMaster ? myToken.id : undefined);
        return;
      }
      const g = scene.tiles.layers.ground;
      let door = null;
      for (let y = Math.floor(cy - 1.5); y <= Math.floor(cy + 1.5); y++) {
        for (let x = Math.floor(cx - 1.5); x <= Math.floor(cx + 1.5); x++) {
          const code = g[y]?.[x];
          if (!DOORS.has(code)) continue;
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d <= PICKUP_RANGE && (!door || d < door.d)) door = { x, y, code, d };
        }
      }
      if (door && isInterior && (door.y === scene.tiles.rows - 1 || door.y === 0 || door.x === 0 || door.x === scene.tiles.cols - 1)) {
        // porta da parede de fora do interior: volta para o mapa de fora
        e.preventDefault();
        onExitScene?.(isMaster ? myToken.id : undefined);
        return;
      }
      if (door) {
        e.preventDefault();
        if (getTile(door.code)?.solid) { setNotice(`${getTile(door.code).name}: está fechada. Peça ao mestre para abrir.`); return; }
        const b = buildingAt(tilesWithRoofs, door.x, door.y);
        if (b) { toggleRoof(b); setNotice(`${b.name || 'Construção'}: ${roofOpen(b) ? 'telhado de volta' : 'você olha para dentro'}.`); }
        else setNotice('A porta está aberta.');
        return;
      }
      const b = tokenBuilding(tilesWithRoofs, pos, cell) || buildingAt(tilesWithRoofs, Math.floor(cx), Math.floor(cy + 1));
      if (b) { e.preventDefault(); toggleRoof(b); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myToken, visibleItems, cell, isTiles, scene?.tiles, toggleRoof, roofOpen, buildings, isMaster, isInterior, onEnterBuilding, onExitScene]);

  // Toque/clique sem arrastar: item abre o popover; construcao alterna o telhado.
  function onTap(p) {
    const x = Math.floor(p.x / cell);
    const y = Math.floor(p.y / cell);
    if (itemsAt(x, y).length) { setPopover({ x, y }); return; }
    setPopover(null);
    const b = isTiles ? (buildingAt(tilesWithRoofs, x, y) || buildings.find((d) => x >= d.x && x < d.x + d.w && y >= d.y - 2 && y < d.y)) : null;
    if (b && isMaster && scene.tiles.buildings?.some((d) => d.id === b.id)) { setHousePop(b.id); return; }
    if (b && !b.interior) toggleRoof(b);
  }

  function onHover(event) {
    if (!isTiles) return;
    const p = toMap(event);
    const x = Math.floor(p.x / cell);
    const y = Math.floor(p.y / cell);
    const here = itemsAt(x, y);
    const b = buildingAt(tilesWithRoofs, x, y);
    const text = isMaster && here.length ? here.map((it) => it.name).join(', ') : b && !roofOpen(b) ? b.name : '';
    setHover((cur) => (text ? (cur?.text === text && cur.x === x && cur.y === y ? cur : { text, x, y }) : null));
  }

  // Centraliza o mapa ao trocar de cena.
  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el || !width) return;
    const fitZ = Math.min(el.clientWidth / width, el.clientHeight / height);
    // mapa de ate 200 celulas abre como antes (zoom minimo 0.2); maior que isso cabe inteiro
    const huge = width / cell > 200 || height / cell > 200;
    const z = clamp(fitZ, huge ? Math.min(0.2, fitZ) : 0.2, 2);
    setView({ z, x: (el.clientWidth - width * z) / 2, y: (el.clientHeight - height * z) / 2 });
  }, [width, height, cell]);
  useEffect(() => { fit(); }, [scene?.id, fit]);

  // Camera do modo jogo: cada pixel da arte vira 4 px de tela (inteiro = nitido) e o
  // personagem fica no centro; arrastar o mapa desliga, o botao de passos liga de novo.
  const followToken = canFollow && follow ? tokens.find((t) => t.id === myTokenId) : null;
  const followPos = followToken ? local[followToken.id] || { x: followToken.x, y: followToken.y } : null;
  useEffect(() => {
    if (!followToken || !followPos) return;
    const el = viewportRef.current;
    if (!el) return;
    const z = (16 * 4) / cell;
    const half = ((followToken.size || 1) * cell) / 2;
    setView({ z, x: Math.round(el.clientWidth / 2 - (followPos.x + half) * z), y: Math.round(el.clientHeight / 2 - (followPos.y + half) * z) });
  }, [followToken?.id, followPos?.x, followPos?.y, cell]);

  // O servidor e a fonte da verdade: quando a posicao oficial alcanca a local, descarta a local.
  useEffect(() => {
    setLocal((cur) => {
      let changed = false;
      const next = { ...cur };
      tokens.forEach((t) => {
        const l = cur[t.id];
        if (l && Math.abs(l.x - t.x) < 1 && Math.abs(l.y - t.y) < 1) { delete next[t.id]; changed = true; }
      });
      return changed ? next : cur;
    });
  }, [tokens]);

  const queueSend = useCallback((token, pos, final) => {
    const s = sendTimer.current;
    s.pending = { token, pos };
    if (final) {
      clearTimeout(s.t);
      s.t = null;
      onMove(token, pos.x, pos.y, { final: true });
      return;
    }
    if (s.t) return;
    s.t = setTimeout(() => {
      s.t = null;
      if (s.pending) onMove(s.pending.token, s.pending.pos.x, s.pending.pos.y, { final: false });
    }, 125);
  }, [onMove]);

  const blocked = useCallback((token, x, y) => {
    if (!isTiles) return false;
    const size = token.size || 1;
    for (let dx = 0; dx < size; dx += 1) {
      for (let dy = 0; dy < size; dy += 1) {
        const cx = Math.floor((x + 1) / cell) + dx;
        const cy = Math.floor((y + 1) / cell) + dy;
        if (cx < 0 || cy < 0 || cx >= scene.tiles.cols || cy >= scene.tiles.rows) return true;
        if (isSolid(scene.tiles, cx, cy)) return true;
        if (buildings.some((b) => (b.interior || b.design) && cx >= b.x && cy >= b.y && cx < b.x + b.w && cy < b.y + b.h)) return true;
      }
    }
    return false;
  }, [isTiles, cell, scene, buildings]);

  // WASD / setas: anda com o token selecionado.
  const selected = tokens.find((t) => t.id === selectedId);
  const selectedMovable = Boolean(selected && canMove(selected));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useEffect(() => {
    if (!selectedMovable) return undefined;
    // carga pesada deixa o proprio personagem mais lento (lib/load.js)
    const speed = (Number(scene?.move_speed) || 6) * (selectedRef.current?.id === myTokenId ? speedFactor : 1);
    const grid = scene?.move_mode === 'grid';
    let frame;
    let last = performance.now();
    let acc = 0;
    let moving = false;
    const dirs = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const token = selectedRef.current;
      let dx = 0;
      let dy = 0;
      keys.current.forEach((k) => { if (dirs[k]) { dx += dirs[k][0]; dy += dirs[k][1]; } });
      if (token && (dx || dy)) {
        const pos = tokenPos(token);
        let nx = pos.x;
        let ny = pos.y;
        if (grid) {
          // Primeiro passo na hora; os seguintes no ritmo da velocidade (celulas por segundo).
          acc = moving ? acc + dt * speed : 1;
          if (acc >= 1) {
            acc -= 1;
            nx = Math.round(pos.x / cell) * cell + Math.sign(dx) * cell;
            ny = Math.round(pos.y / cell) * cell + Math.sign(dy) * cell;
          }
        } else {
          const len = Math.hypot(dx, dy);
          nx = pos.x + (dx / len) * speed * cell * dt;
          ny = pos.y + (dy / len) * speed * cell * dt;
        }
        moving = true;
        if (nx !== pos.x || ny !== pos.y) {
          let target = { x: clamp(nx, 0, width - cell), y: clamp(ny, 0, height - cell) };
          // Bateu na parede em diagonal: tenta deslizar pelo eixo livre.
          if (blocked(token, target.x, target.y)) {
            if (!blocked(token, target.x, pos.y)) target = { x: target.x, y: pos.y };
            else if (!blocked(token, pos.x, target.y)) target = { x: pos.x, y: target.y };
            else target = null;
          }
          if (target && (!budget || budget(token, target))) {
            setLocal((cur) => ({ ...cur, [token.id]: target }));
            localRef.current = { ...localRef.current, [token.id]: target };
            queueSend(token, target, false);
          }
        }
      } else if (moving) {
        moving = false;
        acc = 0;
        if (token) queueSend(token, tokenPos(token), true);
      }
      frame = requestAnimationFrame(step);
    };

    const typing = (e) => /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
    const down = (e) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (dirs[k]) { e.preventDefault(); keys.current.add(k); }
    };
    const up = (e) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      keys.current.clear();
    };
  }, [selectedMovable, scene?.move_speed, scene?.move_mode, cell, width, height, blocked, tokenPos, queueSend, budget, speedFactor, myTokenId]);

  function toMap(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left - view.x) / view.z, y: (event.clientY - rect.top - view.y) / view.z };
  }

  function onWheel(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    setView((v) => {
      const z = clamp(v.z * (event.deltaY < 0 ? 1.12 : 1 / 1.12), minZoom, 4);
      return { z, x: mx - ((mx - v.x) / v.z) * z, y: my - ((my - v.y) / v.z) * z };
    });
  }

  function zoomBy(f) {
    const el = viewportRef.current;
    const mx = el.clientWidth / 2;
    const my = el.clientHeight / 2;
    setView((v) => {
      const z = clamp(v.z * f, minZoom, 4);
      return { z, x: mx - ((mx - v.x) / v.z) * z, y: my - ((my - v.y) / v.z) * z };
    });
  }

  function onPointerDownBg(event) {
    if (event.altKey || event.button === 1) {
      event.preventDefault();
      const p = toMap(event);
      onPing?.(p.x, p.y);
      return;
    }
    drag.current = { kind: 'pan', sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y, moved: 0, wasFollowing: follow };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerDownToken(event, token) {
    event.stopPropagation();
    if (targeting) {
      onTarget?.(token);
      return;
    }
    onSelect?.(token.id);
    if (!canMove(token)) return;
    const p = toMap(event);
    const pos = tokenPos(token);
    drag.current = { kind: 'token', token, ox: p.x - pos.x, oy: p.y - pos.y, start: pos };
    viewportRef.current.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (isMaster && onCursor) onCursor(toMap(event));
    const d = drag.current;
    if (!d) { onHover(event); return; }
    if (d.kind === 'pan') {
      d.moved = Math.max(d.moved, Math.hypot(event.clientX - d.sx, event.clientY - d.sy));
      if (d.moved > 6 && follow) setFollow(false);
      setView((v) => ({ ...v, x: d.vx + event.clientX - d.sx, y: d.vy + event.clientY - d.sy }));
    } else {
      const p = toMap(event);
      const pos = { x: clamp(p.x - d.ox, 0, width - cell), y: clamp(p.y - d.oy, 0, height - cell) };
      d.moved = true;
      setLocal((cur) => ({ ...cur, [d.token.id]: pos }));
      localRef.current = { ...localRef.current, [d.token.id]: pos };
    }
  }

  function onPointerUp(event) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'pan' && d.moved < 6 && event?.type === 'pointerup') onTap(toMap(event));
    if (d?.kind !== 'token' || !d.moved) return;
    const raw = localRef.current[d.token.id];
    if (!raw) return;
    const snap = scene?.move_mode === 'grid';
    let pos = snap ? { x: Math.round(raw.x / cell) * cell, y: Math.round(raw.y / cell) * cell } : raw;
    if (blocked(d.token, pos.x, pos.y) || (budget && !budget(d.token, pos))) pos = d.start;
    setLocal((cur) => ({ ...cur, [d.token.id]: pos }));
    if (pos !== d.start) onMove(d.token, pos.x, pos.y, { final: true });
  }

  // O que aparece na tela (px do mapa) + folga: itens, tokens e casas fora disso nem sao montados
  // (mapa de 1000x1000 com milhares de casas). De muito longe as casas viram blocos no proprio canvas.
  const vis = { x: -view.x / view.z, y: -view.y / view.z, w: vsize.w / view.z, h: vsize.h / view.z };
  const margin = Math.max(cell * 4, Math.max(vis.w, vis.h) * 0.25);
  const inView = (x0, y0, x1, y1) => x1 > vis.x - margin && x0 < vis.x + vis.w + margin && y1 > vis.y - margin && y0 < vis.y + vis.h + margin;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const farAway = Boolean(isTiles && pickLod(cell * view.z * dpr, chunkLayout(scene.tiles.cols, scene.tiles.rows).single) === 'overview');
  const shownItems = visibleItems.filter((it) => inView(it.x * cell, it.y * cell, (it.x + 1) * cell, (it.y + 1) * cell));
  // casas: o telhado sobe ate ~6 celulas acima da pegada
  const shownBuildings = farAway ? [] : buildings.filter((b) => inView(b.x * cell, (b.y - 6) * cell, (b.x + b.w) * cell, (b.y + b.h) * cell));
  const fxArea = width * height > 4096 * 4096 ? { x: vis.x - margin, y: vis.y - margin, w: vis.w + margin * 2, h: vis.h + margin * 2 } : undefined;
  // de longe o pixel do efeito cresce (dobrando) para o canvas da janela nao passar de ~2048 px
  let fxPixel;
  if (fxArea) {
    fxPixel = Math.max(1, cell / 16);
    while (Math.max(fxArea.w, fxArea.h) / fxPixel > 2048) fxPixel *= 2;
  }

  const reveals = scene?.fog_reveals || [];
  const fogOn = scene?.fog_enabled;
  const sortedTokens = useMemo(() => [...tokens].sort((a, b) => (a.kind === 'marker' ? 0 : 1) - (b.kind === 'marker' ? 0 : 1)), [tokens]);

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-[#050407]">
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none ${targeting ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onWheel={onWheel}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => { setHover(null); if (isMaster) onCursor?.(null); }}
        role="application"
        aria-label="Mesa virtual. Arraste para mover o mapa, roda do mouse para zoom, WASD para andar com o token selecionado, Alt+clique para marcar um ponto."
      >
        <div ref={shakeRef} className="absolute inset-0">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {isTiles ? (
            <>
              {/* mapa com a margem de continuacao (estrada/rio/mata seguem para fora); a mesa usa coordenadas do mapa original */}
              <TileMapCanvas map={paddedTiles} cellSize={cell} showGrid={Boolean(scene.show_grid)} viewport={{ ...vis, x: vis.x + PAD * cell, y: vis.y + PAD * cell }} scale={view.z} buildingBlocks={farAway} className="absolute" style={{ left: -PAD * cell, top: -PAD * cell }} />
              <EdgeMist cell={cell} width={width} height={height} />
            </>
          ) : scene?.map_url ? (
            <img src={scene.map_url} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-fill" />
          ) : (
            <div className="absolute inset-0 bg-[#0e0c12]" />
          )}
          {!isTiles && scene?.show_grid && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.55) 1px, transparent 1px)',
                backgroundSize: `${cell}px ${cell}px`,
                backgroundPosition: `${scene?.grid_offset_x || 0}px ${scene?.grid_offset_y || 0}px`
              }}
            />
          )}

          {shownItems.map((it) => (
            <button
              key={it.id}
              type="button"
              className="vtt-loot has-icon"
              style={{ left: it.x * cell, top: it.y * cell, width: cell, height: cell }}
              aria-label={`Item no mapa: ${it.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPopover({ x: it.x, y: it.y }); } }}
            >
              {/* o proprio icone do item, brilhando (antes era um losango generico) */}
              <ItemIcon item={it} size={Math.round(cell / 32) * 16 || 32} />
            </button>
          ))}

          {sortedTokens.map((t) => {
            const pos = local[t.id] || { x: t.x, y: t.y };
            const keep = t.id === selectedId || t.id === myTokenId || t.id === activeTokenId || drag.current?.token?.id === t.id;
            if (!keep && !inView(pos.x, pos.y, pos.x + (t.size || 1) * cell, pos.y + (t.size || 1) * cell)) return null;
            const hiddenInside = !isMaster && t.id !== myTokenId && isTiles && (() => {
              const b = tokenBuilding(tilesWithRoofs, { ...t, ...pos }, cell);
              return b && !roofOpen(b);
            })();
            if (hiddenInside) return null;
            const size = (t.size || 1) * cell;
            const fx = effects[t.id];
            const down = t.conditions?.includes('caído') || fx?.down;
            const active = t.id === activeTokenId;
            const sprite = isTiles && t.kind === 'character' ? t.appearance || appearanceCache.current[t.character_id || t.id] : null;
            // monstro/NPC sem imagem enviada vira o bicho em pixel art (gerado pelo nome)
            const mlook = isTiles && !sprite && !t.image_url && (t.kind === 'monster' || t.kind === 'npc') ? monsterLook({ name: t.name }) : null;
            return (
              <button
                key={t.id}
                ref={(el) => { tokenEls.current[t.id] = el; }}
                type="button"
                onPointerDown={(e) => onPointerDownToken(e, t)}
                onKeyDown={(e) => { if (e.key === 'Enter' && targeting) onTarget?.(t); }}
                aria-label={`${t.name}${t.hidden ? ' (oculto dos jogadores)' : ''}${active ? ', turno atual' : ''}`}
                aria-pressed={t.id === selectedId}
                className={`vtt-token absolute ${sprite || mlook ? 'is-sprite' : ''} ${t.id === selectedId ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${t.hidden ? 'is-hidden' : ''} ${down ? 'is-down' : ''} ${targeting ? 'is-targetable' : ''}`}
                style={{ left: pos.x, top: pos.y, width: size, height: size, zIndex: 11 + Math.floor((pos.y + size - 1) / cell) * 2, '--tc': t.color || '#a4781a', transition: local[t.id] ? 'none' : 'left .25s cubic-bezier(.16,1,.3,1), top .25s cubic-bezier(.16,1,.3,1)' }}
              >
                {mlook ? (
                  <span key={fx?.n} className={`vtt-sprite ${fx?.n && fx?.hit ? 'hit-shake' : ''}`} style={{ width: size * (mlook.size / 16) * 0.9, height: size * (mlook.size / 16) * 0.9 }}>
                    <MonsterSprite look={mlook} mapStyle={scene.tiles?.style} direction={motion[t.id]?.dir || 'down'} moving={Boolean(motion[t.id]?.moving)} scale={4} style={{ width: '100%', height: '100%' }} title={t.name} />
                  </span>
                ) : sprite ? (
                  <span key={fx?.n} className={`vtt-sprite ${fx?.n && fx?.hit ? 'hit-shake' : ''}`} style={{ width: size * 1.05, height: size * 1.4 }}>
                    <AvatarSprite appearance={sprite} mapStyle={scene.tiles?.style} direction={motion[t.id]?.dir || 'down'} moving={Boolean(motion[t.id]?.moving)} scale={4} style={{ width: '100%', height: '100%' }} title={t.name} />
                  </span>
                ) : (
                  <span key={fx?.n} className={`vtt-token-face ${fx?.n && fx?.hit ? 'hit-shake' : ''}`}>
                    {t.image_url ? <img src={t.image_url} alt="" draggable={false} className="h-full w-full object-cover" /> : <span className="font-display" style={{ fontSize: size * 0.42 }}>{t.name?.slice(0, 1)}</span>}
                    <Crack on={Boolean(fx?.hit)} seed={fx?.n || 0} />
                  </span>
                )}
                {t.conditions?.length > 0 && (
                  <span className="vtt-conditions">{t.conditions.slice(0, 3).map((c) => <span key={c}>{c.slice(0, 3)}</span>)}</span>
                )}
                {fx?.label && <span key={`l${fx.n}`} className="vtt-float font-display">{fx.label}</span>}
                <span className="vtt-name">{t.name}</span>
              </button>
            );
          })}

          {shownBuildings.map((b) => (
            <House key={b.id} building={b} tiles={scene.tiles} light={sceneLight} cell={cell} open={roofOpen(b)} lazy={buildings.length > 60} />
          ))}

          <FxLayer ref={fxRef} width={width} height={height} cell={cell} area={fxArea} pixel={fxPixel} onFrame={onFxFrame} className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 900 }} />

          {fogOn && (
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
              <defs>
                <mask id={`fog-${scene.id}`}>
                  <rect width={width} height={height} fill="white" />
                  {reveals.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />)}
                </mask>
              </defs>
              <rect width={width} height={height} fill="#030204" opacity={isMaster ? 0.55 : 1} mask={`url(#fog-${scene.id})`} />
            </svg>
          )}

          {gmCursor && !isMaster && (
            <div className="vtt-gm-cursor" style={{ left: gmCursor.x, top: gmCursor.y, transform: `scale(${1 / Math.max(0.4, view.z)})` }} aria-label="Cursor do mestre">
              <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 2 L2 21 L7 16 L11 24 L14 22.5 L10 15 L17 15 Z" fill="#f2c14e" stroke="#2a1a22" strokeWidth="2" strokeLinejoin="round" /></svg>
              <span>Mestre</span>
            </div>
          )}
          {pings.map((p) => (
            <span key={p.id} className="vtt-ping" style={{ left: p.x, top: p.y, '--pc': p.color || 'var(--color-ember)' }} />
          ))}
        </div>
        </div>
      </div>

      {visionCells && !isMaster && isTiles && myToken && <VisionMask tokenRef={() => ({ ...myToken, ...(localRef.current[myToken.id] || {}) })} view={view} cell={cell} radius={visionCells} />}

      {clock?.on && isTiles && !scene.parent_scene_id && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 border-[3px] border-lead bg-abyss/90 px-2 py-1 text-sm text-bone shadow-lg" aria-label={`Hora: ${clockLabel(clock.minutes)}`}>
          {isMaster && <button type="button" className="btn btn-glass !min-h-7 !w-7 !p-0" onClick={() => onClockChange?.((clock.minutes + 1425) % 1440)} aria-label="Voltar 15 minutos">‹</button>}
          {phaseAt(clock.minutes) === 'Noite' ? <Moon size={14} className="text-[#9fb4ff]" /> : <Sun size={14} className="text-ember" />}
          <span className="font-bold tabular-nums">{clockLabel(clock.minutes)}</span>
          <span className="text-xs text-mist">{phaseAt(clock.minutes)}</span>
          {isMaster && <button type="button" className="btn btn-glass !min-h-7 !w-7 !p-0" onClick={() => onClockChange?.((clock.minutes + 15) % 1440)} aria-label="Avançar 15 minutos">›</button>}
        </div>
      )}

      {housePop && isMaster && (() => {
        const b = (scene.tiles.buildings || []).find((d) => d.id === housePop);
        if (!b) return null;
        return (
          <div role="dialog" aria-label={`Construção: ${b.name}`} className="gothic-panel absolute left-3 top-3 z-20 max-h-[calc(100%-1.5rem)] w-72 max-w-[calc(100%-5rem)] overflow-y-auto rounded-md border-[3px] border-lead p-3 text-sm text-bone">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-display text-lg">{b.name || 'Construção'}</p>
              <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => setHousePop(null)} aria-label="Fechar"><X size={15} /></button>
            </div>
            <button type="button" className={`btn w-full ${b.locked ? 'btn-lit' : 'btn-glass'}`} onClick={() => onPatchBuilding?.(b, { locked: !b.locked })}>
              {b.locked ? <><Lock size={16} /> Trancada: clique para abrir</> : <><LockOpen size={16} /> Aberta: clique para trancar</>}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs text-mist">Material
                <select className="field !mt-1 py-1 text-sm" value={b.material || DESIGN_BY_ID[b.design]?.defaults.material || ''} onChange={(e) => onPatchBuilding?.(b, { material: e.target.value })}>
                  {!b.material && !b.design && <option value="">Original</option>}
                  {MATERIALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="text-xs text-mist">Telhado
                <select className="field !mt-1 py-1 text-sm" value={b.roofStyle || DESIGN_BY_ID[b.design]?.defaults.roofStyle || ''} onChange={(e) => onPatchBuilding?.(b, { roofStyle: e.target.value })}>
                  {!b.roofStyle && !b.design && <option value="">Original</option>}
                  {ROOF_STYLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-2 block text-xs text-mist">Porta virada para
              <select className="field !mt-1 py-1 text-sm" value={b.facing || 'sul'} onChange={(e) => onPatchBuilding?.(b, { facing: e.target.value })}>
                {FACINGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[['roof', 'Telhado'], ['wall', 'Parede'], ['accent', 'Detalhes']].map(([k, l]) => (
                <label key={k} className="text-xs text-mist">{l}
                  <input type="color" className="mt-1 block h-8 w-full cursor-pointer border-2 border-lead bg-transparent" value={b.colors?.[k] || DESIGN_BY_ID[b.design]?.defaults.colors[k] || '#8a6a4a'} onChange={(e) => onPatchBuilding?.(b, { colors: { ...(b.colors || {}), [k]: e.target.value } })} />
                </label>
              ))}
            </div>
            {b.interior ? (
              <button type="button" className="btn btn-glass mt-2 w-full" onClick={() => { setHousePop(null); onViewScene?.(b.interior); }}><DoorOpen size={16} /> Ver o interior</button>
            ) : (
              <button type="button" className="btn btn-glass mt-2 w-full" onClick={() => onCreateInterior?.(b)}><DoorOpen size={16} /> Criar interior (outro mapa)</button>
            )}
            <p className="mt-2 text-xs text-mist">Jogadores entram chegando na porta e apertando E. Trancada, ninguém entra.</p>
          </div>
        );
      })()}
      {isMaster && isInterior && (
        <button type="button" className="btn btn-glass absolute left-3 top-3 z-20 !min-h-9 text-sm" onClick={() => onViewScene?.(scene.parent_scene_id)}><DoorOpen size={16} /> Voltar para fora</button>
      )}
      {!isMaster && isInterior && !notice && (
        <p className="pointer-events-none absolute left-3 top-3 z-10 border-2 border-lead bg-abyss/85 px-2 py-1 text-xs text-mist">Para sair, vá até a porta e aperte E</p>
      )}
      {popover && (() => {
        const here = itemsAt(popover.x, popover.y);
        if (!here.length) return null;
        const nearChars = isMaster ? tokens.filter((t) => t.kind === 'character' && t.character_id && here.some((it) => tokenItemDistance({ ...t, ...(local[t.id] || {}) }, it, cell) <= PICKUP_RANGE)) : [];
        return (
          <div
            role="dialog"
            aria-label="Itens nesta célula"
            className="gothic-panel absolute z-20 w-64 max-w-[calc(100%-1rem)] rounded-md border-[3px] border-lead p-2 text-sm text-bone"
            style={{ left: clamp(view.x + (popover.x + 0.5) * cell * view.z, 136, 10000), top: Math.max(8, view.y + popover.y * cell * view.z - 8), transform: 'translate(-50%, -100%)' }}
            onKeyDown={(e) => { if (e.key === 'Escape') setPopover(null); }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-display text-lg">Achados</p>
              <button type="button" className="btn btn-glass !min-h-8 !w-8 !p-0" onClick={() => setPopover(null)} aria-label="Fechar"><X size={15} /></button>
            </div>
            <ul className="space-y-2">
              {here.map((it) => {
                const reason = isMaster ? null : pickupBlock?.(it);
                // recipiente: tirar de dentro nao depende de o recipiente ser pegavel
                const isBox = Boolean(it.container || it.contents?.length);
                const innerReason = isMaster || !isBox ? null : pickupBlock?.(it, { content: true });
                return (
                  <li key={it.id} className="border-t-2 border-lead pt-2 first:border-0 first:pt-0">
                    <p className="flex items-center gap-2 font-bold"><ItemIcon item={it} size={32} />{it.name}{it.dracmas ? ` — ${it.dracmas} dracmas` : it.quantity > 1 ? ` ×${it.quantity}` : ''}</p>
                    {it.description && <p className="text-xs text-mist">{it.description}</p>}
                    {isBox && <ContainerContents item={it} isMaster={isMaster} reason={innerReason} onTake={(c) => onPickup?.(it, undefined, c)} onPatch={(patch) => onPatchItem?.(it, patch)} />}
                    {isBox && innerReason && innerReason !== reason && <p className="mt-1 text-xs text-ember">{innerReason}</p>}
                    {!isMaster && (
                      <>
                        <button type="button" autoFocus className="btn btn-lit mt-1 !min-h-9 w-full text-sm" disabled={Boolean(reason)} onClick={() => onPickup?.(it)}>
                          <Hand size={15} /> {rights?.pickup === 'pedir' ? (isBox ? 'Pedir para levar tudo' : 'Pedir para pegar') : isBox ? 'Levar tudo' : 'Pegar'}
                        </button>
                        {reason && <p className="mt-1 text-xs text-ember">{reason}</p>}
                      </>
                    )}
                    {isMaster && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button type="button" className={`btn !min-h-8 text-xs ${it.pickable === false ? 'btn-glass' : 'btn-lit'}`} onClick={() => onPatchItem?.(it, { pickable: it.pickable === false })} aria-pressed={it.pickable !== false}>{it.pickable === false ? 'Não pegável' : 'Pegável'}</button>
                        <button type="button" className={`btn !min-h-8 text-xs ${it.hidden ? 'btn-lit' : 'btn-glass'}`} onClick={() => onPatchItem?.(it, { hidden: !it.hidden })} aria-pressed={Boolean(it.hidden)}>{it.hidden ? 'Escondido' : 'Visível'}</button>
                        <button type="button" className={`btn !min-h-8 text-xs ${isBox ? 'btn-lit' : 'btn-glass'}`} onClick={() => onPatchItem?.(it, isBox ? { container: false, contents: [], locked: false } : { container: true, contents: [] })} aria-pressed={isBox} disabled={isBox && it.contents?.length > 0} title={isBox && it.contents?.length ? 'Esvazie antes de deixar de ser recipiente.' : undefined}>{isBox ? 'Recipiente' : 'Não é recipiente'}</button>
                        {isBox && <button type="button" className={`btn !min-h-8 text-xs ${it.locked ? 'btn-lit' : 'btn-glass'}`} onClick={() => onPatchItem?.(it, { locked: !it.locked })} aria-pressed={Boolean(it.locked)}>{it.locked ? 'Trancado' : 'Destrancado'}</button>}
                        {it.note && <p className="w-full text-xs text-ember">Nota: {it.note}</p>}
                      </div>
                    )}
                    {isMaster && (nearChars.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {nearChars.map((t) => (
                          <button key={t.id} type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => onPickup?.(it, t.character_id)}>Entregar a {t.name}</button>
                        ))}
                      </div>
                    ) : <p className="mt-1 text-xs text-mist">Nenhum personagem perto para entregar.</p>)}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}
      {hover && !popover && !drag.current && (
        <p className="pointer-events-none absolute z-10 max-w-xs border-2 border-lead bg-abyss/95 px-2 py-1 text-xs font-bold text-bone"
          style={{ left: view.x + (hover.x + 0.5) * cell * view.z, top: view.y + hover.y * cell * view.z - 6, transform: 'translate(-50%, -100%)' }}>
          {hover.text}
        </p>
      )}

      {notice && <p role="status" className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-xs border-2 border-lead bg-abyss/95 px-3 py-2 text-sm font-bold text-bone">{notice}</p>}
      {canFollow && follow && !notice && <p className="pointer-events-none absolute bottom-3 left-3 z-10 hidden border-2 border-lead bg-abyss/80 px-2 py-1 text-xs text-mist sm:block">WASD anda · E interage</p>}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {isMaster && buildings.length > 0 && (
          <button type="button" className={`btn btn-glass !min-h-10 !w-10 !p-0 ${interiors ? 'lit' : ''}`} onClick={() => { setInteriors((v) => !v); setRoofToggle({}); }} aria-pressed={interiors} aria-label="Ver interiores" title="Ver interiores">
            {interiors ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {canFollow && (
          <button type="button" className={`btn btn-glass !min-h-10 !w-10 !p-0 ${follow ? 'lit' : ''}`} onClick={() => setFollow((v) => !v)} aria-pressed={follow} aria-label="Modo jogo: câmera segue seu personagem" title="Câmera segue seu personagem">
            <Footprints size={18} />
          </button>
        )}
        {isMaster && onToggleCursor && (
          <button type="button" className={`btn btn-glass !min-h-10 !w-10 !p-0 ${showCursor ? 'lit' : ''}`} onClick={onToggleCursor} aria-pressed={Boolean(showCursor)} aria-label="Jogadores veem o seu cursor" title={showCursor ? 'Jogadores veem o seu cursor (clique para esconder)' : 'Cursor escondido dos jogadores (clique para mostrar)'}>
            <MousePointer2 size={18} />
          </button>
        )}
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => zoomBy(1.25)} aria-label="Aproximar"><Plus size={18} /></button>
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={() => zoomBy(0.8)} aria-label="Afastar"><Minus size={18} /></button>
        <button type="button" className="btn btn-glass !min-h-10 !w-10 !p-0" onClick={fit} aria-label="Centralizar mapa"><LocateFixed size={18} /></button>
      </div>
      {targeting && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <p className="flex items-center gap-2 border-[3px] border-lead bg-abyss/95 px-4 py-2 font-bold text-ember"><Crosshair size={18} /> Escolha o alvo no mapa (Esc cancela)</p>
        </div>
      )}
    </div>
  );
}
