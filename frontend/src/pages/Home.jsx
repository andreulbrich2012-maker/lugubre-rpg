import { Link } from 'react-router-dom';
import { BookOpen, MessagesSquare, ScrollText, Users } from 'lucide-react';
import Button from '../components/Button';

const scenes = [
  { name: 'Catedral', image: '/assets/dark-castle.svg' },
  { name: 'Ruínas', image: '/assets/haunted-ruins.svg' },
  { name: 'Cripta', image: '/assets/crypt-gate.svg' }
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden px-3 py-16 sm:px-4 sm:py-24">
        <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: "url('/assets/dark-castle.svg')" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(143,29,44,.42),transparent_28%),linear-gradient(90deg,#050506_0%,rgba(5,5,6,.78)_48%,rgba(5,5,6,.35)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-abyss to-transparent" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[.3em] text-ember">Dark fantasy modular</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl text-white sm:text-5xl md:text-7xl">Lúgubre RPG</h1>
          <p className="mt-6 max-w-2xl text-base text-mist sm:text-lg">
            Crie fichas, reúna campanhas e conduza mesas em um mundo onde mana, aço e segredos antigos têm peso real.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/characters/new"><Button className="w-full sm:w-auto">Criar ficha</Button></Link>
            <Link to="/campaigns"><Button variant="ghost" className="w-full sm:w-auto">Ver campanhas</Button></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-12 sm:px-4 sm:py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {scenes.map((scene, index) => (
            <div key={scene.name} className="gothic-panel soft-motion relative h-72 overflow-hidden rounded-md p-5">
              <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url('${scene.image}')` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 border-t border-ember/25 pt-4">
                <p className="text-xs uppercase tracking-[.25em] text-ember">Cena {index + 1}</p>
                <h2 className="mt-2 font-display text-3xl">{scene.name}</h2>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-12 sm:px-4">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <h2 className="font-display text-3xl text-ember sm:text-4xl">Um RPG sobre desgaste, escolhas e presságios.</h2>
          <p className="text-mist">
            Lúgubre usa atributos claros, perícias simples, defesa editável e mana no lugar de esforço. Raças alteram atributos,
            classes evoluem até o nível 20 e inventários registram peso, defesa e encantamentos sem travar futuras expansões.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-3 py-12 sm:px-4 sm:py-14 md:grid-cols-4">
        {[
          [ScrollText, 'Fichas guiadas', 'Criador em etapas com resumo final.'],
          [Users, 'Campanhas', 'Mestres convidam jogadores e veem fichas.'],
          [MessagesSquare, 'Chat resiliente', 'Socket local e mensagens REST no deploy.'],
          [BookOpen, 'Admin', 'Catálogo de raças, classes, origens e perícias.']
        ].map(([Icon, title, text]) => (
          <article key={title} className="gothic-panel soft-motion rounded-md p-5">
            <Icon className="text-ember" />
            <h3 className="mt-4 font-display text-xl">{title}</h3>
            <p className="mt-2 text-sm text-mist">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
