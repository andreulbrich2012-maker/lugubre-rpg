// Receita visual de cada magia do grimorio, numa mini-linguagem:
//   passos separados por ";"   cada passo: <primitiva> [palavra] [chave=valor] [flag]...
//   "@rampa" troca a rampa de cor (ver palettes.js); "calm" = nao fere (sem empurrao);
//   "move" = deslocamento do conjurador (o destino e o alvo, mas ninguem e ferido).
// A primeira palavra solta vira o "tipo" da primitiva (kind/who/sym/style/mode/to).
// Opcoes comuns: at=c|t|n|b|m|h (ancora), ph=cast|travel|hit|span|all, d (atraso 0..1),
// len (duracao 0..1), ms, p=rampa so do passo. Ver docs/ANIMACOES.md.
import { PRIMS } from './prims.js';

// Palavras que sao sempre flags (nunca o "tipo" do passo).
const FLAGS = new Set(['rev', 'up', 'sky', 'atk', 'flat', 'light', 'rainbow', 'in', 'lava', 'zz', 'drip', 'rays', 'spin', 'fly']);
const ALIAS = { summon: 'who', glyph: 'sym', sigil: 'style', dome: 'style', beam: 'style', clock: 'mode', copies: 'mode', transform: 'to' };

export const RECIPES = {
  // ---------------------------------------------------------------- fogo
  fagulha: 'gather n=5 s=1; orb s=1 trail=ember tl=4; burst n=10 shape=ember; flash r=0.3',
  'toque-ardente': 'body lunge ph=travel; glow s=2; burst n=12 shape=ember v=20; floor lava r=0.4 len=0.6',
  'maos-flamejantes': 'gather n=6; cone flame ang=0.5 len=0.8; burst n=8 shape=ember',
  'brasa-saltitante': 'orb s=1 trail=ember arc=1; chain hop n=3 gap=140; burst n=6 shape=ember',
  'bola-de-fogo': 'sigil hex; orb s=3 trail=ember tl=10; blast r=1.4; ring r=1.8; cracks n=4 r=1',
  'parede-de-fogo': 'sigil tri at=t; wall fire n=9 h=1.6; weather ash n=25 a=0.6',
  'lanca-de-magma': 'gather n=8; orb spear s=3 trail=ember; burst n=14 shape=ember g=120; floor lava r=0.6',
  'manto-de-brasas': 'sigil; aura ember n=14 r=0.6; burst n=14 shape=ember g=-40; ring r=1',
  'chuva-de-cinzas-ardentes': 'sigil star; rain ember n=40 r=2.2; weather ash; floor lava r=1.8',
  'sopro-do-dragao': 'gather n=14 r=1.4; cone flame ang=0.55 n=60 len=1.2; floor lava r=1',
  'coluna-de-fogo': 'sigil star at=t; pillar w=0.9 h=6; ring r=1.6 n=2; burst n=18 shape=ember g=-40',
  meteoro: 'sigil star r=1; meteor s=3; ring r=3 n=3 d=0.05; burst n=24 shape=ember g=160; weather ash; shake a=3',
  'chuva-de-meteoros': 'sigil hex r=1.2; meteor n=7 s=2 r=3; weather ash n=90; tint a=0.3; shake a=3 ms=1400',
  'avatar-do-tartaro': 'sigil star r=1; pillar up w=1 h=3; aura ember n=16 r=0.7; floor lava r=1.2; weather red',

  // ---------------------------------------------------------------- gelo
  'raio-de-geada': 'gather n=6; beam twin w=1 amp=1.5; burst n=10 shape=shard',
  'toque-gelido': 'body lunge ph=travel; glow s=1; burst n=10 shape=shard v=15; floor ice r=0.5',
  'adaga-de-gelo': 'calm; gather n=8 r=0.6; glyph sword y=0.2; twinkle n=6 r=0.5',
  'chao-escorregadio': 'sigil sq at=t; floor ice r=1.5; twinkle n=10 r=1.2',
  'lanca-de-gelo': 'gather n=10; orb spear s=3 trail=star; burst n=16 shape=shard g=100; flash',
  'cone-de-gelo': 'gather n=10; cone frost ang=0.45 n=50; spikes ice n=4 r=0.6; floor ice r=0.9',
  'muralha-de-gelo': 'sigil hex at=t; wall ice n=8 h=1.8; weather snow n=30 a=0.6',
  'armadura-de-gelo': 'calm; gather n=10 r=0.8; shield round; aura n=10 r=0.55; twinkle n=8 r=0.6',
  nevasca: 'sigil hex r=1; weather snow n=140; cloud r=2 n=14; floor ice r=2; tint c=white a=0.15',
  'prisao-de-gelo': 'sigil sq at=t; spikes ice n=5 r=0.5; dome block r=0.8; body freeze',
  'estalagmites-de-gelo': 'sigil tri at=t; spikes ice n=10 r=1.4 h=1.5; ring r=1.6; burst n=12 shape=shard g=80',
  'inverno-eterno': 'sigil star r=1.2; weather snow n=200; floor ice r=3.5; spikes ice n=14 r=3 d=0.3; tint c=white a=0.3; shake a=2',
  'zero-absoluto': 'gather n=20 r=1.6 rev; beam w=3; dome block r=0.9 d=0.1; nova n=16 r=2; tint i=1 a=0.35; body freeze',

  // ---------------------------------------------------------------- agua
  'jato-d-agua': 'gather n=6; beam w=2 hold=0.25; body push; burst n=12 shape=drop g=140',
  'purificar-agua': 'calm; glow s=1; heal drop n=8; twinkle n=6 r=0.4',
  'bolha-sufocante': 'orb bubble s=2 trail=ring; dome bubble r=0.45; burst n=6 shape=drop d=0.8',
  'respirar-na-agua': 'calm; gather n=6 r=0.6; heal drop n=6; aura wisp n=4 r=0.4',
  onda: 'wave water h=1; body push; burst n=16 shape=drop g=150',
  redemoinho: 'sigil at=t; vortex flat r=1.4 light core=0; body tremble; floor water r=1.3',
  'chicote-d-agua': 'beam spiral amp=2 w=1 hold=0.3; slash n=1 r=0.8; body pull; burst n=10 shape=drop g=120',
  'forma-liquida': 'calm; puff p=water n=8; floor water r=0.8; body vanish who=c',
  maremoto: 'sigil hex r=1; wave water h=2.4; body push; floor water r=2.2; weather rain n=60; shake a=2',
  geiser: 'cracks n=4 r=0.6; pillar up w=0.7 h=3; burst n=26 shape=drop g=160 v=60; body lift',
  afogar: 'glyph drop drip s=2; dome bubble r=0.55; burst n=10 shape=drop d=0.4',
  diluvio: 'sigil star r=1.2; weather rain n=220; wave water h=1.6 ph=hit; floor water r=3.5; tint a=0.3',
  'abraco-do-abismo-marinho': 'floor water r=2; roots tentacle n=6 h=1.2; vortex flat r=1.8; tint i=0 a=0.35',

  // ---------------------------------------------------------------- terra
  pedrada: 'orb rock s=1 arc=0.8; burst n=8 shape=pebble g=150 sz=2',
  lama: 'sigil sq at=t; floor mud r=1.3; body sink',
  'pele-de-pedra': 'calm; gather n=8 r=0.7; transform stone; twinkle n=4 r=0.4',
  'espinhos-de-pedra': 'cracks n=4 r=0.7; spikes stone n=6 r=0.6; body lift',
  'muro-de-pedra': 'cracks n=5 r=1; wall stone n=8 h=1.6; burst n=14 shape=pebble g=120 sz=2',
  pedregulho: 'gather n=10 r=1 rev; orb rock s=4 arc=2 ease=in; ring r=1.6 n=2; burst n=18 shape=pebble g=180 sz=3; body push',
  fenda: 'cracks n=8 r=1.2; floor plain r=0.8 p=shadow; body sink; burst n=12 shape=pebble g=60',
  terremoto: 'sigil sq r=1; cracks n=10 r=2.5; ring r=3 n=3 ms=600; burst n=30 shape=pebble g=200 r=2; shake a=4',
  'prisao-de-pedra': 'cracks n=4 r=0.6; spikes stone n=4 r=0.3; dome stone r=0.8',
  'avalanche-de-rochas': 'rain rock n=20 r=1.6 wind=1.4; burst n=20 shape=pebble g=180 r=1; shake a=2',
  'andar-na-terra': 'move; cracks n=5 r=0.6 at=c ph=cast; body vanish who=c len=0.5; body blink d=0.4; cracks n=5 r=0.6 at=n; burst n=10 shape=pebble at=n g=120',
  cataclismo: 'sigil star r=1.4; cracks n=14 r=3.5 lava; spikes stone n=14 r=3 h=1.8; meteor n=4 s=2 r=2.5; tint a=0.3; shake a=4',
  'montanha-viva': 'sigil hex r=1.2; cracks n=8 r=2; spikes stone n=3 r=0.3 h=4; ring r=3 n=3; burst n=30 shape=pebble g=200 r=1.5; shake a=4; tint a=0.25',

  // ---------------------------------------------------------------- ar
  rajada: 'gather n=5; cone wind ang=0.25 n=24; body push',
  'queda-suave': 'calm; aura leaf n=6 r=0.5 v=-0.5; body lift who=c; twinkle n=5 r=0.5',
  'dissipar-nevoa': 'calm; cloud r=1.4 n=8 p=smoke len=0.5; weather wind n=40; ring r=2 up',
  'lamina-de-vento': 'orb crescent s=2 trail=streak; slash n=1 r=0.8; burst n=8 shape=leaf',
  voo: 'calm; ring r=1 n=2; body lift who=c; weather wind n=30 a=0.5',
  'muralha-de-vento': 'wall wind n=9 h=2; weather wind n=50 a=0.6',
  vacuo: 'vortex r=0.8 core=0 light; ring r=1.2 in n=2; body tremble; glyph exclaim',
  tornado: 'sigil tri at=t; tornado h=3 r=1; body lift; weather wind n=60',
  'tempestade-de-areia': 'weather sand n=160; cloud p=sand r=2.2 n=16; tint c=gray a=0.15',
  'erguer-no-ar': 'ring r=1.2 n=3 gap=150; body lift; aura leaf n=8 r=0.5',
  furacao: 'sigil star r=1.2; tornado h=4.5 r=2; weather wind n=180; body lift; tint c=gray a=0.25; shake a=3',
  'forma-de-tempestade': 'sigil hex r=1; tornado h=2 r=0.8; aura spark n=6 r=0.7 p=storm; weather rain n=80 a=0.6; tint a=0.25',

  // ---------------------------------------------------------------- raio
  choque: 'orb bolt s=1 trail=none; flash r=0.3; burst n=8 shape=spark',
  'toque-chocante': 'body lunge ph=travel; aura spark n=3 r=0.4; flash r=0.4; body tremble',
  estatica: 'calm; aura spark n=5 r=0.5; twinkle n=10 r=0.6',
  'corrente-eletrica': 'gather n=8; beam zig w=1 hold=0.5; body tremble; burst n=10 shape=spark',
  'relampago-em-cadeia': 'gather n=10; beam zig hold=0.15; chain n=4; burst n=12 shape=spark',
  relampago: 'weather dark d=0.3 len=0.5; bolt w=2; ring r=1.2; burst n=14 shape=spark',
  'esfera-de-faiscas': 'orb s=3 trail=star wob=2; blast r=1.2 shape=spark; chain n=3 gap=60',
  tempestade: 'sigil hex r=1; weather dark d=0.45; weather rain n=120; bolt n=6 r=2 gap=110; shake a=2',
  'manto-de-trovoes': 'calm; aura spark n=10 r=0.75; ring r=1 up n=2; sigil hex ph=hit',
  trovao: 'gather n=8; cone sound ang=0.5; ring r=2 up n=3 gap=80; body push; shake a=2',
  'furia-dos-ceus': 'sigil star r=1.4; weather dark d=0.6; bolt n=16 r=3 gap=60 w=2; tint c=white a=0.25; shake a=4 ms=1400',
  'lanca-do-trovao-primordial': 'gather n=24 r=2 rev; weather dark d=0.6; bolt w=4; pillar w=1 h=7 ms=400; ring r=3 n=3; tint c=white a=0.4; shake a=5',

  // ---------------------------------------------------------------- acido
  'gota-acida': 'orb blob s=1 trail=drip; burst n=8 shape=drop g=80; floor acid r=0.4',
  'respingo-acido': 'orb blob s=1 n=2 fan=1.4 trail=drip; burst n=10 shape=drop g=100',
  corroer: 'calm; glow s=1; floor acid r=0.5; cloud r=0.5 n=4 p=smoke',
  'flecha-acida': 'orb arrow s=2 trail=drip; floor acid r=0.6; cloud r=0.6 n=5',
  'poca-corrosiva': 'orb blob s=2 arc=1.5; floor acid r=1.4; cloud r=1.2 n=8',
  'derreter-armadura': 'beam pulse w=1 hold=0.2; floor acid r=0.5; burst n=10 shape=drop g=120 d=0.2; glyph shield drip',
  'vomito-acido': 'cone bile ang=0.4 n=40; floor acid r=0.9',
  'sangue-acido': 'calm; aura ember n=6 r=0.5; floor acid r=0.6; heal drop n=6',
  'chuva-acida': 'sigil sq r=1; weather rain n=150; floor acid r=2.2; cloud r=2 n=12',
  'lodo-devorador': 'orb blob s=3 arc=1; dome bubble r=0.9; body sink; floor acid r=0.9',
  'mar-de-acido': 'sigil star r=1.2; floor acid r=3.5; cloud r=3 n=20; vortex flat r=2 core=0; tint a=0.3; shake a=2',

  // ---------------------------------------------------------------- veneno
  'picada-venenosa': 'orb needle s=1 trail=none; burst n=6 shape=drop; glyph drop s=1 y=0.9',
  'envenenar-lamina': 'calm; glyph sword y=0.3 drip; heal drop n=5',
  'toque-peconhento': 'body lunge ph=travel; cloud r=0.4 n=4; burst n=8 shape=drop g=60',
  'nuvem-venenosa': 'orb flask arc=1.5 s=1; cloud r=1.5 n=14; glyph skull y=1.4',
  'esporos-paralisantes': 'cone spore ang=0.35 n=40; cloud r=0.8 n=6; body freeze; glyph exclaim',
  'sangue-envenenado': 'orb needle s=2 trail=drip; aura n=5 r=0.4; glyph skull drip',
  'imunidade-a-venenos': 'calm; gather n=8; heal leaf n=10; ring r=1',
  'nuvem-pestilenta': 'sigil tri at=t r=1; cloud r=2.2 n=18; swarm insect n=20 r=1.6; glyph skull y=1.6',
  'serpente-de-veneno': 'beam spiral amp=3 w=1 hold=0.3; slash claw n=1 r=0.5; burst n=8 shape=drop',
  praga: 'sigil star r=1.2; cloud r=3 n=26; swarm insect n=40 r=2.5; glyph skull s=2 y=1.8; tint a=0.3',

  // ---------------------------------------------------------------- luz
  clarao: 'glow s=2; flash r=0.8 ms=220; nova n=8 r=1 ms=250',
  'dardo-de-luz': 'orb shard s=2 trail=streak; nova n=6 r=0.6; burst n=8 shape=ray',
  'aura-solar': 'calm; ring r=1.5 n=2; aura n=10 r=0.9; weather sun a=0.5',
  'raio-solar': 'gather n=10; beam w=3 hold=0.5; burst n=14 shape=ray',
  'explosao-solar': 'orb s=2 trail=star; blast r=1.4 shape=ray; nova n=14 r=2; flash r=1',
  'lanca-de-luz': 'orb spear s=3 trail=streak; nova n=8 r=1; twinkle n=8 r=1',
  'espelho-solar': 'calm; shield round; nova n=6 r=0.8 at=c; beam w=1 hold=0.2',
  'pilar-de-luz': 'sigil hex at=t; pillar w=1 h=7; ring r=1.6 n=2; burst n=16 shape=ray g=-30',
  'aurora-ardente': 'sigil r=1; wave sand h=1.4; weather sun; nova n=16 r=2.5',
  'corpo-de-luz': 'move; streak; body vanish who=c ph=travel; body blink; nova n=10 r=1 at=n',
  'sol-nascente': 'sigil star r=1.4; weather sun a=1; glyph sun s=3 y=3 rays; pillar w=2 h=8; tint c=white a=0.35; shake a=3',
  prisma: 'gather n=12 r=1; beam n=7 rainbow w=1 hold=0.6; nova n=14 r=1.5; tint c=white a=0.2',

  // ---------------------------------------------------------------- trevas
  'dardo-sombrio': 'orb shard s=1 trail=smoke; burst n=8 shape=smoke',
  escuridao: 'sigil at=t; cloud r=1.3 n=10; weather dark d=0.3',
  'mao-do-vazio': 'body lunge ph=travel; glyph hand y=0.2; drain n=6',
  'raio-sombrio': 'beam spiral amp=2 w=2 hold=0.4; burst n=12 shape=smoke',
  'explosao-de-trevas': 'orb s=3 trail=smoke; blast r=1.4 shape=smoke; vortex r=0.8 len=0.4',
  'tentaculos-do-breu': 'floor shadow r=0.9; roots tentacle n=5 h=1.1; body freeze',
  'veu-de-trevas': 'calm; cloud r=0.6 n=8; aura wisp n=6 r=0.5',
  'esfera-do-vazio': 'orb s=4 trail=smoke ease=in; vortex r=1.4; ring r=1.4 in n=3',
  'noite-sem-estrelas': 'sigil star r=1; weather dark d=0.7; twinkle n=4 r=2; tint a=0.3',
  'eclipse-interior': 'glyph sun y=1 len=0.4; glyph moon y=1 d=0.4; drain rev n=8; tint i=0 a=0.2',
  'buraco-negro': 'sigil star at=t r=1.2; vortex r=2.4; ring r=3 in n=4; body pull; weather dark d=0.4; tint a=0.35; shake a=3',
  'fim-da-luz': 'sigil hex r=1.4; weather dark d=0.95; nova n=20 r=3 ms=500; tint c=black a=0.5; shake a=2',

  // ---------------------------------------------------------------- forca
  'misseis-magicos': 'gather n=6; orb n=3 s=1 trail=streak fan=1.6 stag=0.08; burst n=10 shape=star',
  'escudo-arcano': 'calm; shield; ring r=0.8 up',
  'mao-arcana': 'calm; glyph hand s=1 y=0.6; twinkle n=5 r=0.4',
  'empurrao-de-forca': 'gather n=6; ring r=1.2 up n=2; body push; burst n=10 shape=star',
  'raio-arcano': 'gather n=8; beam pulse w=2 hold=0.4; burst n=12 shape=star',
  'lamina-espectral': 'glyph sword s=2 y=0.9 spin; slash n=3 gap=120; burst n=8 shape=star',
  'armadura-arcana': 'calm; dome r=0.6 len=0.5; aura rune n=4 r=0.5',
  'prisao-de-forca': 'sigil sq at=t; dome box r=0.9; body freeze',
  'martelo-arcano': 'pillar w=1.4 h=4 ms=300; ring r=2 n=2; cracks n=6 r=1.2; shake a=2; burst n=14 shape=star',
  'esfera-resiliente': 'orb bubble s=2 trail=ring; dome bubble r=0.9; body lift',
  'tempestade-arcana': 'sigil star r=1.2; orb n=9 s=1 trail=streak fan=2.5 stag=0.04; rain star n=40 r=2.4; tint a=0.3; shake a=2',
  desintegrar: '@acid; gather n=18 r=1.4; beam w=2 hold=0.5; burst n=30 shape=square v=20 g=-20 life=900; body vanish; tint a=0.25',

  // ---------------------------------------------------------------- ilusao
  'ilusao-menor': 'calm; twinkle n=6 r=0.6; glyph question y=0.8',
  disfarce: 'calm; puff p=dream; glyph mask y=1',
  'luzes-dancantes': 'calm; swarm spark n=4 r=0.9 fly',
  'ruido-fantasma': 'calm; sound at=t n=3 r=1.2; glyph note y=1.1',
  'duplo-ilusorio': 'calm; puff p=dream at=c; copies side n=2',
  'imagens-espelhadas': 'calm; copies orbit n=3; twinkle n=6 r=0.8',
  invisibilidade: 'calm; twinkle n=10 r=0.6; body vanish who=c d=0.15',
  'terreno-ilusorio': 'calm; sigil at=t r=1.2; floor flowers r=1.8; twinkle n=10 r=1.6',
  'forca-fantasmal': 'summon horror at=t atk; glyph exclaim y=1.4; body tremble',
  'labirinto-ilusorio': 'sigil sq at=t; maze; body tremble; glyph question y=1.5',
  'invisibilidade-em-grupo': 'calm; ring r=2 n=2 at=c; twinkle n=18 r=1.8; body vanish who=c d=0.2; body vanish who=t d=0.2',
  'assassino-fantasma': 'summon spirit at=n atk s=2; glyph skull y=1.4; body tremble',
  'miragem-arcana': 'sigil hex r=1.2; floor flowers r=3; weather stars a=0.6; twinkle n=24 r=3',
  'realidade-falsa': 'sigil star r=1.4; maze; summon horror at=t s=2 atk; weather stars; tint a=0.35; shake a=2',
  'teatro-de-sombras': '@shadow; copies army n=12 at=t; weather dark d=0.3; tint a=0.3',

  // ---------------------------------------------------------------- encantamento
  enfeiticar: 'calm; orb heart s=1 trail=star; glyph heart y=1',
  sono: 'calm; cloud r=1 n=8 zz p=dream; body sink',
  comando: 'calm; glyph exclaim s=2 y=1.2; ring r=0.8 up n=2',
  'zombaria-cruel': 'sound n=3 r=1; glyph mask y=1.1 spin; body tremble',
  confusao: 'calm; orb spiral s=1; glyph spiral y=1.1 spin; swarm spark n=5 r=0.5',
  'imobilizar-pessoa': 'calm; beam twin hold=0.3; roots rune n=4; body freeze',
  sugestao: 'calm; drain rev n=6; glyph question y=1',
  medo: 'cone fear ang=0.5 n=30; glyph skull y=1.2; body push',
  dominar: 'calm; beam spiral hold=0.4; glyph crown y=1.2; threads up n=4',
  loucura: 'sigil star at=t r=1; swarm eye n=8 r=1.4; glyph spiral s=2 y=1.4 spin; tint a=0.25',
  'apagar-memoria': 'calm; glyph question y=1; cloud r=0.5 n=5 p=smoke; drain n=6',
  'palavra-de-poder-atordoar': 'glow s=3; ring r=2 up n=3 gap=60; glyph exclaim s=3 y=1.4; body tremble; shake a=2; tint a=0.3',
  'dominio-das-massas': 'sigil star r=1.4; glyph crown s=3 y=2.5 rays; threads up n=10; tint a=0.3',

  // ---------------------------------------------------------------- necromancia
  'toque-necrotico': 'body lunge ph=travel; floor plain r=0.4; burst n=10 shape=smoke g=-20; glyph skull y=0.9',
  'dardo-de-ossos': 'orb bone s=2 trail=none; burst n=8 shape=shard p=bone',
  'falar-com-os-mortos': 'calm; summon spirit at=t; glyph question y=1.6',
  'sussurro-sepulcral': 'sound at=t n=3 r=0.8; cloud r=0.5 n=4; glyph skull y=1',
  'drenar-vida': '@blood; beam twin hold=0.2; drain n=16; heal at=c n=6',
  'erguer-mortos': 'calm; sigil star at=t; summon skeleton at=t; burst n=10 shape=smoke',
  'explosao-de-cadaver': 'glyph skull y=0 len=0.2; blast r=1.4 shape=shard p=bone; burst n=20 shape=drop p=blood g=140',
  'armadura-de-ossos': 'calm; aura bone n=8 r=0.55; dome r=0.6 len=0.3',
  'dedo-da-morte': 'gather n=12; beam w=1 hold=0.3; glyph skull s=2 y=1.2; body sink',
  'exercito-dos-mortos': 'sigil star r=1.4 at=t; summon skeleton at=n atk; summon skeleton at=t d=0.1; summon skeleton at=b d=0.2; cracks n=8 r=2; tint a=0.25',
  definhar: 'drain n=10; glyph hourglass y=1.2; cloud r=0.5 n=6 p=dust',
  'lancas-de-ossos': 'spikes bone n=8 r=1; burst n=10 shape=shard p=bone',
  'transcender-em-lich': 'sigil star r=1; pillar up w=1 h=4; glyph crown y=1.3; aura wisp n=10 r=0.7; tint a=0.35',
  ceifador: 'sigil hex r=1.4; summon spirit s=2 at=t sky; slash n=3 r=1.6 gap=120 d=0.4; weather dark d=0.5; tint a=0.35; shake a=2',

  // ---------------------------------------------------------------- conjuracao
  'invocar-familiar': 'calm; sigil at=n; summon familiar',
  'conjurar-objeto': 'calm; puff p=arcane at=c; glyph key y=0.5 at=c',
  'invocar-corvo': '@dark; summon crow at=t sky atk; swarm crow n=2 r=0.6 d=0.5',
  'servo-invisivel': 'calm; puff at=n; twinkle n=8 r=0.8 at=n; glyph hand y=0.6 at=n',
  'invocar-lobo-espectral': '@ice; sigil at=n; summon wolf atk; burst n=10 shape=star d=0.5',
  'invocar-diabrete': '@fire; cracks n=4 r=0.6 lava at=n; summon imp atk; burst n=10 shape=ember',
  teia: 'orb disc s=2 trail=none p=smoke; floor web r=1.2; roots web',
  'invocar-elemental-menor': '@earth; sigil tri at=n; summon elemental atk; burst n=10 shape=pebble',
  'invocar-golem': '@earth; sigil sq at=n r=1; summon golem atk; cracks n=6 r=1 at=n; shake a=2',
  'invocar-horror-do-abismo': '@curse; cracks n=6 r=1 at=t; roots tentacle n=6 h=1.4; summon horror atk',
  'invocar-cavaleiro-espectral': '@holy; sigil hex at=n; summon knight; pillar w=0.8 h=4 at=n ms=400',
  'chuva-de-laminas': 'sigil star at=t r=1; rain blade n=24 r=1.6; burst n=12 shape=spark',
  'invocar-dragao-ancestral': '@fire; sigil star r=1.4 at=n; summon dragon s=2 sky; blast r=1.6 d=0.45; floor lava r=1.4; tint a=0.3; shake a=3',
  'chamado-do-leviata': '@water; floor water r=2.5; summon leviathan s=2 at=t; wave water h=2 ph=hit d=0.3; tint a=0.35; shake a=4',

  // ---------------------------------------------------------------- abjuracao
  resistencia: 'calm; gather n=6 r=0.6; ring r=0.8 up; twinkle n=5 r=0.5',
  'protecao-contra-o-mal': 'calm; sigil hex at=t; dome r=0.7; glyph cross y=1.1',
  alarme: 'calm; sigil sq at=t r=1.1; glyph exclaim y=1.2 len=0.5; sound at=t n=2',
  'aparar-feitico': 'calm; shield; nova n=6 r=0.8 at=c',
  egide: 'calm; orb shield s=1 trail=star; shield at=t; glyph shield y=1.2',
  'dissipar-magia': 'orb s=2 trail=ring; ring r=1.2 in n=3; twinkle n=10 r=0.8; puff p=arcane',
  'circulo-de-protecao': 'calm; sigil hex at=t r=1.3 ph=hit; ring r=1.4 up n=2',
  'contra-magica': 'beam zig hold=0.2; nova n=10 r=1; glyph rune2 y=1',
  redoma: 'calm; sigil hex r=1.4; dome r=1.6',
  banir: 'sigil star at=t; portal r=0.7; body vanish d=0.4; ring r=1.2 in n=2',
  'refletir-magia': 'calm; shield round; ring r=1 up n=3; twinkle n=8 r=0.7',
  'campo-antimagia': 'sigil sq at=t r=1.6; dome r=1.8; floor plain r=1.6 p=meta',
  'santuario-inviolavel': 'calm; sigil star r=1.6; dome r=2; pillar w=0.6 h=6',
  invulnerabilidade: 'calm; gather n=14 r=1; dome bubble r=0.8; aura rune n=6 r=0.7; tint i=4 a=0.25',

  // ---------------------------------------------------------------- transmutacao
  consertar: 'calm; twinkle n=8 r=0.5; ring r=0.6 in n=2',
  'salto-arcano': 'move; body hop; ring r=1 at=c ph=cast; ring r=1 at=n d=0.8 ms=300',
  'garras-bestiais': 'calm; puff n=6; glyph hand y=0.3; slash claw n=1 r=0.5',
  'moldar-argila': 'calm; floor mud r=0.7; spikes stone n=2 r=0.3 h=0.6',
  'aumentar-e-reduzir': 'ring r=1 up n=3 gap=100; transform giant; body vanish d=0.15; twinkle n=8 r=0.7',
  'pele-de-ferro': 'calm; gather n=8 r=0.7; transform steel; aura spark n=3 r=0.5 p=steel',
  'metal-ardente': '@fire; glyph sword y=0.5; aura ember n=8 r=0.4; body tremble',
  'forma-gasosa': 'calm; puff p=smoke n=12; cloud r=0.6 n=8 p=smoke; body vanish who=c',
  metamorfose: 'orb s=2 trail=star; puff n=12; transform frog; body vanish',
  petrificar: 'beam twin hold=0.3; transform stone; body freeze',
  'forma-monstruosa': 'calm; puff n=12 p=curse; transform horror; body vanish who=c',
  'transmutar-materia': 'calm; twinkle n=10 r=0.5; transform gold',
  'metamorfose-verdadeira': 'sigil star at=t r=1.2; orb s=3 trail=star; puff n=16; transform tree; body vanish; tint a=0.3',
  'forma-titanica': 'calm; sigil star r=1.4; transform giant; body vanish who=c; ring r=2 n=3; shake a=3; tint a=0.25',

  // ---------------------------------------------------------------- adivinhacao
  'detectar-magia': 'calm; ring r=2.5 n=2 ms=600; twinkle n=16 r=2',
  orientacao: 'calm; orb star s=1 trail=star; glyph halo y=1.1; twinkle n=4 r=0.4',
  identificar: 'calm; glyph eye y=0.8; twinkle n=6 r=0.4',
  'detectar-pensamentos': 'calm; beam spiral amp=1 w=1 hold=0.3; glyph question y=1.2',
  'ver-o-invisivel': 'calm; glyph eye s=2 y=1 at=c; ring r=2 ms=700 at=c; twinkle n=10 r=2 at=c',
  'marca-do-cacador': 'orb arrow s=1 trail=streak; mark; glyph crowmark y=1.2',
  clarividencia: 'calm; glyph eye s=2 y=1.5 at=c rays; portal r=0.5 at=t',
  pressagio: 'calm; orb bone n=3 arc=1.5 s=1 fan=0.8; glyph hourglass y=1',
  videncia: 'calm; glyph eye s=3 y=2 at=c rays; threads n=3 at=c',
  'visao-verdadeira': 'calm; glyph eye s=2 y=1.2; nova n=12 r=2; twinkle n=12 r=1.5',
  'lendas-e-saberes': 'calm; glyph rune4 s=2 y=1; threads n=5; twinkle n=8 r=0.8',
  previsao: 'calm; copies side n=2; clock fast y=1.6; twinkle n=6 r=0.7',
  'olho-de-ananque': 'sigil star r=1.6; glyph eye s=3 y=2.4 rays; threads n=14; tint a=0.3',

  // ---------------------------------------------------------------- divina
  cura: 'calm; gather n=6 r=0.7; heal; ring r=0.8',
  'palavra-curativa': 'calm; orb cross s=1 trail=star; heal n=8',
  estabilizar: 'calm; heal heart n=4; glyph heart y=1',
  'chama-sagrada': 'pillar w=0.5 h=6 ms=500; burst n=12 shape=cross; flash r=0.6',
  'cura-em-massa': 'calm; ring r=2.5 n=2 at=c ms=700; heal at=c n=12; heal at=t n=10',
  restauracao: 'calm; heal n=10; puff p=smoke n=5 d=0.2; twinkle n=8 r=0.6',
  bencao: 'calm; sigil hex ph=hit r=1.2; aura n=8 r=0.8; glyph halo y=1.3',
  'luz-sagrada': 'gather n=10; beam w=2 hold=0.5; nova n=10 r=1.2; burst n=12 shape=cross',
  regeneracao: 'calm; heal leaf n=16; aura leaf n=6 r=0.5; ring r=1 n=3 gap=200',
  'julgamento-celeste': 'sigil star at=t r=1; rain blade n=18 r=1.6 p=holy; pillar w=0.8 h=6 d=0.3; shake a=2',
  'asas-celestes': 'calm; wings at=c; wings at=t; twinkle n=10 r=1.6',
  ressurreicao: 'calm; sigil star at=t r=1; pillar w=0.8 h=6; heal n=14; wings; glyph halo y=1.4',
  milagre: 'sigil star r=1.6; pillar w=2 h=8; nova n=20 r=3; weather sun; tint c=white a=0.35; shake a=2',
  'ressurreicao-verdadeira': 'calm; sigil star r=2 at=c; pillar w=1 h=8 at=t; pillar w=1 h=8 at=c; heal n=16; wings; weather sun; tint c=white a=0.3',

  // ---------------------------------------------------------------- natureza
  espinhos: 'orb thorn n=3 s=1 fan=0.5 trail=none stag=0.05; burst n=8 shape=leaf',
  raizes: 'roots root n=4; burst n=6 shape=pebble g=100 p=earth',
  'bom-fruto': 'calm; glyph berry y=0.7; heal leaf n=8',
  'nevoa-da-mata': 'calm; cloud r=1.4 n=12 at=t; weather leaves n=30 a=0.6',
  'enxame-de-insetos': 'swarm insect n=30 r=0.9 fly; cloud r=0.6 n=4 p=dust',
  'muralha-de-espinhos': 'wall thorn n=9 h=1.4; burst n=10 shape=leaf',
  'pele-de-casca': 'calm; transform wood; aura leaf n=5 r=0.5',
  'vinhas-constritoras': 'roots vine n=6 h=1.1; body freeze; burst n=8 shape=leaf',
  'despertar-arvore': 'summon tree at=n atk; weather leaves n=30 a=0.5',
  'floresta-subita': 'sigil star at=t r=1.4; summon tree at=t; summon tree at=n d=0.1; summon tree at=b d=0.15; weather leaves; floor flowers r=2',
  'forma-selvagem': 'calm; puff n=12; transform bear; body vanish who=c',
  'esporos-da-podridao': 'cone spore ang=0.3 n=30; cloud r=0.7 n=6 p=necro; glyph skull y=1.1',
  'ira-da-floresta': 'sigil star r=1.6; roots vine n=10 h=1.6; summon tree at=n atk; weather leaves n=120; tint a=0.3; shake a=3',
  'primavera-eterna': 'sigil hex r=1.6 at=c; floor flowers r=3.5; heal leaf at=c n=12; roots vine n=6 at=t; weather petals; tint i=4 a=0.2',

  // ---------------------------------------------------------------- sombras
  'passo-sombrio': 'move; floor shadow r=0.6 at=c ph=cast; body vanish who=c ph=travel; body blink; floor shadow r=0.6 at=n',
  'manto-de-sombras': 'calm; cloud r=0.6 n=6; body vanish who=c d=0.2; aura wisp n=4 r=0.5',
  'lamina-de-sombra': 'orb dagger s=2 trail=smoke; slash n=1 r=0.6; burst n=8 shape=smoke',
  'pregar-a-sombra': 'orb dagger s=1 trail=none arc=1; floor shadow r=0.6; body freeze; glyph lock y=1',
  'sombras-vivas': 'floor shadow r=1.4; roots hand n=4; body freeze',
  'roubar-sombra': 'floor shadow r=0.5; drain n=12; body tremble',
  'duplo-sombrio': 'calm; floor shadow r=0.8 at=c; copies army n=1 at=n',
  'mordida-da-sombra': 'floor shadow r=0.6; slash claw n=2 r=0.5; body push',
  'reino-das-sombras': 'sigil hex at=t r=1.4; weather dark d=0.6; floor shadow r=3; tint c=gray a=0.25',
  'forma-de-sombra': 'calm; puff p=shadow n=10; body vanish who=c; floor shadow r=0.6',
  'marionete-sombria': 'floor shadow r=0.6; threads up n=4; body lift',
  'legiao-das-sombras': 'sigil star r=1.4; copies army n=15 at=t; floor shadow r=3; weather dark d=0.4; tint a=0.3; shake a=2',
  'devorador-de-sombras': 'floor shadow r=2; summon horror at=t s=2; vortex r=1.6; body vanish d=0.4; tint a=0.4; shake a=3',

  // ---------------------------------------------------------------- sangue
  'gota-de-sangue': 'orb shard s=1 trail=blood; burst n=8 shape=drop g=120',
  'pacto-de-sangue': 'calm; slash n=1 r=0.4; drain rev n=6; sigil tri ph=hit',
  sangria: 'slash n=1 r=0.6; burst n=12 shape=drop g=150; floor blood r=0.5',
  'farejar-sangue': 'calm; glyph drop y=1.1; ring r=2.5 ms=700; twinkle n=6 r=2',
  'lanca-de-sangue': 'floor blood r=0.6 at=c ph=cast; orb spear s=3 trail=blood; burst n=14 shape=drop g=140',
  'ferver-sangue': 'glyph drop s=2 y=1.1; aura ember n=8 r=0.4; burst n=12 shape=drop g=-30; body tremble',
  transfusao: 'calm; drain rev n=12; heal drop n=8',
  'poca-rubra': 'floor blood r=1.2; spikes blood n=7 r=1',
  'marionete-de-sangue': 'threads up n=5; glyph drop y=1.8; body lift; roots blood n=2',
  'chuva-de-sangue': 'sigil tri r=1; weather blood n=140; floor blood r=2; heal at=c drop n=8; tint a=0.2',
  'armadura-carmesim': 'calm; floor blood r=0.7; roots blood n=6 h=0.9; dome r=0.6',
  'mare-carmesim': 'sigil star r=1.4; wave blood h=2.2; floor blood r=3; weather red; tint a=0.3; shake a=3',
  'senhor-do-sangue': 'sigil star r=1.6 at=c; drain n=24; floor blood r=2.5 at=c; aura ember n=12 r=0.8 at=c; tint a=0.35',

  // ---------------------------------------------------------------- tempo
  'reflexos-rapidos': 'calm; clock fast r=0.5 y=1; aura wisp n=3 r=0.5',
  lentidao: 'orb s=1 trail=ring; clock slow r=0.6; body freeze',
  'envelhecer-objeto': 'calm; clock fast r=0.5; cloud r=0.5 n=6 p=dust',
  'deja-vu': 'calm; copies side n=1; clock rewind r=0.4 y=1.2',
  pressa: 'calm; clock fast r=0.7; aura wisp n=8 r=0.6 v=3',
  'congelar-instante': 'beam twin w=1 hold=0.2; clock stop r=0.7; body freeze; tint c=gray a=0.15',
  'voltar-ferida': 'calm; clock rewind r=0.6; heal n=8',
  retroceder: 'calm; clock rewind r=0.6; copies side n=2; body vanish who=c len=0.3',
  'bolha-temporal': 'sigil hex at=t r=1.2; dome bubble r=1.6; clock slow r=0.8; tint c=gray a=0.15',
  envelhecer: 'beam pulse w=1 hold=0.3; clock fast; cloud r=0.6 n=6 p=dust; body sink',
  'eco-temporal': 'calm; copies orbit n=2; clock rewind r=0.5 y=1.4; twinkle n=6 r=0.6',
  'parar-o-tempo': 'sigil star r=1.6; clock stop r=1.2 y=1.6; weather gray d=0.45; tint c=gray a=0.4; body freeze',
  rebobinar: 'sigil hex r=1.6; clock rewind r=1.2 y=1.6; copies side n=2 at=t; weather stars; tint a=0.35',

  // ---------------------------------------------------------------- espaco
  piscar: 'move; puff p=space at=c; body vanish who=c ph=travel; body blink; puff p=space at=n',
  'bolso-dimensional': 'calm; portal r=0.35 at=c; glyph key y=0.6',
  'empurrao-espacial': 'ring r=1 in n=2; body push; puff p=space n=6',
  'porta-dimensional': 'move; portal at=c ph=cast; body vanish who=c ph=travel; body blink; portal at=n',
  'trocar-de-lugar': 'puff p=space at=c; puff p=space at=t; body swap; twinkle n=8 r=1',
  teleporte: 'move; sigil hex at=c; body vanish who=c ph=travel; body blink; pillar w=0.6 h=4 at=n ms=400; puff p=space at=n',
  'dobra-espacial': 'portal r=0.4 at=c; portal r=0.4 at=t; slash n=2 r=0.6 d=0.2',
  portal: 'calm; portal r=0.9 at=t; portal r=0.6 at=c; twinkle n=10 r=1',
  exilio: 'sigil star at=t; vortex r=1; body vanish d=0.3; ring r=1.4 in n=3',
  'gravidade-invertida': 'sigil sq at=t r=1.2; body lift; burst n=16 shape=pebble g=-60 p=earth; ring r=1.4 n=3',
  'teleporte-em-grupo': 'move; sigil hex r=1.4 at=c; body vanish who=c ph=travel; body blink; ring r=1.6 at=n up n=2; puff p=space at=n n=14',
  'rasgo-no-espaco': 'sigil star at=t r=1.2; portal r=1.2; vortex r=2; body pull; tint a=0.35; shake a=3',
  'plano-proprio': 'move; sigil star r=1.6 at=c; portal r=1.4 at=n; weather stars; tint a=0.3',

  // ---------------------------------------------------------------- runas
  'runa-de-marca': 'calm; glyph rune1 y=0.4; twinkle n=4 r=0.3',
  'runa-de-explosao': 'sigil tri at=t; glyph rune2 y=0.1 len=0.3; blast r=1.1 d=0.15; ring r=1.4 d=0.15',
  'runa-de-afiacao': 'calm; glyph sword y=0.4; glyph rune3 y=1.1; twinkle n=5 r=0.4',
  'runa-de-guarda': 'calm; glyph rune4 y=0.2; shield round',
  'glifo-de-gelo': '@ice; sigil hex at=t; glyph rune3 y=0.1; spikes ice n=5 r=0.5 d=0.2; floor ice r=0.8',
  'runa-de-prisao': 'orb rune1 s=1 trail=star; roots chain n=4; aura rune n=4 r=0.6',
  'circulo-runico': 'calm; sigil star at=t r=1.4 ph=hit; aura rune n=6 r=1',
  'runa-de-retorno': 'calm; orb sword arc=1 trail=star; glyph rune2 y=0.9',
  'runa-da-ruina': 'orb rune4 trail=star; mark; blast r=1.3 d=0.4; ring r=1.6 d=0.4',
  'selo-arcano': 'calm; sigil hex at=t r=1.2 ph=hit; glyph lock s=2 y=1; roots chain n=2',
  'chuva-de-runas': 'sigil star r=1.2; rain rune n=24 r=2; burst n=14 shape=star r=1',
  'palavra-primordial': 'sigil star r=1.8; glyph rune4 s=3 y=2.4 rays; nova n=20 r=3; tint a=0.35; shake a=3',
  'corpo-runico': 'calm; aura rune n=10 r=0.7; pillar up w=0.5 h=2; sigil star ph=hit; tint a=0.25',

  // ---------------------------------------------------------------- alquimia
  'fogo-de-alquimista': '@fire; orb flask arc=1.6; blast r=1 shape=ember; floor lava r=0.8',
  'fumaca-alquimica': '@smoke; orb flask arc=1.6; cloud r=1.4 n=14',
  tonico: 'calm; orb flask arc=1; heal drop n=8',
  'oleo-escorregadio': '@mud; orb flask arc=1.6; floor grease r=1.2',
  'frasco-de-geada': '@ice; orb flask arc=1.6; cloud r=1 n=10; floor ice r=1; burst n=10 shape=shard',
  'elixir-da-furia': '@fire; orb flask arc=1; aura ember n=8 r=0.5; glyph exclaim y=1.1',
  'destilar-essencia': 'calm; drain n=10; glyph flask y=0.6 at=c',
  'bomba-de-estilhacos': '@steel; orb flask arc=1.6; burst n=26 shape=shard v=70 g=60; flash r=0.5',
  homunculo: 'calm; floor mud r=0.6 at=n; summon homunculus',
  'granada-de-trovao': '@storm; orb flask arc=2; flash r=1.2 ms=200; ring r=2 up n=3; bolt n=3 r=1.2; shake a=2',
  mutagenico: 'calm; glyph flask y=0.6; puff n=8; transform horror d=0.2; body vanish who=c d=0.2',
  'pedra-filosofal': 'calm; sigil star at=t r=1.2; transform gold; nova n=14 r=1.6 p=gold; tint i=3 a=0.2',
  'elixir-da-vida': 'calm; orb flask arc=1 p=holy; heal n=16; pillar w=0.6 h=5; tint c=white a=0.2',

  // ---------------------------------------------------------------- musica
  'acorde-dissonante': 'sound n=3 r=1.2; orb note trail=none; body tremble',
  'cancao-de-coragem': 'calm; swarm note n=5 r=0.8; aura n=6 r=0.6',
  'cancao-de-ninar': 'calm; orb note trail=star wob=3; cloud r=0.6 n=5 zz p=dream',
  'ritmo-de-marcha': 'calm; sound n=4 r=1.5; swarm note n=3 r=0.5; ring r=1.2 n=4 gap=150',
  'grito-sonico': 'cone sound ang=0.45; body push; burst n=10 shape=star',
  'balada-da-cura': 'calm; swarm note n=6 r=0.7 at=c; heal heart n=10 at=t',
  'melodia-hipnotica': 'calm; orb note n=3 fan=0.8 wob=2 trail=star; glyph spiral y=1.2 spin; swarm note n=4 r=0.6',
  'hino-de-batalha': 'calm; sound n=5 r=2; swarm note n=6 r=0.9; aura ember n=6 r=0.6',
  requiem: '@curse; sound n=6 r=3 ms=700; swarm ghost n=4 r=1.4 at=t; glyph skull y=1.4',
  'danca-irresistivel': 'swarm note n=8 r=1; body tremble; glyph note s=2 y=1.4 spin',
  'eco-devastador': 'sound n=6 r=2.5; ring r=2 up n=4 at=t gap=120; cracks n=6 r=1.2; shake a=2',
  'cancao-da-criacao': 'sigil star r=1.6; swarm note n=14 r=2 at=c; floor flowers r=3; weather petals; tint i=4 a=0.25',
  'sinfonia-do-fim': 'sigil star r=1.6; swarm note n=16 r=2 at=t; ring r=3 up n=5; cracks n=10 r=2.5; tint a=0.35; shake a=4',

  // ---------------------------------------------------------------- maldicoes
  'mau-olhado': 'orb eye s=1 trail=smoke; glyph eye y=1.1',
  'praga-menor': 'orb s=1 trail=drip wob=2; swarm insect n=6 r=0.5; glyph drop y=1 drip',
  'marca-do-corvo': '@dark; summon crow at=t sky; glyph crowmark y=1.2; mark',
  'maldicao-da-fraqueza': 'orb s=2 trail=smoke; roots chain n=2 h=0.6; glyph sword y=1.1 spin; body sink',
  'maldicao-da-ferida-aberta': 'orb s=1 trail=blood; slash n=1 r=0.5; burst n=10 shape=drop g=120 p=blood; glyph drop y=1.1 drip',
  'boneco-de-pano': 'summon doll at=c; orb needle s=1 trail=none; slash n=1 r=0.4 d=0.2; body tremble',
  'lingua-presa': 'orb s=1 trail=smoke; glyph lock y=1; roots chain n=2 h=0.5',
  'maldicao-da-lua': '@moon; glyph moon s=2 y=1.4; transform beast d=0.3; puff n=10 d=0.25; body vanish d=0.3',
  'sina-funesta': 'orb skull trail=smoke; glyph skull s=2 y=1.3 drip; threads up n=3; body sink',
  'maldicao-em-massa': 'sigil star at=t r=1.4; swarm eye n=8 r=1.6; glyph skull s=2 y=1.6; cloud r=1.8 n=12',
  'maldicao-do-espelho': 'copies mirror n=1 at=t; slash n=2 r=0.5 d=0.3; glyph mask y=1.3',
  'maldicao-eterna': 'sigil star at=t r=1.4; roots chain n=6 h=1.2; glyph skull s=2 y=1.8 rays; threads up n=6; tint a=0.35',
  'palavra-da-morte': 'glow s=3; ring r=2.2 up n=2; glyph skull s=3 y=1.6; body sink; tint c=black a=0.4; shake a=2',

  // ---------------------------------------------------------------- xamanismo
  'totem-menor': 'calm; summon totem at=n; aura n=4 r=0.5 at=c',
  'fantasma-ancestral': 'calm; summon spirit at=b; twinkle n=6 r=0.6 at=b',
  'uivo-do-lobo': 'summon wolf at=b len=0.6; cone fear ang=0.45 n=24; glyph exclaim y=1.1',
  'totem-da-tempestade': '@storm; summon totem at=n; bolt n=2 r=0.8 d=0.3',
  'espirito-do-urso': 'calm; puff n=8; summon bear at=c; aura wisp n=6 r=0.6',
  exorcismo: 'sigil hex at=t; summon spirit at=t; pillar w=0.6 h=5 d=0.3; burst n=12 shape=cross d=0.3',
  'danca-dos-espiritos': 'calm; swarm ghost n=5 r=1.2 at=c; ring r=1.2 at=c n=2',
  'andar-entre-espiritos': 'calm; tint c=gray a=0.2; body vanish who=c len=0.6; swarm ghost n=3 r=1',
  'totem-da-cura': 'calm; summon totem at=n; heal at=c n=10; ring r=1.4 at=n n=2 d=0.3',
  'chamado-dos-ancestrais': 'sigil star r=1.2; swarm ghost n=8 r=1.2 at=t fly; pillar w=0.5 h=5 at=b; tint a=0.25',
  'possessao-animal': 'calm; summon crow at=t sky; beam twin hold=0.4; glyph eye y=1.4',
  'espirito-da-montanha': '@earth; sigil star r=1.6 at=n; summon golem s=2 at=n atk; cracks n=10 r=2; tint a=0.3; shake a=4',
  'avatar-ancestral': 'calm; sigil star r=1.4; pillar w=1 h=6; swarm ghost n=6 r=0.9; glyph mask s=2 y=1.6; tint a=0.3',

  // ---------------------------------------------------------------- cosmos
  'poeira-estelar': 'orb star s=1 trail=star wob=1; twinkle n=12 r=0.8',
  'mapa-das-estrelas': 'calm; weather stars a=0.8; threads n=6',
  'estrela-cadente': 'meteor s=1 m=moon; burst n=10 shape=star',
  'feixe-lunar': '@moon; glyph moon y=2 at=c ph=cast; beam w=2 hold=0.5; twinkle n=8 r=0.8',
  constelacao: 'twinkle n=6 r=1; threads n=6; slash n=2 r=0.7 d=0.4',
  'projecao-astral': 'calm; copies army n=1 at=n; weather stars a=0.6',
  'gravidade-estelar': 'orb star s=2 trail=star; ring r=1.2 in n=3; body sink; cracks n=4 r=0.8',
  'chuva-de-estrelas': 'sigil star r=1.2; rain star n=30 r=2.2; weather stars; burst n=16 shape=star r=1.5',
  nova: 'sigil hex at=t; glyph sun y=0 len=0.3; nova n=16 r=2 d=0.25; blast r=1.4 shape=star d=0.25',
  'escudo-lunar': 'calm; aura moon n=4 r=0.8; dome r=0.9 len=0.6',
  supernova: 'sigil star r=1.8; vortex r=1.2 len=0.4 light; nova n=24 r=4 d=0.35 ms=600; blast r=2.5 d=0.35; tint c=white a=0.45; shake a=5',
  eclipse: '@moon; weather dark d=0.6; glyph sun s=3 y=3 rays; glyph moon s=3 y=3 d=0.3; tint c=black a=0.35',
  'olhar-do-vazio-cosmico': 'weather stars n=120; glyph eye s=3 y=1.8 rays; vortex r=1 light; body tremble; tint a=0.4',

  // ---------------------------------------------------------------- caos
  'faisca-caotica': 'orb s=1 trail=star wob=3; burst n=12 shape=shard; flash r=0.4',
  'sorte-torta': 'orb spiral s=1 trail=star; glyph question y=1.1 spin; twinkle n=5 r=0.5',
  'surto-selvagem': 'calm; nova n=10 r=1.2; burst n=20 shape=shard; puff p=chaos',
  'bola-do-caos': 'orb s=3 trail=ember wob=2 rainbow; blast r=1.3; burst n=10 shape=star',
  ruptura: 'cracks n=8 r=1.4 lava; portal r=0.5; burst n=14 shape=shard r=1',
  mutacao: 'orb blob s=2 trail=drip; puff n=10; transform horror; body vanish d=0.2',
  'prisma-do-caos': 'beam zig rainbow hold=0.15; chain n=4; burst n=12 shape=star',
  'tempestade-do-caos': 'sigil star r=1.2; rain mix n=36 r=2.2; weather stars; tint a=0.25',
  desfazer: 'beam pulse w=1 hold=0.3; burst n=26 shape=square v=15 g=-30 life=900; body vanish d=0.3',
  'fenda-caotica': 'cracks n=6 r=1 at=t; portal r=0.8; summon horror at=t d=0.2 atk; summon imp d=0.3',
  entropia: 'sigil star r=1.6; clock fast r=1 y=2; cracks n=14 r=3; cloud r=3 n=20 p=dust; tint c=gray a=0.35; shake a=3',
  'caos-primordial': 'sigil star r=2; vortex r=3; rain mix n=40 r=3; weather stars; tint a=0.45; shake a=5',

  // ---------------------------------------------------------------- metamagia
  'magia-silenciosa': 'calm; glyph lock y=1.1; ring r=0.8 in',
  'magia-distante': 'calm; ring r=2.5 ms=600; orb star s=1 trail=streak',
  'magia-estendida': 'calm; clock slow r=0.5 y=1.2; aura rune n=3 r=0.6',
  'magia-gemea': 'calm; orb n=2 fan=1.2 s=2 trail=star; twinkle n=6 r=0.6',
  'magia-potencializada': 'calm; gather n=16 r=1.2; glow s=4; nova n=10 r=1',
  'magia-acelerada': 'calm; clock fast r=0.5 y=1.2; orb n=2 s=1 stag=0.3 fan=0 trail=streak',
  'absorver-magia': 'calm; vortex r=0.8 light; drain n=10',
  'magia-persistente': 'calm; aura rune n=6 r=0.6; sigil hex ph=hit',
  'roubar-magia': 'drain n=14; aura rune n=3 r=0.5 at=c; glyph rune2 y=1.1',
  'magia-encadeada': 'calm; orb s=1 trail=streak; chain n=4 gap=90',
  'magia-maximizada': 'calm; sigil star r=1.2; gather n=24 r=1.6; pillar up w=1 h=4; tint a=0.25',
  desejo: 'sigil star r=1.8; glyph crown s=3 y=2.2 rays; twinkle n=30 r=3; nova n=20 r=3; tint c=white a=0.35',

  // ---------------------------------------------------------------- utilitarias
  luz: 'calm; glow s=2 at=t ph=hit; twinkle n=4 r=0.4',
  'abrir-fechadura': 'calm; glyph key y=0.6; glyph lock y=1.2 len=0.5; twinkle n=4 r=0.4',
  'falar-com-animais': 'calm; summon familiar at=t; glyph note y=1.3',
  prestidigitacao: 'calm; twinkle n=12 r=0.6; puff p=light n=4',
  trancar: 'calm; glyph lock s=2 y=0.8; roots chain n=2 h=0.5',
  'compreender-idiomas': 'calm; glyph rune1 y=1.2; glyph rune3 y=1.6 d=0.3; aura rune n=3 r=0.5',
  'chama-continua': 'calm; aura ember n=4 r=0.2; glow s=1 at=t ph=hit',
  'andar-sobre-a-agua': '@water; calm; floor water r=0.8; ring r=1 n=3 gap=200',
  'patas-de-aranha': 'calm; summon spider at=c; floor web r=0.6',
  mensagem: 'calm; orb star s=1 trail=star arc=1; sound at=t n=2 r=0.6',
  'visao-no-escuro': 'calm; weather dark d=0.4; glyph eye y=1.1; twinkle n=6 r=1',
  'cabana-arcana': 'calm; sigil sq at=t r=1; dome r=1.2; weather rain n=50 a=0.6',
  'mansao-arcana': 'calm; portal r=0.9 at=t; sigil hex at=t r=1.3 ph=hit; twinkle n=12 r=1',
  'encolher-objeto': 'calm; ring r=1 in n=3; twinkle n=6 r=0.4',
  'fortaleza-instantanea': '@stone; calm; cracks n=8 r=1.5 at=t; wall stone n=11 h=2.6; spikes stone n=3 r=0.4 h=3; shake a=3',

  // ---------------------------------------------------------------- rituais
  'consagrar-solo': 'calm; sigil hex at=t r=1.2 ph=hit; floor plain r=1 p=holy; twinkle n=8 r=1',
  'ritual-do-repouso': 'calm; sigil r=1; cloud r=0.8 n=5 zz p=dream; heal n=6',
  'circulo-de-sal': 'calm; floor salt r=1.4; ring r=1.4 ms=600',
  'ritual-da-lua-cheia': '@moon; calm; glyph moon s=2 y=2; pillar w=0.6 h=6; aura n=6 r=0.6',
  'ritual-de-guarda': 'calm; sigil sq at=t r=1.5 ph=hit; dome r=1.6; glyph eye y=1.8',
  uncao: 'calm; orb drop arc=1 s=1; heal drop n=8; glyph cross y=1.1',
  'encantar-item': 'calm; glyph sword y=0.6; aura rune n=4 r=0.5; twinkle n=6 r=0.5',
  'invocacao-demoniaca': '@fire; sigil star r=1.6 at=t; cracks n=8 r=1.6 lava; summon imp s=2 at=t; weather red; tint a=0.3; shake a=2',
  'laco-de-almas': 'calm; beam twin hold=0.5; glyph heart y=1.2 at=c; glyph heart y=1.2 at=t',
  'ritual-da-chuva': '@water; sigil hex r=1.2 at=c; weather rain n=160; weather dark d=0.3; ring r=2 n=3 at=t',
  'ritual-do-sangue-antigo': '@blood; sigil tri r=1.2; floor blood r=1; pillar up w=0.6 h=3; swarm ghost n=4 r=0.8',
  'ritual-da-ruina': '@curse; sigil star r=2 at=t; cloud r=3 n=20; glyph skull s=3 y=2.4 drip; weather dark d=0.5; tint a=0.4; shake a=2',
  'ritual-da-ascensao': 'sigil star r=1.6; pillar w=1.2 h=8; body lift who=c; wings; tint c=white a=0.35',
  'chamado-ao-primordial': '@time; sigil star r=2 at=t; glyph eye s=4 y=3 rays; threads up n=8; pillar w=2 h=8; tint a=0.45; shake a=4'
};

// Receita generica por escola (para magias novas que ainda nao tem receita propria).
const SCHOOL_FALLBACK = {
  default: 'sigil; orb s=2 trail=star; burst n=12'
};

export function recipeFor(spell) {
  return RECIPES[spell.id] || SCHOOL_FALLBACK[spell.school] || SCHOOL_FALLBACK.default;
}

const cache = new Map();

export function parseRecipe(src) {
  if (cache.has(src)) return cache.get(src);
  const out = { pal: null, flags: {}, steps: [], src };
  for (const raw of String(src).split(';')) {
    const toks = raw.trim().split(/\s+/).filter(Boolean);
    if (!toks.length) continue;
    const head = toks[0];
    if (head.startsWith('@')) { out.pal = head.slice(1); continue; }
    if (head === 'calm' || head === 'move') { out.flags[head] = true; continue; }
    if (!PRIMS[head]) throw new Error(`grimorio: primitiva desconhecida "${head}" em "${src}"`);
    const o = {};
    let first = true;
    for (const tk of toks.slice(1)) {
      const eq = tk.indexOf('=');
      if (eq > 0) {
        const k = tk.slice(0, eq);
        const v = tk.slice(eq + 1);
        o[k] = /^-?\d*\.?\d+$/.test(v) ? Number(v) : v;
      } else if (first && !FLAGS.has(tk)) {
        o[ALIAS[head] || 'kind'] = tk;
        o.kind = o.kind ?? tk;
        first = false;
      } else o[tk] = true;
    }
    out.steps.push({ prim: head, o });
  }
  cache.set(src, out);
  return out;
}
