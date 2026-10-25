import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import Button from '../components/Button';
import RoseWindow from '../components/glass/RoseWindow';
import GlassD20 from '../components/glass/GlassD20';
import Crack from '../components/glass/Crack';
import { PRIMORDIAIS } from '../components/glass/primordiais';
import { api } from '../lib/api';
import { useAuth } from '../store/authStore';

// Capitulos do livro de regras 0.5 Beta, na ordem do livro.
const CHAPTERS = [
  ['bem-vindo-a-lugubre', 'Bem-vindo a Lúgubre', 'O que é, como jogar e como usar o livro.'],
  ['o-mundo-de-lugubre', 'O Mundo de Lúgubre', 'Os Oito Primordiais, a Ruptura, os Oito Reinos e a O.P.E.R.A.'],
  ['criacao-de-personagem', 'Criação de Personagem', 'Atributos, Vida, Sanidade, Mana, perícias, raças e origens.'],
  ['regras-do-sistema', 'Regras do Sistema', 'Dados e testes, ataques e crítico, Defesa e Esquiva, combate.'],
  ['magias-e-poderes', 'Magias e Poderes', 'Os oito elementos e o custo de cada feitiço.'],
  ['equipamentos', 'Equipamentos', 'Armas, armaduras, inventário e moedas.'],
  ['criaturas', 'Criaturas', 'O bestiário inicial, por elemento e dificuldade.'],
  ['guia-do-mestre', 'Guia do Mestre', 'Como conduzir a mesa e decidir o que o dado não decide.'],
  ['referencia-e-desenvolvimento', 'Referência e Desenvolvimento', 'Tabelas rápidas e o que ainda está em teste no beta.']
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/developer-posts').then(({ data }) => setPosts(Array.isArray(data) ? data : [])).catch(() => setPosts([]));
  }, []);

  return (
    <main className="overflow-hidden">
      <Hero />
      <div className="lead-rule" />
      <Nave />
      <div className="lead-rule" />
      <Livro />
      {posts.length > 0 && (
        <>
          <div className="lead-rule" />
          <Diario posts={posts} />
        </>
      )}
      <div className="lead-rule" />
      <Fechamento />
      <Rodape />
    </main>
  );
}

function Hero() {
  const [active, setActive] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const p = active != null ? PRIMORDIAIS[active] : null;
  const ctaTo = user ? '/characters/new' : '/register';

  return (
    <section className="relative isolate overflow-hidden px-4 pb-16 pt-5 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative mx-auto w-full max-w-[min(60svh,600px)]">
          <RoseWindow active={active} onActive={setActive} onSelect={(item) => navigate(`/regras/${item.slug}`)} className="relative w-full">
            <span className="font-display text-[clamp(1rem,3.4vw,2.6rem)] leading-none text-bone drop-shadow-[0_2px_10px_rgba(0,0,0,.9)]">Lúgubre</span>
            <Link to={ctaTo} className="pointer-events-auto mt-[9%] hidden sm:block"><Button className="!px-5 !py-3 text-base">Criar ficha</Button></Link>
          </RoseWindow>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3 sm:hidden">
          <Link to={ctaTo} className="flex-1"><Button className="w-full !py-3 text-base">Criar minha ficha</Button></Link>
          <Link to="/regras"><Button variant="ghost" className="!py-3">Ler o livro</Button></Link>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <h1 className="font-display text-5xl leading-[.95] text-bone xl:text-6xl">
            Oito Primordiais. Uma mesa.<br /><span className="text-ember">Nenhuma ferida esquecida.</span>
          </h1>
          <div>
            <p className="max-w-md text-lg text-mist">
              O RPG dark fantasy Lúgubre inteiro no navegador: fichas que guardam cada ferida, campanhas com
              mesa virtual e dados, e o livro de regras 0.5 Beta para consultar no meio da sessão.
            </p>
            <div className="mt-5 min-h-[4.5rem] border-t-[3px] border-lead pt-3" aria-live="polite">
              {p ? (
                <p className="text-mist">
                  <span className="font-display text-2xl" style={{ color: `color-mix(in srgb, ${p.hex} 40%, #f4ecd8)` }}>{p.name}</span>
                  <span className="mx-2 text-lead">·</span>{p.domain}{' '}
                  <Link to={`/regras/${p.slug}`} className="inline-flex items-center gap-1 font-bold text-ember underline decoration-2 underline-offset-4 hover:text-bone">
                    Ler no livro <ArrowRight size={15} />
                  </Link>
                </p>
              ) : (
                <p className="text-mist">Passe a luz pelo vitral: cada vidro é um Primordial e abre o capítulo dele no livro.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* A nave: tres lancetas mostram o sistema funcionando (exemplos, nao dados reais). */
function Nave() {
  return (
    <section className="relative px-4 py-20 sm:py-28" aria-labelledby="nave-title">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 id="nave-title" className="font-display text-5xl leading-none text-bone sm:text-6xl">A mesa inteira,<br />sem sair da página.</h2>
          <p className="max-w-xl text-lg text-mist lg:justify-self-end">
            Mexa nos vidros abaixo: é assim que a ficha, o dado e o mapa se comportam numa sessão de verdade.
            O mestre guarda o segredo; os jogadores veem o efeito.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <Lanceta title="Ficha viva" caption="Atributos começam em 2. Esquiva = 15 − Agilidade. Cada ajuste fica salvo para a próxima sessão.">
            <FichaDemo />
          </Lanceta>
          <Lanceta title="Dado de vidro" caption="Teste = 1d20 + atributo + treino. O mestre decide se acertou e quanto doeu; ninguém vê a vida do monstro." tall>
            <DadoDemo />
          </Lanceta>
          <Lanceta title="Mesa virtual" caption="Mapa em pixel art (feito à mão ou por IA) ou imagem sua. Movimento livre, com WASD ou arrastando.">
            <MesaDemo />
          </Lanceta>
        </div>
        <p className="mt-6 text-sm text-mist">Exemplos ilustrativos. A sua mesa usa as suas fichas.</p>
      </div>
    </section>
  );
}

function Lanceta({ title, caption, children, tall }) {
  return (
    <article className={`lanceta gothic-panel relative flex flex-col ${tall ? 'lg:-mt-10' : ''}`}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 w-full">
        <path d="M0,40 Q0,9 50,0 Q100,9 100,40" fill="none" stroke="var(--color-lead)" strokeWidth="8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="lanceta-glass relative grid min-h-[300px] place-items-center px-5 pb-6 pt-20">{children}</div>
      <div className="border-t-[3px] border-lead px-5 py-5">
        <h3 className="font-display text-3xl text-bone">{title}</h3>
        <p className="mt-2 text-mist">{caption}</p>
      </div>
    </article>
  );
}

function FichaDemo() {
  const attrs = [['Força', 2], ['Agilidade', 4], ['Presença', 2], ['Intelecto', 3], ['Vigor', 2]];
  const [vida, setVida] = useState(41);
  const max = 63;
  return (
    <div className="w-full max-w-xs">
      <p className="font-display text-2xl text-bone">Kael Vorn</p>
      <p className="text-sm text-mist">Elfo Negro · Alquimista · nível 3</p>
      <dl className="mt-4 grid grid-cols-5 gap-1 text-center">
        {attrs.map(([name, value]) => (
          <div key={name} className="border-2 border-lead bg-black/40 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-mist">{name.slice(0, 3)}</dt>
            <dd className="font-display text-2xl text-bone tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-mist">Esquiva</span>
        <span className="tabular text-bone">15 − 4 = <strong className="text-ember">11</strong></span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-mist">Vida</span>
          <span className="tabular text-bone">{vida} / {max}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" className="btn btn-glass !min-h-9 !px-2" aria-label="Tirar 1 de vida" onClick={() => setVida((v) => Math.max(0, v - 1))}><Minus size={16} /></button>
          <div className="relative h-4 flex-1 border-2 border-lead bg-black/60">
            <div className="h-full bg-[#7a1630] transition-[width] duration-500" style={{ width: `${(vida / max) * 100}%`, boxShadow: 'inset 0 0 10px rgba(255,180,180,.35)' }} />
            {vida < max && (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute -top-[6px] h-7 w-7" style={{ left: `calc(${(vida / max) * 100}% - 14px)` }}>
                <path d="M12,0 L9,8 L14,12 L10,24" fill="none" stroke="var(--color-abyss)" strokeWidth="4" />
                <path d="M12,0 L9,8 L14,12 L10,24 M14,12 L20,15" fill="none" stroke="#f4ecd8" strokeOpacity=".85" strokeWidth="1.4" />
              </svg>
            )}
          </div>
          <button type="button" className="btn btn-glass !min-h-9 !px-2" aria-label="Curar 1 de vida" onClick={() => setVida((v) => Math.min(max, v + 1))}><Plus size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function DadoDemo() {
  const [rolling, setRolling] = useState(false);
  const [value, setValue] = useState(null);
  const [hit, setHit] = useState(1);
  const timeout = useRef();
  useEffect(() => () => clearTimeout(timeout.current), []);

  function roll() {
    setRolling(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      const d = 1 + Math.floor(Math.random() * 20);
      setValue(d);
      setRolling(false);
      if (d >= 8) timeout.current = setTimeout(() => setHit((n) => n + 1), 500);
    }, 1100);
  }

  const total = value != null ? value + 4 + 5 : null;
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex items-center gap-6">
        <GlassD20 value={value} rolling={rolling} onClick={roll} disabled={rolling} size={118} label="Rolar ataque de Kael" />
        <figure className="flex flex-col items-center gap-1.5">
          <div key={hit} className={`relative h-24 w-24 overflow-hidden rounded-full border-4 border-lead bg-[radial-gradient(circle_at_35%_30%,#6b5596,#3a2a5e_60%,#000)] ${hit > 1 ? 'hit-shake' : ''}`}>
            <Crack on={hit > 0} seed={hit} />
          </div>
          <figcaption className="font-display text-lg text-bone">Orc</figcaption>
        </figure>
      </div>
      <p className="min-h-[3rem] text-center text-sm text-mist" aria-live="polite">
        {rolling && 'Rolando…'}
        {!rolling && value == null && 'Toque no d20 para atacar o Orc.'}
        {!rolling && value != null && (
          <>
            <span className="tabular text-bone">d20 {value} + Agilidade 4 + treino 5 = <strong className="text-ember">{total}</strong></span>
            <br />
            {value >= 8 ? 'O Orc tomou dano.' : 'O mestre disse que errou.'}
          </>
        )}
      </p>
    </div>
  );
}

function MesaDemo() {
  const boardRef = useRef(null);
  const [tokens, setTokens] = useState([
    { id: 'kael', label: 'K', name: 'Kael', x: 0.18, y: 0.55, color: '#a4781a' },
    { id: 'lys', label: 'L', name: 'Lys', x: 0.32, y: 0.72, color: '#2a7c86' },
    { id: 'gorak', label: 'O', name: 'Orc', x: 0.74, y: 0.22, color: '#7a1630' }
  ]);
  const drag = useRef(null);

  return (
    <div
      ref={boardRef}
      className="mesa-demo relative aspect-[7/6] w-full max-w-xs touch-none border-4 border-lead"
      onPointerMove={(event) => {
        if (!drag.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const x = Math.max(0.08, Math.min(0.92, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0.08, Math.min(0.92, (event.clientY - rect.top) / rect.height));
        setTokens((list) => list.map((t) => (t.id === drag.current ? { ...t, x, y } : t)));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
    >
      {tokens.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-label={`Token ${t.name}`}
          onPointerDown={(event) => { event.currentTarget.releasePointerCapture?.(event.pointerId); drag.current = t.id; }}
          className="absolute grid h-[16%] w-[14%] -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-[3px] border-lead font-display text-xl text-bone active:cursor-grabbing"
          style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${t.color} 60%, #fff), ${t.color} 60%, #000)` }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Livro() {
  return (
    <section className="px-4 py-20 sm:py-28" aria-labelledby="livro-title">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="livro-title" className="font-display text-5xl leading-none text-bone sm:text-6xl">O livro está no site.</h2>
          <p className="mt-5 max-w-md text-lg text-mist">
            O Livro de Regras 0.5 Beta inteiro, organizado e pesquisável. Quando o livro muda, o site muda junto:
            as regras ficam guardadas no banco, não presas no código.
          </p>
          <Link to="/regras" className="mt-8 inline-block"><Button className="px-6">Abrir o livro <ArrowRight size={18} /></Button></Link>
        </div>
        <ol className="border-t-[3px] border-lead">
          {CHAPTERS.map(([slug, title, desc], i) => (
            <li key={slug} className="border-b-[3px] border-lead">
              <Link to={`/regras/${slug}`} className="chapter-row group grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 py-5 pr-2">
                <span className="font-display text-2xl text-ember/70 transition-colors group-hover:text-ember">{ROMAN[i]}</span>
                <span>
                  <span className="block font-display text-3xl text-bone">{title}</span>
                  <span className="mt-1 block text-mist">{desc}</span>
                </span>
                <ArrowRight className="text-mist transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ember" size={20} />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Diario({ posts }) {
  return (
    <section className="px-4 py-20 sm:py-24" aria-labelledby="diario-title">
      <div className="mx-auto max-w-7xl">
        <h2 id="diario-title" className="font-display text-5xl leading-none text-bone">Diário do desenvolvedor</h2>
        <p className="mt-4 max-w-xl text-lg text-mist">O sistema está em beta. Aqui fica o que nasceu, o que foi refinado e o que ainda espreita no caminho.</p>
        <ul className="mt-10 border-t-[3px] border-lead">
          {posts.slice(0, 6).map((post) => (
            <li key={post.id} className="grid gap-2 border-b-[3px] border-lead py-6 sm:grid-cols-[16rem_1fr] sm:gap-6">
              <p className="text-mist"><time dateTime={post.published_at}>{formatDate(post.published_at)}</time> · {post.category || 'Atualização'}</p>
              <div>
                <h3 className="font-display text-2xl text-bone">{post.title}</h3>
                {post.short_description && <p className="mt-1 max-w-2xl text-mist">{post.short_description}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Fechamento() {
  const { user } = useAuth();
  return (
    <section className="relative isolate overflow-hidden px-4 py-24 text-center sm:py-32">
      <h2 className="font-display text-5xl leading-none text-bone sm:text-7xl">O grimório está aberto.</h2>
      <p className="mx-auto mt-5 max-w-lg text-lg text-mist">Crie sua próxima ficha ou reúna sua mesa antes que a névoa feche o caminho.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        {user ? (
          <Link to="/dashboard"><Button className="px-6">Ir para o painel</Button></Link>
        ) : (
          <>
            <Link to="/register"><Button className="px-6">Criar conta</Button></Link>
            <Link to="/login"><Button variant="ghost">Já tenho conta</Button></Link>
          </>
        )}
      </div>
    </section>
  );
}

function Rodape() {
  const links = [
    ['Livro de regras', '/regras'],
    ['Biblioteca', '/powers'],
    ['Feedback', '/feedback'],
    ['GitHub', 'https://github.com/andreulbrich2012-maker/lugubre-rpg']
  ];
  return (
    <footer className="border-t-[6px] border-lead bg-black/50 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-3xl text-ember">Lúgubre RPG</p>
          <p className="mt-1 text-sm text-mist">Livro de regras 0.5 Beta · 2026</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Rodapé">
          {links.map(([label, href]) => (href.startsWith('http')
            ? <a key={label} href={href} className="text-mist hover:text-bone">{label}</a>
            : <Link key={label} to={href} className="text-mist hover:text-bone">{label}</Link>))}
        </nav>
      </div>
    </footer>
  );
}
