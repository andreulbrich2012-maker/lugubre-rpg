import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Crown,
  MessageSquareText,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wand2,
  Warehouse
} from 'lucide-react';
import Button from '../components/Button';
import { api } from '../lib/api';

const lugubreImages = {
  hero: '/images/lugubre/lugubre-hero.png',
  portal: '/images/lugubre/lugubre-portal.jpg',
  mountains: '/images/lugubre/lugubre-mountains.jpg',
  throne: '/images/lugubre/lugubre-throne.jpg',
  forest: '/images/lugubre/lugubre-moonlit-forest.jpg'
};

const diaryFallbackImages = [lugubreImages.forest, lugubreImages.mountains];

const features = [
  [ScrollText, 'Criador de Personagens', 'Monte fichas com raças, classes, origens, atributos, perícias, inventário, poderes e evolução em um único lugar.'],
  [Swords, 'Campanhas Online', 'Crie mesas, convide jogadores, compartilhe fichas e mantenha cada sessão organizada.'],
  [BookOpen, 'Biblioteca Integrada', 'Consulte magias, poderes e elementos sem interromper o ritmo da aventura.'],
  [MessageSquareText, 'Chat em Tempo Real', 'Converse durante a campanha com mensagens persistentes e presença de personagem.'],
  [Warehouse, 'Inventário e Economia', 'Controle itens, peso, defesa, carteira e compras de campanha com clareza.'],
  [Wand2, 'Monstros e Poderes', 'Administre criaturas, ataques, magias e poderes de forma modular e expansível.'],
  [Users, 'Comunidade e Feedback', 'Jogadores podem relatar bugs, sugerir melhorias e acompanhar respostas.'],
  [Shield, 'Painel Administrativo', 'Admins mantêm raças, classes, origens, perícias, monstros e biblioteca vivos.']
];

const highlights = [
  ['Fichas vivas', 'Ajustes de vida, sanidade, mana, perícias e inventário ficam salvos para a próxima sessão.'],
  ['Mesa conectada', 'Campanhas, chat, diário, loja e compartilhamento de ficha trabalham juntos.'],
  ['Sistema em evolução', 'O painel admin permite expandir regras e conteúdo sem reescrever o projeto.']
];

const fallbackPosts = [
  {
    id: 'fallback-feedback',
    title: 'Sistema de Feedback Adicionado',
    short_description: 'Jogadores agora podem enviar sugestões, relatar bugs e acompanhar respostas da administração.',
    image_url: lugubreImages.forest,
    category: 'Sistema',
    published_at: new Date().toISOString()
  },
  {
    id: 'fallback-library',
    title: 'Biblioteca de Magias e Poderes',
    short_description: 'A biblioteca ganhou filtros, elementos e integração com as fichas.',
    image_url: lugubreImages.mountains,
    category: 'Novidade',
    published_at: new Date(Date.now() - 86_400_000).toISOString()
  }
];

function formatDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

export default function Home() {
  const [posts, setPosts] = useState(fallbackPosts);

  useEffect(() => {
    api.get('/developer-posts')
      .then(({ data }) => setPosts(data?.length ? data : fallbackPosts))
      .catch(() => setPosts(fallbackPosts));
  }, []);

  return (
    <main className="overflow-hidden bg-[#05040a]">
      <HeroSection />
      <AboutSection />
      <FeatureSection />
      <DeveloperDiarySection posts={posts} />
      <FinalCallSection />
      <LandingFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[78vh] overflow-hidden px-3 py-16 sm:px-4 sm:py-24 lg:min-h-[720px]">
      <img
        src={lugubreImages.hero}
        alt=""
        aria-hidden="true"
        fetchpriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full scale-[1.04] object-cover object-[60%_center] opacity-95 sm:object-center"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_28%,rgba(134,92,246,.18),transparent_30%),radial-gradient(circle_at_18%_20%,rgba(199,163,91,.10),transparent_24%),linear-gradient(90deg,#05040a_0%,rgba(8,6,18,.82)_46%,rgba(5,4,10,.24)_100%)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_150px_46px_rgba(5,4,10,.38)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#05040a] via-[#05040a]/80 to-transparent" />
      <div className="relative mx-auto flex min-h-[58vh] max-w-7xl items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-ember/25 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[.24em] text-ember">
            <Sparkles size={15} /> Plataforma dark fantasy
          </div>
          <h1 className="mt-6 font-display text-5xl leading-none text-white sm:text-6xl lg:text-8xl">Lúgubre RPG</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mist sm:text-xl">
            Crie personagens, conduza campanhas e escreva histórias onde as sombras também têm voz.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/characters/new"><Button className="w-full px-5 py-3 sm:w-auto">Criar Personagem</Button></Link>
            <Link to="/campaigns"><Button variant="ghost" className="w-full px-5 py-3 sm:w-auto">Entrar em Campanha</Button></Link>
            <a href="#sistema" className="inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-mist transition-colors hover:text-white">Conhecer o Sistema</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="sistema" className="mx-auto max-w-7xl px-3 py-14 sm:px-4 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <figure className="relative aspect-[4/3] overflow-hidden rounded-md border border-ember/20 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,.48)]">
          <img
            src={lugubreImages.portal}
            alt="Portal arcano violeta em ruínas antigas"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05040a]/70 via-transparent to-blood/10" />
          <figcaption className="absolute bottom-4 left-4 right-4 text-xs font-bold uppercase tracking-[.22em] text-ember">
            Um portal para histórias que permanecem
          </figcaption>
        </figure>
        <div className="lg:pl-4">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-ember">O que é</p>
          <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">Uma mesa sombria, organizada como software premium.</h2>
          <p className="mt-5 text-base leading-relaxed text-mist sm:text-lg">
            Lúgubre RPG é uma plataforma de fantasia sombria feita para criar personagens, organizar campanhas,
            registrar jornadas e transformar cada mesa em uma narrativa viva, sem perder tempo procurando regra,
            ficha ou mensagem no meio da sessão.
          </p>
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {highlights.map(([title, text]) => (
          <article key={title} className="gothic-panel rounded-md p-5">
            <h3 className="font-display text-2xl text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-14 sm:px-4 sm:py-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.28em] text-ember">Diferenciais</p>
          <h2 className="mt-3 font-display text-4xl text-white">Tudo que sustenta a jornada.</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-mist">Recursos pensados para mestres e jogadores manterem foco na história, não na bagunça da sessão.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map(([Icon, title, text]) => (
          <article key={title} className="gothic-panel soft-motion group rounded-md p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-blood/30 bg-blood/15 text-ember transition-colors group-hover:border-ember/50">
              <Icon size={21} />
            </div>
            <h3 className="mt-4 font-display text-2xl text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mist">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeveloperDiarySection({ posts }) {
  return (
    <section className="mx-auto max-w-7xl px-3 py-14 sm:px-4 sm:py-20">
      <div className="gothic-panel rounded-md p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-ember">Projeto vivo</p>
            <h2 className="mt-3 font-display text-4xl text-white">Diário do Desenvolvedor</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-mist">
            Um mural de atualizações para acompanhar o que nasceu, o que foi refinado e o que ainda espreita no caminho.
          </p>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {posts.slice(0, 6).map((post, index) => <DeveloperPostCard key={post.id} post={post} fallbackIndex={index} />)}
        </div>
      </div>
    </section>
  );
}

function DeveloperPostCard({ post, fallbackIndex }) {
  const [broken, setBroken] = useState(false);
  const fallbackImage = diaryFallbackImages[fallbackIndex % diaryFallbackImages.length];
  const legacyPlaceholder = post.image_url?.startsWith('/assets/');
  const image = !broken && post.image_url && !legacyPlaceholder ? post.image_url : fallbackImage;
  return (
    <article className="soft-motion overflow-hidden rounded-md border border-white/10 bg-black/25">
      <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
        <img src={image} alt={`Arte de fantasia sombria para a atualização ${post.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-85 transition-transform duration-500 hover:scale-105" onError={() => setBroken(true)} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-ember/30 bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-ember">
          {post.category || 'Atualização'}
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-[.2em] text-mist">{formatDate(post.published_at)}</p>
        <h3 className="mt-2 font-display text-2xl text-white">{post.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-mist">{post.short_description}</p>
      </div>
    </article>
  );
}

function FinalCallSection() {
  return (
    <section className="mx-auto max-w-7xl px-3 py-14 sm:px-4 sm:py-20">
      <div className="relative overflow-hidden rounded-md border border-ember/20 bg-black p-6 shadow-glow sm:p-10">
        <img src={lugubreImages.throne} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,10,.98)_0%,rgba(5,4,10,.90)_48%,rgba(20,9,38,.54)_100%)]" />
        <div className="absolute inset-0 shadow-[inset_0_0_110px_35px_rgba(5,4,10,.62)]" />
        <div className="relative max-w-3xl">
          <Crown className="text-ember" size={34} />
          <h2 className="mt-4 font-display text-4xl text-white">O grimório está aberto.</h2>
          <p className="mt-3 text-mist">Entre no sistema, crie sua próxima ficha ou reúna sua mesa antes que a névoa feche o caminho.</p>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/login"><Button className="w-full sm:w-auto">Entrar no Sistema</Button></Link>
            <Link to="/register"><Button variant="ghost" className="w-full sm:w-auto">Criar Conta</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const links = [
    ['Discord', '#'],
    ['GitHub', 'https://github.com/andreulbrich2012-maker/lugubre-rpg'],
    ['Biblioteca', '/powers'],
    ['Documentação', '#sistema'],
    ['Equipe', '#sistema'],
    ['Feedback', '/feedback'],
    ['Entrar', '/login']
  ];
  return (
    <section className="border-t border-ember/10 bg-black/35 px-3 py-10 sm:px-4">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-display text-3xl text-ember">Lúgubre RPG</h2>
          <p className="mt-2 max-w-md text-sm text-mist">Software de fantasia sombria para fichas, campanhas e histórias que merecem permanecer.</p>
          <p className="mt-4 text-xs uppercase tracking-[.2em] text-mist">Versão 1.0 · 2026</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {links.map(([label, href]) => (
            <LinkOrAnchor key={label} href={href} className="rounded-md border border-white/10 bg-white/[.03] px-3 py-2 text-sm text-mist transition-colors hover:border-ember/30 hover:text-white">
              {label}
            </LinkOrAnchor>
          ))}
        </div>
      </div>
    </section>
  );
}

function LinkOrAnchor({ href, children, className }) {
  if (href.startsWith('http') || href.startsWith('#')) return <a href={href} className={className}>{children}</a>;
  return <Link to={href} className={className}>{children}</Link>;
}
