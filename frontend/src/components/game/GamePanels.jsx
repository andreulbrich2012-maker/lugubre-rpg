import { useMemo, useState } from 'react';
import { Coins, Map as MapIcon, Search, Shield, Sparkles, Swords } from 'lucide-react';
import AvatarSprite from '../avatar/AvatarSprite';
import ItemIcon from '../icons/ItemIcon';
import GameBars from './GameBars';
import { formatKg, itemLoad } from '../../lib/itemWeight';
import { skillBonus } from '../campaigns/room/rolls';

// Paineis do lado direito do modo jogo (Personagem, Pericias, Mapas, Ajuda).

const ATTRS = [['forca', 'FOR', 'Força'], ['agilidade', 'AGI', 'Agilidade'], ['intelecto', 'INT', 'Intelecto'], ['presenca', 'PRE', 'Presença'], ['vigor', 'VIG', 'Vigor']];
const ATTR_SHORT = Object.fromEntries(ATTRS.map(([k, s]) => [k, s]));
const COINS = [['platinum', 'Platina'], ['gold', 'Ouro'], ['silver', 'Prata'], ['bronze', 'Bronze']];

function Section({ title, children, aside }) {
  return (
    <section className="mt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2"><span className="game-ribbon">{title}</span>{aside}</div>
      {children}
    </section>
  );
}

function Meter({ label, value, max, pct }) {
  return (
    <div className="game-inset px-2 py-1">
      <p className="flex justify-between text-xs"><span className="text-[#e8c98e]">{label}</span><span className={`tabular font-bold ${pct > 1 ? 'text-[#ff8a7a]' : 'text-[#fff1d0]'}`}>{value}<span className="text-[#c9a979]"> / {max}</span></span></p>
      <div className="game-bar mt-1 h-2" style={{ '--fill': pct > 0.9 ? '#d8443f' : 'linear-gradient(90deg,#c48a3a,#e7b765)' }}><i style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
    </div>
  );
}

export function CharacterPanel({ sheet, summary, onOpenMap }) {
  const inv = Array.isArray(sheet.inventory) ? sheet.inventory : [];
  const wallet = sheet.wallet || {};
  const powers = [...(sheet.attacks || []).map((p) => ({ ...p, type: 'attacks' })), ...(sheet.spells || []).map((p) => ({ ...p, type: 'spells' }))];
  return (
    <div>
      <div className="flex gap-3">
        <div className="game-parchment grid h-32 w-24 shrink-0 place-items-end justify-center overflow-hidden pb-1">
          {sheet.appearance
            ? <AvatarSprite appearance={sheet.appearance} scale={3} title={`Aparência de ${sheet.character_name}`} />
            : sheet.photo ? <img src={sheet.photo} alt="" className="h-full w-full object-cover" /> : <span className="game-title self-center text-5xl">{sheet.character_name?.[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="game-title truncate text-3xl leading-none">{sheet.character_name}</p>
          <p className="mt-1 text-sm text-[#e8c98e]">{[sheet.race_name, sheet.class_name].filter(Boolean).join(' · ') || 'Aventureiro'}</p>
          <p className="text-xs text-[#c9a979]">{sheet.origin_name || sheet.origin || 'Origem desconhecida'} · nível <span className="tabular font-bold text-[#fff1d0]">{sheet.level ?? 1}</span></p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            <span className="game-inset flex items-center gap-1 px-1.5 py-1"><Shield size={13} className="text-[#e8c98e]" /> Defesa <b className="tabular ml-auto text-[#fff1d0]">{sheet.total_defense ?? sheet.defense ?? '—'}</b></span>
            <span className="game-inset flex items-center gap-1 px-1.5 py-1">Esquiva <b className="tabular ml-auto text-[#fff1d0]">{sheet.dodge ?? '—'}</b></span>
          </div>
        </div>
      </div>

      <div className="mt-3"><GameBars sheet={sheet} /></div>
      <p className="mt-1 text-[11px] text-[#c9a979]">Vida, mana e sanidade são controladas pelo mestre.</p>

      <Section title="Atributos">
        <div className="grid grid-cols-5 gap-1">
          {ATTRS.map(([k, s, name]) => (
            <div key={k} className="game-parchment py-1 text-center" title={name}>
              <p className="text-[10px] font-extrabold tracking-wider">{s}</p>
              <p className="tabular text-xl font-black leading-none">{sheet.attributes?.[k] ?? 0}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Dinheiro" aside={<span className="flex items-center gap-1 text-xs font-bold text-[#ffd27a]"><Coins size={13} /> {sheet.wallet_total_dracmas ?? 0} dracmas</span>}>
        <div className="grid grid-cols-4 gap-1 text-center text-xs">
          {COINS.map(([k, label]) => <div key={k} className="game-inset py-1"><p className="text-[#c9a979]">{label}</p><p className="tabular font-bold text-[#fff1d0]">{Number(wallet[k] || 0)}</p></div>)}
        </div>
      </Section>

      <Section title="Inventário" aside={<span className="text-xs text-[#c9a979]">{summary.level.label} · {Math.round(summary.speed * 100)}% de velocidade</span>}>
        <div className="grid grid-cols-2 gap-1.5">
          <Meter label="Peso" value={formatKg(summary.weight)} max={formatKg(summary.maxWeight)} pct={summary.maxWeight ? summary.weight / summary.maxWeight : 0} />
          <Meter label="Itens" value={summary.count} max={summary.maxItems} pct={summary.maxItems ? summary.count / summary.maxItems : 0} />
        </div>
        <ul className="mt-1.5 space-y-1">
          {inv.map((it, i) => (
            <li key={it.id || i} className="game-inset flex items-center gap-2 px-1.5 py-1 text-sm">
              <ItemIcon item={it} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#fff1d0]">{Number(it.quantity ?? 1) > 1 ? `${it.quantity}× ` : ''}{it.name}</p>
                <p className="truncate text-[11px] text-[#c9a979]">{formatKg(itemLoad(it))}{it.contents?.length ? ` · ${it.contents.length} dentro` : ''}{it.category ? ` · ${it.category}` : ''}</p>
              </div>
              {it.mapSceneId && <button type="button" className="btn btn-glass !min-h-8 !px-2 text-xs" onClick={() => onOpenMap(it)}><MapIcon size={13} /> Abrir</button>}
            </li>
          ))}
          {!inv.length && <li className="game-inset px-2 py-2 text-sm text-[#c9a979]">Mochila vazia.</li>}
        </ul>
      </Section>

      <Section title="Ataques e magias">
        <ul className="space-y-1">
          {powers.map((p, i) => (
            <li key={`${p.type}-${p.id || p.name}-${i}`} className="game-inset flex items-center gap-2 px-2 py-1.5 text-sm">
              {p.type === 'spells' ? <Sparkles size={15} className="text-[#9cc4ff]" /> : <Swords size={15} className="text-[#ffb08a]" />}
              <span className="min-w-0 flex-1 truncate font-semibold text-[#fff1d0]">{p.name}</span>
              <span className="tabular shrink-0 text-xs text-[#e8c98e]">{p.damage ? `dano ${p.damage}` : ''}{p.manaCost ? ` · ${p.manaCost} mana` : ''}</span>
            </li>
          ))}
          {!powers.length && <li className="game-inset px-2 py-2 text-sm text-[#c9a979]">Nenhum ataque ou magia na ficha.</li>}
        </ul>
      </Section>
      {sheet.conditions?.length > 0 && (
        <Section title="Condições">
          <p className="text-sm text-[#fff1d0]">{sheet.conditions.map((c) => c.name || c).join(', ')}</p>
        </Section>
      )}
    </div>
  );
}

export function SkillsPanel({ sheet, onRollSkill, disabled, reason }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return (sheet.skills_catalog || [])
      .map((s) => ({ ...s, ...skillBonus(sheet, s.key), trained: Number(sheet.skills?.[s.key] || 0) > 0 }))
      .filter((s) => !q || norm(s.name).includes(norm(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [sheet, q]);
  return (
    <div>
      <p className="text-sm text-[#e8c98e]">Clique numa perícia para testar (d20 + bônus). O resultado vai para o mestre e para o chat.</p>
      {reason && <p className="game-parchment mt-2 px-2 py-1 text-sm font-semibold">{reason}</p>}
      <label className="relative mt-2 block">
        <span className="sr-only">Buscar perícia</span>
        <Search size={15} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mist" />
        <input className="field !mt-0 !pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar perícia…" />
      </label>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {list.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRollSkill(s)}
              className={`game-inset flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition hover:brightness-125 disabled:opacity-50 ${s.trained ? 'outline outline-1 outline-[#c48a3a]' : ''}`}
              title={`Rolar ${s.name}: 1d20${s.bonus >= 0 ? '+' : ''}${s.bonus}`}
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-[#fff1d0]">{s.name}</span>
              <span className="text-[10px] font-bold text-[#c9a979]">{ATTR_SHORT[s.attribute] || ''}</span>
              <span className={`tabular w-9 shrink-0 text-right font-black ${s.trained ? 'text-[#ffd27a]' : 'text-[#e8c98e]'}`}>{s.bonus >= 0 ? '+' : ''}{s.bonus}</span>
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="mt-2 text-sm text-[#c9a979]">Nenhuma perícia encontrada.</p>}
    </div>
  );
}

export function MapsPanel({ maps, onOpenMap }) {
  return (
    <div>
      <p className="text-sm text-[#e8c98e]">Mapas que você carrega. Abra para ver o lugar inteiro e os pontos marcados.</p>
      <ul className="mt-2 space-y-1.5">
        {maps.map((m, i) => (
          <li key={m.id || i}>
            <button type="button" className="game-inset flex w-full items-center gap-2 px-2 py-2 text-left hover:brightness-125" onClick={() => onOpenMap(m)}>
              <ItemIcon item={m} size={32} />
              <span className="min-w-0 flex-1 truncate font-semibold text-[#fff1d0]">{m.name}</span>
              <MapIcon size={16} className="text-[#ffd27a]" />
            </button>
          </li>
        ))}
      </ul>
      {!maps.length && <p className="game-inset mt-2 px-2 py-2 text-sm text-[#c9a979]">Você ainda não tem nenhum mapa. Procure por pergaminhos e cartas no mundo.</p>}
    </div>
  );
}

const KEYS = [
  ['W A S D', 'andar (ou setas)'],
  ['E', 'interagir: pegar itens, abrir portas'],
  ['1 – 9', 'escolher um item da barra'],
  ['C', 'personagem'],
  ['P', 'perícias'],
  ['R', 'rolar dados'],
  ['M', 'mapas'],
  ['T', 'chat'],
  ['Esc', 'fecha o painel / sai do modo jogo']
];

export function HelpPanel() {
  return (
    <div>
      <ul className="space-y-1">
        {KEYS.map(([k, what]) => (
          <li key={k} className="game-inset flex items-center gap-3 px-2 py-1.5 text-sm">
            <kbd className="game-parchment min-w-[4.5rem] px-1.5 py-0.5 text-center text-xs font-black">{k}</kbd>
            <span className="text-[#fff1d0]">{what}</span>
          </li>
        ))}
      </ul>
      <div className="game-parchment mt-3 px-2.5 py-2 text-sm leading-snug">
        <p><b>Vida, mana e sanidade</b> só mudam pelas mãos do mestre.</p>
        <p className="mt-1"><b>Peso:</b> acima da metade da carga você anda mais devagar; no limite não dá para pegar mais nada.</p>
        <p className="mt-1"><b>Em combate</b> perícias e ataques gastam a ação do turno.</p>
      </div>
    </div>
  );
}
