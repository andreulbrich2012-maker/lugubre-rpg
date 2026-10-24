import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Coins, Dice5, Eye, EyeOff, MapPinned, Plus, RefreshCw, Route, Store, Trash2, Undo2 } from 'lucide-react';
import AvatarSprite from '../avatar/AvatarSprite';
import ItemIcon from '../icons/ItemIcon';
import CampaignShopsTab from '../campaigns/CampaignShopsTab';
import MapPicker from './MapPicker';
import { api } from '../../lib/api';
import { CATALOG, CATEGORIES } from '../../lib/economy/prices';
import { cleanMult, finalPrice, formatMult, MULT_PRESETS, rentalLeft } from '../../lib/economy/pricing';
import { merchantAppearance } from '../../lib/economy/npcLook';
import { ARCHETYPE_BY_ID } from '../../lib/economy/merchants';
import { doorCell } from '../../lib/buildings';
import './economy.css';

// Painel da economia. Mestre: precos da campanha/cena/areas, mercadores (criar de um modelo,
// estoque, recompra, movimento do NPC), alugueis e livro-caixa. Jogador: os proprios alugueis.

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const KIND_LABEL = { compra: 'Compra', venda: 'Venda', aluguel: 'Aluguel', devolucao: 'Devolução', reposicao: 'Reposição' };

function MultPicker({ value, onChange, label }) {
  const [custom, setCustom] = useState('');
  const v = cleanMult(value);
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {MULT_PRESETS.map((m) => (
        <button key={m} type="button" className={`eco-mult ${v === m ? 'is-on' : 'text-bone hover:bg-glass'}`} aria-pressed={v === m} onClick={() => onChange(m)}>{formatMult(m)}</button>
      ))}
      <form className="inline-flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const n = Number(String(custom).replace(',', '.')); if (n > 0) { onChange(cleanMult(n)); setCustom(''); } }}>
        <input className="field !mt-0 !w-16 !px-1.5 !py-0.5 text-sm" inputMode="decimal" placeholder={MULT_PRESETS.includes(v) ? '×…' : String(v).replace('.', ',')} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label={`${label}: valor digitado`} />
      </form>
    </div>
  );
}

// melhor lugar para um mercador novo: na frente da construcao que combina com o oficio
function spotFor(archetype, scene) {
  const tiles = scene?.map_kind === 'tiles' ? scene.tiles : null;
  if (!tiles) return {};
  const a = ARCHETYPE_BY_ID[archetype];
  // palavras em ordem de preferencia: "taverna" ganha de "padaria" para o taberneiro
  let b = null;
  for (const k of a?.keywords || []) {
    b = (tiles.buildings || []).find((d) => norm(`${d.name} ${d.design || ''}`).includes(k));
    if (b) break;
  }
  if (b) {
    try {
      const door = doorCell(b, tiles);
      const y = Math.min(tiles.rows - 1, door.y + 1);
      return { x: door.x, y, building: b };
    } catch { /* construcao sem porta: centro */ }
  }
  return { x: Math.floor(tiles.cols / 2), y: Math.floor(tiles.rows / 2) };
}

function PlayerRentals({ campaignId, reloadKey, notify }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.get(`/campaigns/${campaignId}/economy`).then(({ data: d }) => setData(d)).catch(() => null), [campaignId]);
  useEffect(() => { load(); }, [load, reloadKey]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (!data?.rentals?.length) return null;
  return (
    <section className="eco-card mb-4 p-3">
      <h2 className="font-display text-2xl text-bone">Seus aluguéis</h2>
      <ul className="mt-2 space-y-2">
        {data.rentals.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <ItemIcon item={{ name: r.name }} size={32} />
            <span className="min-w-0 flex-1"><b className="text-bone">{r.name}</b><span className="block text-xs text-mist">{r.shopName} · faltam {rentalLeft(r, { worldMinutes: data.settings.worldMinutes, now })}</span></span>
            <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => api.post(`/campaigns/${campaignId}/economy/rentals/${r.id}/end`).then(() => { notify?.(`${r.name} devolvido.`); load(); }).catch((err) => notify?.(err.response?.data?.message || 'Não deu.', 'error'))}><Undo2 size={14} /> Devolver</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function EconomyPanel({ campaignId, isMaster, scene, characters = [], reloadKey = 0, notify, onOpenShop }) {
  if (!isMaster) {
    return (
      <>
        <PlayerRentals campaignId={campaignId} reloadKey={reloadKey} notify={notify} />
        <CampaignShopsTab campaignId={campaignId} isMaster={false} characters={characters} />
      </>
    );
  }
  return <MasterEconomy campaignId={campaignId} scene={scene} characters={characters} reloadKey={reloadKey} notify={notify} onOpenShop={onOpenShop} />;
}

function MasterEconomy({ campaignId, scene, characters, reloadKey, notify, onOpenShop }) {
  const [eco, setEco] = useState(null);
  const [open, setOpen] = useState(null); // mercador aberto
  const [picker, setPicker] = useState(null); // { mode, title, onDone }
  const [log, setLog] = useState(null);
  const [legacy, setLegacy] = useState(false);
  const [creating, setCreating] = useState('');
  const base = `/campaigns/${campaignId}/economy`;
  const load = useCallback(() => api.get(base).then(({ data }) => setEco(data)).catch((err) => notify?.(err.response?.data?.message || 'Não deu para carregar a economia.', 'error')), [base, notify]);
  useEffect(() => { load(); }, [load, reloadKey]);
  const fail = (err) => notify?.(err.response?.data?.message || 'Não deu.', 'error');
  const run = (p, ok) => p.then((r) => { if (ok) notify?.(ok); load(); return r; }).catch(fail);

  const sceneInfo = eco?.scenes?.find((s) => s.id === scene?.id);
  const shopsHere = useMemo(() => (eco?.shops || []).map((s) => ({ ...s, here: s.tokens.some((t) => t.sceneId === scene?.id) })).sort((a, b) => b.here - a.here), [eco, scene?.id]);

  async function createMerchant(archetype) {
    if (!scene) { notify?.('Abra uma cena no mapa primeiro.', 'error'); return; }
    setCreating(archetype);
    const spot = spotFor(archetype, scene);
    try {
      const { data } = await api.post(`${base}/merchants`, { archetype, sceneId: scene.id, ...(spot.x != null ? { x: spot.x, y: spot.y } : {}), ...(spot.building?.name ? { shopName: spot.building.name } : {}), appearance: merchantAppearance(archetype) });
      notify?.(`${data.shop.name} está no mapa${spot.building ? `, na frente de ${spot.building.name}` : ''}.`);
      setOpen(data.shop.id);
      await load();
    } catch (err) { fail(err); } finally { setCreating(''); }
  }

  if (!eco) return <p className="text-mist">Abrindo a economia…</p>;
  return (
    <div className="space-y-4">
      <section className="eco-card p-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-bone"><Coins size={20} className="text-ember" /> Preços</h2>
        <p className="text-xs text-mist">Preço final = base × campanha × cena × área × mercador. Os jogadores só veem o final.</p>
        <p className="mt-2 text-sm font-bold text-bone">Campanha inteira</p>
        <MultPicker label="Multiplicador da campanha" value={eco.settings.priceMult} onChange={(m) => run(api.patch(`${base}/settings`, { priceMult: m }), `Preços da campanha ${formatMult(m)}.`)} />
        {scene && (
          <>
            <p className="mt-3 text-sm font-bold text-bone">Esta cena: {scene.name}</p>
            <MultPicker label="Multiplicador da cena" value={sceneInfo?.priceMult ?? 1} onChange={(m) => run(api.patch(`${base}/scenes/${scene.id}`, { priceMult: m }), `${scene.name}: preços ${formatMult(m)}.`)} />
            <div className="mt-2 space-y-1">
              {(sceneInfo?.priceAreas || []).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <MapPinned size={14} className="text-[#8fb3ff]" /><b className="text-bone">{a.name}</b>
                  <MultPicker label={`Multiplicador da área ${a.name}`} value={a.mult} onChange={(m) => run(api.patch(`${base}/scenes/${scene.id}`, { priceAreas: sceneInfo.priceAreas.map((x) => (x.id === a.id ? { ...x, mult: m } : x)) }))} />
                  <button type="button" className="btn btn-glass !min-h-7 !w-7 !p-0" aria-label={`Apagar área ${a.name}`} onClick={() => run(api.patch(`${base}/scenes/${scene.id}`, { priceAreas: sceneInfo.priceAreas.filter((x) => x.id !== a.id) }))}><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-glass !min-h-8 text-sm" onClick={() => setPicker({
                mode: 'rect', title: 'Área com preço próprio', onDone: (r) => {
                  const name = window.prompt('Nome da área (ex.: Bairro nobre):', 'Bairro nobre');
                  if (name === null) return;
                  const mult = cleanMult(String(window.prompt('Multiplicador (ex.: 1,5 = 50% mais caro):', '1,5') || '1').replace(',', '.'));
                  run(api.patch(`${base}/scenes/${scene.id}`, { priceAreas: [...(sceneInfo?.priceAreas || []), { name: name || 'Área', x: r.x, y: r.y, w: r.w, h: r.h, mult }] }), `Área ${name} ${formatMult(mult)}.`);
                }
              })}><MapPinned size={15} /> Nova área de preço no mapa</button>
            </div>
          </>
        )}
        <label className="mt-3 flex items-center gap-2 text-xs text-mist">Sem o relógio do mundo, 1 dia de aluguel dura
          <input className="field !mt-0 !w-16 !px-1.5 !py-0.5 text-sm" type="number" min="0.1" step="0.5" defaultValue={eco.settings.rentHoursPerDay} onBlur={(e) => Number(e.target.value) > 0 && Number(e.target.value) !== eco.settings.rentHoursPerDay && run(api.patch(`${base}/settings`, { rentHoursPerDay: Number(e.target.value) }), 'Duração do aluguel salva.')} /> h reais
        </label>
      </section>

      <section className="eco-card p-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-bone"><Store size={20} className="text-ember" /> Novo mercador</h2>
        <p className="text-xs text-mist">{scene ? `Clique num ofício: o NPC aparece em ${scene.name} (na frente da construção que combina, se tiver) com estoque e preços prontos.` : 'Abra uma cena no mapa primeiro.'}</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {eco.archetypes.map((a) => (
            <button key={a.id} type="button" disabled={!scene || Boolean(creating)} className="btn btn-glass !min-h-10 justify-start text-left text-sm" onClick={() => createMerchant(a.id)} title={a.greeting}>
              <Plus size={14} /> {creating === a.id ? 'Criando…' : a.title}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-2xl text-bone">Mercadores</h2>
        {!shopsHere.length && <p className="text-sm text-mist">Nenhum mercador ainda.</p>}
        {shopsHere.map((s) => (
          <MerchantCard key={s.id} shop={s} open={open === s.id} onToggle={() => setOpen((cur) => (cur === s.id ? null : s.id))}
            base={base} scene={scene} scenes={eco.scenes} run={run} notify={notify} setPicker={setPicker} onOpenShop={onOpenShop} />
        ))}
      </section>

      <section className="eco-card p-3">
        <h2 className="font-display text-2xl text-bone">Aluguéis ativos</h2>
        {!eco.rentals.length && <p className="text-sm text-mist">Ninguém está alugando nada.</p>}
        <ul className="mt-1 space-y-1.5">
          {eco.rentals.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b className="text-bone">{r.name}</b> <span className="text-mist">· {r.characterName} · {r.shopName} · faltam {rentalLeft(r, { worldMinutes: eco.settings.worldMinutes })}</span></span>
              <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => run(api.post(`${base}/rentals/${r.id}/end`), `Aluguel encerrado: ${r.name}.`)}>Encerrar</button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-mist">{eco.settings.clockOn ? 'Relógio do mundo ligado: o prazo conta as horas que você avança.' : 'Relógio do mundo desligado: o prazo conta horas reais.'}</p>
      </section>

      <section className="eco-card p-3">
        <button type="button" className="flex w-full items-center gap-2 text-left font-display text-2xl text-bone" onClick={() => (log ? setLog(null) : api.get(`${base}/log`).then(({ data }) => setLog(data)).catch(fail))} aria-expanded={Boolean(log)}>
          {log ? <ChevronDown size={18} /> : <ChevronRight size={18} />} <BookOpen size={18} /> Livro-caixa
        </button>
        {log && <TradeLog rows={log} />}
      </section>

      <section className="eco-card p-3">
        <button type="button" className="flex w-full items-center gap-2 text-left font-display text-xl text-bone" onClick={() => setLegacy((v) => !v)} aria-expanded={legacy}>
          {legacy ? <ChevronDown size={18} /> : <ChevronRight size={18} />} Lojas sem NPC e pedidos de compra
        </button>
        {legacy && <div className="mt-2"><CampaignShopsTab campaignId={campaignId} isMaster characters={characters} /></div>}
      </section>

      {picker && <MapPicker scene={picker.scene || scene} mode={picker.mode} title={picker.title} marks={picker.marks || []} areas={sceneInfo?.priceAreas || []} onClose={() => setPicker(null)} onDone={(r) => { setPicker(null); picker.onDone(r); }} />}
    </div>
  );
}

function TradeLog({ rows }) {
  if (!rows.length) return <p className="mt-2 text-sm text-mist">Nada registrado ainda.</p>;
  return (
    <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex gap-2 border-b border-lead/50 pb-1">
          <span className="w-20 shrink-0 text-xs text-mist">{new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          <span className="min-w-0 flex-1"><b className="text-bone">{KIND_LABEL[r.kind] || r.kind}</b> · {r.quantity > 1 ? `${r.quantity}× ` : ''}{r.name}{r.characterName ? ` · ${r.characterName}` : ''}{r.shopName ? ` · ${r.shopName}` : ''}</span>
          {r.total > 0 && <span className={`tabular shrink-0 font-bold ${r.kind === 'venda' ? 'text-[#ff9c8a]' : 'text-[#ffd27a]'}`}>{r.kind === 'venda' ? '−' : '+'}{r.total}</span>}
        </li>
      ))}
    </ul>
  );
}

function MerchantCard({ shop, open, onToggle, base, scene, scenes, run, notify, setPicker, onOpenShop }) {
  const [log, setLog] = useState(null);
  const [addId, setAddId] = useState('');
  const [custom, setCustom] = useState({ name: '', price: '' });
  const total = shop.mults ? cleanMult(shop.mults.campaign) * cleanMult(shop.mults.scene) * cleanMult(shop.mults.area) * cleanMult(shop.mults.merchant) : 1;
  const token = shop.tokens.find((t) => t.sceneId === scene?.id) || shop.tokens[0];
  const tokenScene = scenes.find((s) => s.id === token?.sceneId);
  const wander = token?.wander || { mode: 'parado' };
  const setWander = (w, ok) => run(api.put(`${base}/tokens/${token.id}/wander`, w), ok);
  const patchShop = (b, ok) => run(api.patch(`${base}/shops/${shop.id}`, b), ok);
  const patchItem = (it, b) => run(api.patch(`${base}/items/${it.id}`, b));
  const grouped = useMemo(() => Object.entries(CATEGORIES).map(([cat, c]) => [c.label, CATALOG.filter((it) => it.cat === cat && !shop.items.some((x) => x.catalogId === it.id))]), [shop.items]);
  const cell = scene?.grid_size || 70;
  const tokenCell = token ? { x: Math.round(token.x / cell), y: Math.round(token.y / cell) } : null;
  const onScene = token && token.sceneId === scene?.id;

  return (
    <article className="eco-card">
      <button type="button" className="flex w-full items-center gap-2 p-2 text-left" onClick={onToggle} aria-expanded={open}>
        <span className="grid h-12 w-10 shrink-0 place-items-end justify-center overflow-hidden bg-black/30" aria-hidden="true">
          {shop.npc?.appearance ? <AvatarSprite appearance={shop.npc.appearance} scale={1.5} title={shop.npc.name} /> : <Store size={20} className="self-center text-mist" />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-bone">{shop.npc?.name || shop.name}</b>
          <span className="block truncate text-xs text-mist">{ARCHETYPE_BY_ID[shop.archetype]?.title || shop.category} · {tokenScene?.name || 'fora do mapa'} · {shop.items.length} itens · {formatMult(total)}{!shop.visibleToPlayers ? ' · escondido' : ''}</span>
        </span>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && (
        <div className="space-y-3 border-t-2 border-lead p-2 text-sm">
          <div className="flex flex-wrap gap-1">
            {token && <button type="button" className="btn btn-lit !min-h-8 text-xs" onClick={() => onOpenShop?.(token.id)}><Eye size={14} /> Ver a loja</button>}
            <button type="button" className={`btn !min-h-8 text-xs ${shop.visibleToPlayers ? 'btn-glass' : 'btn-lit'}`} onClick={() => patchShop({ visibleToPlayers: !shop.visibleToPlayers }, shop.visibleToPlayers ? 'Loja escondida dos jogadores.' : 'Loja aberta aos jogadores.')}>{shop.visibleToPlayers ? <><Eye size={14} /> Aberta</> : <><EyeOff size={14} /> Fechada</>}</button>
            {shop.npc && <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => run(api.patch(`${base}/npcs/${shop.npc.id}`, { appearance: merchantAppearance(shop.archetype || 'mercador') }), 'Visual novo.')}><Dice5 size={14} /> Outro visual</button>}
            <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => run(api.post(`${base}/shops/${shop.id}/restock`), 'Estoque reposto.')}><RefreshCw size={14} /> Repor estoque</button>
            <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => window.confirm('Voltar todos os preços deste mercador para a tabela padrão?') && run(api.post(`${base}/shops/${shop.id}/restock`, { prices: true }), 'Preços do catálogo aplicados.')}>Preços do catálogo</button>
            <button type="button" className="btn btn-glass !min-h-8 text-xs" onClick={() => window.confirm(`Apagar ${shop.npc?.name || shop.name} (NPC, token e loja)?`) && run(api.delete(`${base}/shops/${shop.id}`), 'Mercador apagado.')}><Trash2 size={14} /> Apagar</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-mist">Nome do NPC
              <input className="field !mt-1 !px-2 !py-1 text-sm" defaultValue={shop.npc?.name || ''} onBlur={(e) => shop.npc && e.target.value.trim() && e.target.value.trim() !== shop.npc.name && run(api.patch(`${base}/npcs/${shop.npc.id}`, { name: e.target.value.trim() }), 'Nome salvo.')} />
            </label>
            <label className="text-xs text-mist">Nome da loja
              <input className="field !mt-1 !px-2 !py-1 text-sm" defaultValue={shop.name} onBlur={(e) => e.target.value.trim().length >= 2 && e.target.value.trim() !== shop.name && patchShop({ name: e.target.value.trim() }, 'Loja renomeada.')} />
            </label>
          </div>
          <label className="block text-xs text-mist">Fala ao abrir a loja
            <input className="field !mt-1 !px-2 !py-1 text-sm" defaultValue={shop.greeting} maxLength={300} onBlur={(e) => e.target.value !== shop.greeting && patchShop({ greeting: e.target.value })} />
          </label>

          <div>
            <p className="font-bold text-bone">Preço deste mercador <span className="font-normal text-mist">(final hoje {formatMult(total)}{shop.mults?.areaName ? `, na área ${shop.mults.areaName}` : ''})</span></p>
            <MultPicker label="Multiplicador do mercador" value={shop.priceMult} onChange={(m) => patchShop({ priceMult: m }, `${shop.npc?.name || shop.name}: ${formatMult(m)}.`)} />
          </div>

          <div>
            <p className="font-bold text-bone">Compra dos jogadores</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`btn !min-h-8 text-xs ${shop.buys ? 'btn-lit' : 'btn-glass'}`} aria-pressed={shop.buys} onClick={() => patchShop({ buys: !shop.buys })}>{shop.buys ? 'Compra itens' : 'Não compra'}</button>
              {shop.buys && (
                <label className="flex items-center gap-1 text-xs text-mist">paga
                  <select className="field !mt-0 !w-auto !px-1.5 !py-0.5 text-sm" value={shop.buyRate} onChange={(e) => patchShop({ buyRate: Number(e.target.value) })}>
                    {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1].map((r) => <option key={r} value={r}>{Math.round(r * 100)}%</option>)}
                  </select> do preço base
                </label>
              )}
            </div>
            {shop.buys && (
              <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Categorias que ele compra">
                {Object.entries(CATEGORIES).map(([cat, c]) => {
                  const on = shop.buyCategories.includes(cat);
                  return <button key={cat} type="button" className={`eco-mult !min-w-0 text-xs ${on ? 'is-on' : 'text-mist'}`} aria-pressed={on} onClick={() => patchShop({ buyCategories: on ? shop.buyCategories.filter((x) => x !== cat) : [...shop.buyCategories, cat] })}>{c.label}</button>;
                })}
                <span className="w-full text-xs text-mist">{shop.buyCategories.length ? 'Só compra o que está marcado.' : 'Nada marcado = compra de tudo.'}</span>
              </div>
            )}
          </div>

          {token && (
            <div>
              <p className="font-bold text-bone">Movimento do NPC</p>
              {!onScene && <p className="text-xs text-mist">Ele está em {tokenScene?.name}: abra essa cena para desenhar no mapa.</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                <button type="button" className={`btn !min-h-8 text-xs ${wander.mode === 'parado' ? 'btn-lit' : 'btn-glass'}`} onClick={() => setWander({ mode: 'parado' }, 'Fica parado.')}>Parado</button>
                <button type="button" disabled={!onScene} className={`btn !min-h-8 text-xs ${wander.mode === 'area' && wander.area?.type === 'rect' ? 'btn-lit' : 'btn-glass'}`} onClick={() => setPicker({ mode: 'rect', title: `Área onde ${shop.npc?.name || 'o NPC'} anda`, marks: tokenCell ? [{ id: 'npc', ...tokenCell, name: shop.npc?.name }] : [], onDone: (r) => setWander({ mode: 'area', area: r, speed: wander.speed }, 'Anda na área.') })}>Área (retângulo)</button>
                <button type="button" disabled={!onScene || !scene?.tiles?.buildings?.length} className="btn btn-glass !min-h-8 text-xs" onClick={() => setPicker({ mode: 'building', title: 'Anda na frente de qual construção?', marks: tokenCell ? [{ id: 'npc', ...tokenCell, name: shop.npc?.name }] : [], onDone: (r) => setWander({ mode: 'area', area: r, speed: wander.speed }, `Anda na frente de ${r.name || 'a construção'}.`) })}>Esta construção</button>
                <button type="button" disabled={!onScene} className={`btn !min-h-8 text-xs ${wander.area?.type === 'poly' ? 'btn-lit' : 'btn-glass'}`} onClick={() => setPicker({ mode: 'poly', title: 'Praça / área livre (polígono)', marks: tokenCell ? [{ id: 'npc', ...tokenCell, name: shop.npc?.name }] : [], onDone: (r) => setWander({ mode: 'area', area: r, speed: wander.speed }, 'Anda na área.') })}>Polígono</button>
                <button type="button" disabled={!onScene} className={`btn !min-h-8 text-xs ${wander.mode === 'rota' ? 'btn-lit' : 'btn-glass'}`} onClick={() => setPicker({ mode: 'route', title: 'Rota (pontos em ordem)', marks: tokenCell ? [{ id: 'npc', ...tokenCell, name: shop.npc?.name }] : [], onDone: (r) => setWander({ mode: 'rota', route: r.points, loop: window.confirm('Fechar o circuito? (Cancelar = vai e volta)'), speed: wander.speed }, 'Segue a rota.') })}><Route size={14} /> Rota</button>
              </div>
              {wander.mode !== 'parado' && (
                <label className="mt-1 flex items-center gap-2 text-xs text-mist">Velocidade
                  <select className="field !mt-0 !w-auto !px-1.5 !py-0.5 text-sm" value={wander.speed || 1.2} onChange={(e) => setWander({ ...wander, speed: Number(e.target.value) })}>
                    {[[0.6, 'devagar'], [1.2, 'normal'], [2, 'apressado']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          <div>
            <p className="font-bold text-bone">Estoque e preços</p>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[380px] text-xs">
                <thead><tr className="text-left text-mist"><th className="py-1">Item</th><th>Base</th><th>Final</th><th>Aluguel/dia</th><th>Estoque</th><th /></tr></thead>
                <tbody>
                  {shop.items.map((it) => (
                    <tr key={it.id} className={`border-t border-lead/60 ${it.available ? '' : 'opacity-50'}`}>
                      <td className="py-1"><span className="flex items-center gap-1.5"><ItemIcon item={{ name: it.name, category: CATEGORIES[it.category]?.label, icon: it.icon }} size={16} /><span className="max-w-[7.5rem] truncate text-bone" title={it.description}>{it.name}</span></span></td>
                      <td>{it.rentOnly ? <span className="text-mist">—</span> : <input key={`b${it.base}`} className="field !mt-0 !w-14 !px-1 !py-0.5 text-xs" type="number" min="0" defaultValue={it.base} aria-label={`Preço base de ${it.name}`} onBlur={(e) => Number(e.target.value) !== it.base && patchItem(it, { priceDracmas: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />}</td>
                      <td className="tabular font-bold text-[#ffd27a]">{it.rentOnly ? '—' : finalPrice(it.base, shop.mults)}</td>
                      <td><input key={`r${it.rentBase}`} className="field !mt-0 !w-12 !px-1 !py-0.5 text-xs" type="number" min="0" defaultValue={it.rentBase || ''} placeholder="—" aria-label={`Aluguel por dia de ${it.name}`} onBlur={(e) => (Number(e.target.value) || null) !== (it.rentBase || null) && patchItem(it, { rentPerDay: Math.max(0, Math.floor(Number(e.target.value) || 0)) || null })} /></td>
                      <td>
                        {it.unlimited
                          ? <button type="button" className="eco-mult !min-w-0 text-xs text-bone" title="Sem limite (clique para limitar)" onClick={() => patchItem(it, { unlimited: false, stock: 5, baseStock: 5 })}>∞</button>
                          : <input key={`s${it.stock}`} className="field !mt-0 !w-11 !px-1 !py-0.5 text-xs" type="number" min="0" defaultValue={it.stock} aria-label={`Estoque de ${it.name}`} onBlur={(e) => Number(e.target.value) !== it.stock && patchItem(it, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)), baseStock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />}
                      </td>
                      <td className="whitespace-nowrap">
                        <button type="button" className="btn btn-glass !min-h-6 !w-6 !p-0" title={it.available ? 'Tirar da vitrine' : 'Voltar à vitrine'} aria-label={it.available ? `Esconder ${it.name}` : `Mostrar ${it.name}`} onClick={() => patchItem(it, { available: !it.available })}>{it.available ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                        <button type="button" className="btn btn-glass ml-1 !min-h-6 !w-6 !p-0" aria-label={`Remover ${it.name}`} onClick={() => run(api.delete(`${base}/items/${it.id}`))}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <select className="field !mt-0 !max-w-[14rem] !px-1.5 !py-1 text-xs" value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Item do catálogo">
                <option value="">Adicionar do catálogo…</option>
                {grouped.map(([label, list]) => list.length > 0 && <optgroup key={label} label={label}>{list.map((it) => <option key={it.id} value={it.id}>{it.name} — {it.price}{it.rent ? ` (aluga ${it.rent}/dia)` : ''}</option>)}</optgroup>)}
              </select>
              <button type="button" className="btn btn-glass !min-h-8 text-xs" disabled={!addId} onClick={() => run(api.post(`${base}/shops/${shop.id}/items`, { catalogId: addId }), 'Item adicionado.').then(() => setAddId(''))}><Plus size={13} /> Adicionar</button>
            </div>
            <form className="mt-1 flex flex-wrap items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (!custom.name.trim()) return; run(api.post(`${base}/shops/${shop.id}/items`, { name: custom.name.trim(), priceDracmas: Math.max(0, Math.floor(Number(custom.price) || 0)), stock: 1 }), 'Item próprio adicionado.').then(() => setCustom({ name: '', price: '' })); }}>
              <input className="field !mt-0 !w-40 !px-1.5 !py-1 text-xs" placeholder="Item próprio (nome)" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} />
              <input className="field !mt-0 !w-20 !px-1.5 !py-1 text-xs" type="number" min="0" placeholder="preço" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} />
              <button type="submit" className="btn btn-glass !min-h-8 text-xs"><Plus size={13} /> Criar</button>
            </form>
          </div>

          <div>
            <button type="button" className="flex items-center gap-1 font-bold text-bone" onClick={() => (log ? setLog(null) : api.get(`${base}/log`, { params: { shopId: shop.id } }).then(({ data }) => setLog(data)).catch(() => notify?.('Não deu para abrir o livro-caixa.', 'error')))} aria-expanded={Boolean(log)}>
              {log ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Vendas deste mercador
            </button>
            {log && <TradeLog rows={log} />}
          </div>
        </div>
      )}
    </article>
  );
}
