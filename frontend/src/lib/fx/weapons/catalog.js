// Catalogo de golpes de arma.
//
// Organizacao (pedido do Andre): armas do mesmo jeito de lutar reaproveitam a
// mesma animacao base, so trocando a "ferramenta" desenhada.
//   - FAMILIAS DE MOVIMENTO (leves, pesadas, haste...): cada uma tem 15-25 golpes
//     base. O golpe base e o movimento, o tempo e o rastro.
//   - ARMAS: herdam os golpes da familia, trocam o sprite (o mesmo da mao do
//     avatar) e podem ajustar o rastro, a cor das faiscas, o impacto e somar uma
//     ou duas tecnicas exclusivas.
//
// Linguagem dos golpes (angulos em graus, relativos a direcao do alvo:
// 0 = apontando para o alvo, negativo = para cima, positivo = para baixo):
//   sw(a0, a1, ms)  balanco: a arma gira de a0 ate a1 em volta da mao
//   th(ang, ms)     estocada: a arma aponta em ang e avanca
//   sp(voltas, ms)  giro: a arma da voltas em volta do corpo
//   hd(ang, ms)     pose: segura a arma (carga, aparar, mira)
//   tw({...})       arremesso: a arma (ou o projetil dela) sai voando
//   sh({...})       disparo: arco/besta soltam o projetil
//   ls(ms)          chicotada: corda/corrente da mao ate o alvo
//   gr(ms)          fenda: o golpe racha o chao ate o alvo
// Opcoes do golpe: windup (antecipacao, ms), body (deslocamento do atacante),
// react (reacao do alvo), impact (cut, pierce, crush, pow, claw, bash, blast),
// shake, el (elemento padrao), mount (montaria), ally (golpe em dupla), kw.

const sw = (a0, a1, ms, o = {}) => ({ k: 'swing', a0, a1, ms, hit: true, ...o });
const th = (ang, ms, o = {}) => ({ k: 'thrust', ang, ms, back: 0.35, len: 0.25, hit: true, ...o });
const sp = (turns, ms, o = {}) => ({ k: 'spin', turns, ms, hit: true, ...o });
const hd = (ang, ms, o = {}) => ({ k: 'hold', ang, ms, hit: false, ...o });
const tw = (o = {}) => ({ k: 'shot', mode: 'throw', speed: 12, arc: 0.5, spin: 3, n: 1, hit: true, ...o });
const sh = (o = {}) => ({ k: 'shot', mode: 'aim', speed: 17, arc: 0.25, spin: 0, n: 1, hit: true, ...o });
const ls = (ms, o = {}) => ({ k: 'lash', ms, amp: 0.4, hit: true, ...o });
const gr = (ms, o = {}) => ({ k: 'ground', ms, hit: true, ...o });

// Deslocamentos do atacante (em celulas). pre: recua na antecipacao; go: fracao
// da aproximacao ate o alcance da arma; over: passa alem (negativo = recua);
// up: altura do salto; dip: agacha; hold: fracao da acao em que chega; recoil: recuo depois.
const STEP = { pre: 0.15, go: 1, hold: 0.55 };
const LUNGE = { pre: 0.3, go: 1, over: 0.15, hold: 0.45 };
const DASH = { pre: 0.3, go: 1, over: 0.1, hold: 0.8, dust: true };
const LEAP = { pre: 0.1, dip: 0.12, go: 1, up: 0.9, hold: 1 };
const HIGH = { pre: 0.1, dip: 0.15, go: 1, up: 1.4, hold: 1 };
const WALK = { pre: 0.1, go: 1, hold: 1 };
const THROUGH = { pre: 0.25, go: 1, over: 1.7, hold: 0.7, dust: true, ghost: true };
const STAY = { pre: 0.08, go: 0, over: -0.12, hold: 0.3 };
const BACK = { pre: 0.05, go: 0, over: -0.7, up: 0.25, hold: 0.6 };
const CLOSE = { pre: 0.1, go: 0.75, hold: 0.5 };
const RIDE = { pre: 0.3, go: 1, over: 0.6, hold: 0.85, dust: true };
const LOW = { pre: 0.12, go: 1, dip: 0.18, hold: 0.5 };

function mv(id, name, desc, tipo, segs, o = {}) {
  return { id, name, desc, tipo, segs, windup: 150, body: STEP, react: 'push', impact: null, shake: 1, ...o };
}

// ---------------------------------------------------------------- familias
export const WEAPON_FAMILIES = [
  {
    id: 'leves', label: 'Lâminas leves', desc: 'Espadas de uma mão, sabres, rapieira e foice: golpes rápidos, rastro fino e preciso.',
    tool: 'espada-longa', impact: 'cut', reach: 0.95,
    moves: [
      mv('corte-horizontal', 'Corte horizontal', 'Varre a lâmina da esquerda para a direita na altura do peito.', 'Corte', [sw(-70, 70, 120)]),
      mv('corte-diagonal', 'Corte diagonal descendente', 'Ergue a lâmina acima do ombro e desce na diagonal.', 'Corte', [sw(-125, 45, 130)]),
      mv('corte-ascendente', 'Corte ascendente', 'Parte de baixo e sobe rasgando, jogando o alvo para cima.', 'Corte', [sw(85, -100, 130)], { react: 'launch' }),
      mv('estocada', 'Estocada', 'Avança o pé da frente e crava a ponta em linha reta.', 'Estocada', [th(0, 90)], { body: LUNGE, impact: 'pierce' }),
      mv('estocada-dupla', 'Estocada dupla', 'Duas estocadas seguidas, alta e baixa.', 'Estocada', [th(-12, 75), th(12, 75)], { body: LUNGE, impact: 'pierce' }),
      mv('giro', 'Giro', 'Gira o corpo inteiro com a lâmina estendida.', 'Giro', [sp(1, 260)], { kw: ['girat', 'rodopio'] }),
      mv('combo-tres', 'Combo de três golpes', 'Corte, contracorte e estocada final, avançando a cada golpe.', 'Combo', [sw(-80, 60, 110), sw(60, -75, 110), th(0, 85)], { body: WALK, kw: ['combo', 'sequencia', 'tres golpes'] }),
      mv('golpe-com-salto', 'Golpe com salto', 'Salta sobre o alvo e desce a lâmina com o peso do corpo.', 'Salto', [sw(-155, 40, 150, { quake: true })], { body: LEAP, windup: 190, shake: 2, kw: ['salto', 'saltando', 'pulo'] }),
      mv('golpe-de-pomo', 'Golpe de pomo', 'Inverte a pegada e bate com o pomo no rosto do alvo.', 'Esmagamento', [th(180, 70, { rev: true, back: 0.2, len: 0.1 })], { impact: 'pow', react: 'daze', kw: ['pomo', 'cabo'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Apara o golpe inimigo com um tinido e responde na hora.', 'Contra-ataque', [hd(-65, 170, { tink: true }), sw(-65, 60, 110)], { body: { pre: 0.2, go: 1, hold: 0.8 }, kw: ['aparar', 'contra ataque', 'contra-ataque', 'riposta', 'defesa'] }),
      mv('arco-amplo', 'Corte em arco amplo', 'Um corte largo de meia-volta que cobre tudo à frente.', 'Corte', [sw(-150, 150, 230, { r: 1.2 })], { body: CLOSE, kw: ['arco amplo', 'amplo', 'largo'] }),
      mv('investida', 'Investida', 'Corre até o alvo e atravessa com a ponta à frente.', 'Investida', [th(0, 150, { ghost: true })], { body: DASH, windup: 170, impact: 'pierce', react: 'knock', kw: ['investida', 'carga', 'avanco'] }),
      mv('giro-rasteiro', 'Golpe giratório no chão', 'Agacha e gira rente ao chão para derrubar.', 'Giro', [sp(1.5, 300, { low: true })], { body: LOW, react: 'trip', kw: ['rasteir', 'no chao', 'rente'] }),
      mv('desarmar', 'Desarmar', 'Prende a arma do alvo com a lâmina e a arranca da mão dele.', 'Especial', [sw(60, -85, 110)], { impact: 'pow', react: 'disarm', kw: ['desarm'] }),
      mv('finalizacao', 'Golpe final', 'Concentra força com a lâmina erguida e desce um corte pesado.', 'Especial', [hd(-150, 260, { glow: true }), sw(-150, 50, 140, { quake: true })], { windup: 220, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu', 'golpe de misericordia'] }),
      mv('corte-cruzado', 'Corte cruzado', 'Dois cortes diagonais que se cruzam em X no alvo.', 'Combo', [sw(-120, 50, 100), sw(120, -50, 100)], { kw: ['cruzad', 'em x'] }),
      mv('rajada-de-cortes', 'Rajada de cortes', 'Cinco cortes curtos e rápidos, quase sem respirar.', 'Combo', [sw(-50, 45, 60, { ghost: true }), sw(45, -50, 60), sw(-50, 45, 60), sw(45, -50, 60), sw(-60, 55, 70)], { body: WALK, kw: ['rajada', 'furia', 'frenesi'] }),
      mv('corte-atravessado', 'Corte atravessado', 'Passa pelo alvo como um vulto e corta no caminho.', 'Investida', [sw(-60, 80, 130)], { body: THROUGH, windup: 170, kw: ['atravess', 'vulto', 'relampago'] }),
      mv('lamina-de-tartaro', 'Lâmina de Tártaro', 'A lâmina pega fogo antes de um corte diagonal.', 'Elemental', [hd(-100, 170, { glow: true }), sw(-125, 55, 130)], { el: 'Tártaro', tags: ['elemento'], kw: ['flamejante', 'chama', 'fogo'] }),
      mv('corte-de-erebo', 'Corte de Érebo', 'Some numa sombra e reaparece cortando do outro lado.', 'Elemental', [sw(-70, 90, 120, { ghost: true })], { el: 'Érebo', body: THROUGH, tags: ['elemento'], kw: ['sombra', 'sombrio'] }),
      mv('carga-montada', 'Carga montada', 'Passa a galope e corta de cima da sela.', 'Montaria', [sw(-60, 70, 130)], { mount: true, body: RIDE, windup: 200, tags: ['montaria'], kw: ['montad', 'cavalo', 'galope', 'cavalaria'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Um aliado ataca pelo outro lado no mesmo instante.', 'Dupla', [sw(-80, 60, 120)], { ally: true, tags: ['dupla'], kw: ['dupla', 'em dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'pesadas', label: 'Armas pesadas', desc: 'Montante, machado de guerra e martelo de guerra: antecipação longa, rastro largo e impacto que treme o chão.',
    tool: 'montante', impact: 'crush', reach: 1.05, shake: 2,
    moves: [
      mv('golpe-descendente', 'Golpe descendente', 'Ergue a arma bem alto e desce com tudo.', 'Esmagamento', [sw(-165, 40, 150, { quake: true })], { windup: 250, shake: 3 }),
      mv('varredura-pesada', 'Varredura pesada', 'Um golpe horizontal largo que arrasta o alvo.', 'Corte', [sw(-100, 100, 190, { r: 1.1 })], { windup: 220, react: 'knock', kw: ['varredura', 'horizontal'] }),
      mv('golpe-ascendente', 'Golpe ascendente', 'Arrasta a arma no chão e sobe arremessando o alvo.', 'Esmagamento', [sw(100, -120, 170)], { windup: 220, react: 'launch' }),
      mv('redemoinho', 'Redemoinho', 'Duas voltas completas com a arma, ganhando velocidade.', 'Giro', [sp(2, 440, { ghost: true })], { windup: 200, body: CLOSE, kw: ['giro', 'girat', 'redemoinho', 'turbilhao'] }),
      mv('salto-esmagador', 'Salto esmagador', 'Salta alto e cai com a arma sobre o alvo.', 'Salto', [sw(-170, 40, 170, { quake: true })], { body: HIGH, windup: 220, shake: 3, kw: ['salto', 'pulo', 'queda'] }),
      mv('ombrada', 'Ombrada', 'Arranca correndo com a arma baixa e acerta com o ombro.', 'Investida', [hd(150, 170, { hit: true })], { body: DASH, windup: 190, impact: 'crush', react: 'knock', kw: ['ombrada', 'investida', 'carga', 'atropel'] }),
      mv('golpe-sismico', 'Golpe sísmico', 'Crava a arma no chão e a fenda corre até o alvo.', 'Esmagamento', [sw(-160, 75, 140), gr(240)], { body: STAY, windup: 240, shake: 3, kw: ['sismic', 'tremor', 'terremoto', 'fenda'] }),
      mv('golpe-de-cabo', 'Cabo no estômago', 'Golpe curto com a ponta do cabo para abrir a guarda.', 'Esmagamento', [th(180, 80, { rev: true, back: 0.2, len: 0.1 })], { impact: 'pow', react: 'daze', kw: ['cabo', 'pomo'] }),
      mv('dois-tempos', 'Dois tempos', 'Desce a arma e, sem parar, sobe de volta.', 'Combo', [sw(-145, 45, 150), sw(60, -120, 160)], { windup: 210, kw: ['combo', 'dois tempos', 'duplo'] }),
      mv('meia-lua-colossal', 'Meia-lua colossal', 'Um arco gigantesco de lado a lado.', 'Corte', [sw(-170, 170, 300, { r: 1.3 })], { windup: 240, body: CLOSE, react: 'knock', kw: ['meia lua', 'arco amplo', 'colossal'] }),
      mv('varredura-baixa', 'Varredura baixa', 'Passa a arma rente ao chão nas pernas do alvo.', 'Corte', [sw(-90, 90, 190, { low: true })], { body: LOW, windup: 200, react: 'trip', kw: ['rasteir', 'baixa', 'pernas'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Segura o golpe na lâmina larga e devolve com força.', 'Contra-ataque', [hd(-80, 180, { tink: true }), sw(-140, 40, 150)], { kw: ['aparar', 'contra ataque', 'contra-ataque', 'defesa'] }),
      mv('golpe-carregado', 'Golpe carregado', 'Treme segurando a arma no alto e solta tudo de uma vez.', 'Especial', [hd(-170, 380, { glow: true, tremble: true }), sw(-170, 40, 140, { quake: true })], { windup: 200, shake: 4, react: 'knock', kw: ['carregad', 'carga', 'concentr'] }),
      mv('quebra-guarda', 'Quebra-guarda', 'Golpe de cima pensado para atravessar escudo e armadura.', 'Esmagamento', [sw(-150, 30, 130)], { windup: 230, impact: 'pow', react: 'stagger', kw: ['quebra', 'guarda', 'armadura', 'rachar'] }),
      mv('furia', 'Fúria', 'Quatro golpes pesados alternados, avançando.', 'Combo', [sw(-130, 50, 120), sw(50, -110, 120), sw(-130, 50, 120), sw(-160, 40, 140, { quake: true })], { body: WALK, windup: 200, shake: 3, kw: ['furia', 'frenesi', 'berserk', 'rajada'] }),
      mv('golpe-incandescente', 'Golpe incandescente', 'A arma esquenta até brilhar e desce soltando brasas.', 'Elemental', [hd(-160, 240, { glow: true }), sw(-160, 40, 150, { quake: true })], { el: 'Tártaro', windup: 200, shake: 3, tags: ['elemento'], kw: ['incandesc', 'fogo', 'brasa'] }),
      mv('fenda-de-gaia', 'Fenda de Gaia', 'O chão se abre em espinhos de pedra até o alvo.', 'Elemental', [sw(-160, 75, 140), gr(260, { spikes: true })], { el: 'Gaia', body: STAY, windup: 240, shake: 3, react: 'launch', tags: ['elemento'], kw: ['gaia', 'terra', 'pedra'] }),
      mv('execucao', 'Execução', 'Salta, ergue a arma sobre a cabeça e encerra a luta.', 'Especial', [hd(-175, 320, { glow: true }), sw(-175, 50, 160, { quake: true })], { body: LEAP, windup: 220, shake: 4, react: 'knock', kw: ['execu', 'final', 'finaliz', 'decapit'] }),
      mv('carga-montada', 'Carga montada', 'Desce a arma pesada do alto do cavalo em pleno galope.', 'Montaria', [sw(-150, 50, 140)], { mount: true, body: RIDE, windup: 220, shake: 3, tags: ['montaria'], kw: ['montad', 'cavalo', 'galope'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Abre a guarda do alvo para o aliado acertar junto.', 'Dupla', [sw(-140, 40, 150)], { ally: true, windup: 220, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'uma-mao', label: 'Contundentes e machados de uma mão', desc: 'Maça e machadinha: golpes curtos e fortes, fáceis de encadear.',
    tool: 'maca', impact: 'crush', reach: 0.8,
    moves: [
      mv('golpe-lateral', 'Golpe lateral', 'Bate de lado na altura da cabeça.', 'Esmagamento', [sw(-75, 60, 115)]),
      mv('golpe-descendente', 'Golpe descendente', 'Ergue e desce a cabeça da arma sobre o alvo.', 'Esmagamento', [sw(-140, 40, 125, { quake: true })], { windup: 180, shake: 2 }),
      mv('golpe-ascendente', 'Golpe ascendente', 'Sobe por baixo do queixo e levanta o alvo.', 'Esmagamento', [sw(90, -95, 125)], { react: 'launch' }),
      mv('golpe-duplo', 'Golpe duplo', 'Ida e volta, dois golpes no mesmo fôlego.', 'Combo', [sw(-110, 40, 110), sw(60, -85, 110)], { kw: ['duplo', 'dois golpes'] }),
      mv('combo-tres', 'Combo de três golpes', 'Lado, outro lado e um golpe de cima para terminar.', 'Combo', [sw(-80, 50, 100), sw(50, -80, 100), sw(-150, 40, 120, { quake: true })], { body: WALK, shake: 2, kw: ['combo', 'tres golpes', 'sequencia'] }),
      mv('giro', 'Giro', 'Gira no próprio eixo e bate com o embalo.', 'Giro', [sp(1, 270)], { kw: ['giro', 'girat'] }),
      mv('golpe-com-salto', 'Golpe com salto', 'Pula e acerta de cima com o peso do corpo.', 'Salto', [sw(-160, 40, 150, { quake: true })], { body: LEAP, windup: 180, shake: 2, kw: ['salto', 'pulo'] }),
      mv('golpe-de-cabo', 'Golpe de cabo', 'Cutucão com a ponta do cabo para atordoar.', 'Esmagamento', [th(180, 70, { rev: true, back: 0.2, len: 0.1 })], { impact: 'pow', react: 'daze', kw: ['cabo', 'pomo'] }),
      mv('quebra-joelho', 'Quebra-joelho', 'Golpe baixo e seco no joelho do alvo.', 'Esmagamento', [sw(-30, 80, 100, { low: true })], { body: LOW, react: 'trip', kw: ['joelho', 'perna', 'rasteir', 'baixo'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Desvia o golpe com a cabeça da arma e devolve.', 'Contra-ataque', [hd(-60, 160, { tink: true }), sw(-90, 50, 110)], { kw: ['aparar', 'contra ataque', 'contra-ataque', 'defesa'] }),
      mv('investida', 'Investida', 'Corre e bate no embalo da corrida.', 'Investida', [sw(-120, 40, 130)], { body: DASH, windup: 170, react: 'knock', kw: ['investida', 'carga', 'avanco'] }),
      mv('rajada', 'Rajada', 'Cinco golpes curtos e rápidos.', 'Combo', [sw(-50, 40, 65), sw(40, -50, 65), sw(-50, 40, 65), sw(40, -50, 65), sw(-100, 40, 85)], { body: WALK, kw: ['rajada', 'furia', 'frenesi'] }),
      mv('arremesso', 'Arremesso', 'Atira a arma girando no alvo.', 'Arremesso', [tw({ self: true, spin: 4, speed: 12 })], { body: STAY, windup: 170, kw: ['arremess', 'atira', 'lanca a'] }),
      mv('golpe-na-tempora', 'Golpe na têmpora', 'Pancada rápida na cabeça que deixa o alvo tonto.', 'Esmagamento', [sw(-70, 30, 85)], { impact: 'pow', react: 'daze', kw: ['tempora', 'cabeca', 'atordo', 'tonto'] }),
      mv('golpe-carregado', 'Golpe carregado', 'Junta força com a arma erguida e solta de uma vez.', 'Especial', [hd(-150, 300, { glow: true }), sw(-150, 40, 130, { quake: true })], { shake: 3, react: 'knock', kw: ['carregad', 'concentr'] }),
      mv('golpe-radiante', 'Golpe radiante', 'A cabeça da arma brilha como o sol no impacto.', 'Elemental', [hd(-120, 200, { glow: true }), sw(-140, 40, 130)], { el: 'Hemera', tags: ['elemento'], kw: ['radiante', 'sol', 'luz'] }),
      mv('golpe-final', 'Golpe final', 'Três passos, um salto e o golpe mais pesado que tem.', 'Especial', [hd(-160, 240, { glow: true }), sw(-160, 40, 150, { quake: true })], { body: LEAP, windup: 200, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Ataca junto com um aliado pelos dois lados.', 'Dupla', [sw(-100, 50, 120)], { ally: true, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'haste', label: 'Armas de haste', desc: 'Lança, alabarda, gadanha, cajado e bordão: alcance longo, estocadas e varreduras.',
    tool: 'lanca', impact: 'pierce', reach: 1.25,
    moves: [
      mv('estocada', 'Estocada', 'Empurra a haste e crava a ponta.', 'Estocada', [th(0, 100)], { body: LUNGE }),
      mv('estocada-dupla', 'Estocada dupla', 'Recolhe e crava de novo, alto e baixo.', 'Estocada', [th(-10, 80), th(12, 80)], { body: LUNGE, kw: ['dupla', 'duas estocadas'] }),
      mv('estocada-tripla', 'Estocada tripla', 'Três estocadas em ritmo, avançando um passo.', 'Estocada', [th(-12, 70), th(10, 70), th(0, 80)], { body: WALK, kw: ['tripla', 'tres estocadas'] }),
      mv('varredura', 'Varredura', 'Gira a haste num arco largo na altura da cintura.', 'Corte', [sw(-95, 95, 200, { r: 1.1 })], { impact: 'crush', react: 'knock', kw: ['varredura', 'varrer'] }),
      mv('golpe-descendente', 'Golpe descendente', 'Desce a haste inteira como um açoite de madeira.', 'Esmagamento', [sw(-160, 30, 150, { quake: true })], { impact: 'crush', windup: 200, shake: 2 }),
      mv('giro-de-haste', 'Giro de haste', 'Roda a haste nas mãos duas vezes antes de bater.', 'Giro', [sp(2, 380)], { impact: 'crush', body: CLOSE, kw: ['giro', 'girat', 'molinete', 'helice'] }),
      mv('mergulho', 'Mergulho', 'Usa a haste de vara para saltar e cai cravando a ponta.', 'Salto', [th(40, 120)], { body: HIGH, windup: 200, shake: 2, kw: ['salto', 'mergulho', 'vara', 'pulo'] }),
      mv('investida', 'Investida', 'Corre com a haste baixa e trespassa o alvo.', 'Investida', [th(0, 160, { ghost: true })], { body: DASH, windup: 180, react: 'knock', kw: ['investida', 'carga', 'avanco'] }),
      mv('rasteira', 'Rasteira', 'Varre as pernas do alvo com a haste rente ao chão.', 'Corte', [sw(-60, 90, 170, { low: true })], { body: LOW, impact: 'crush', react: 'trip', kw: ['rasteir', 'pernas', 'baixa'] }),
      mv('golpe-de-cabo', 'Golpe de cabo', 'Vira a haste e acerta com a ponta de trás.', 'Esmagamento', [th(180, 80, { rev: true, back: 0.25, len: 0.15 })], { impact: 'pow', react: 'daze', kw: ['cabo', 'conto'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Bloqueia com a haste atravessada e responde com a ponta.', 'Contra-ataque', [hd(-90, 170, { tink: true }), th(0, 90)], { kw: ['aparar', 'contra ataque', 'contra-ataque', 'defesa'] }),
      mv('cem-estocadas', 'Cem estocadas', 'Uma chuva de estocadas curtas, rápidas demais para contar.', 'Combo', [th(-14, 50, { back: 0.2 }), th(8, 50, { back: 0.2 }), th(-4, 50, { back: 0.2 }), th(14, 50, { back: 0.2 }), th(-10, 50, { back: 0.2 }), th(0, 65, { ghost: true })], { kw: ['cem', 'rajada', 'chuva de estocadas', 'frenesi'] }),
      mv('empalar', 'Empalar', 'Junta força e atravessa o alvo de lado a lado.', 'Estocada', [hd(0, 180, { glow: true, pull: 0.4 }), th(0, 110, { len: 0.6, pierce: true })], { body: LUNGE, windup: 200, react: 'knock', shake: 2, kw: ['empal', 'trespass', 'atravess'] }),
      mv('arremesso', 'Arremesso', 'Arremessa a própria haste como um dardo.', 'Arremesso', [tw({ self: true, spin: 0, arc: 0.35, speed: 14 })], { body: STAY, windup: 200, kw: ['arremess', 'atira'] }),
      mv('molinete', 'Molinete defensivo', 'Gira a haste à frente do corpo e emenda uma estocada.', 'Giro', [sp(1.5, 280, { front: true }), th(0, 85)], { body: WALK, kw: ['molinete', 'defensiv'] }),
      mv('golpe-ascendente', 'Golpe ascendente', 'Sobe a ponta por baixo e levanta o alvo.', 'Corte', [sw(100, -110, 150)], { react: 'launch' }),
      mv('recuo-e-estocada', 'Recuo e estocada', 'Dá um passo atrás para ganhar distância e crava a ponta.', 'Estocada', [th(0, 110, { len: 0.7 })], { body: { pre: 0.4, go: 0.5, hold: 0.6 }, kw: ['recu', 'distancia'] }),
      mv('lanca-de-ponto', 'Lança de Ponto', 'A ponta se cobre de água e gelo e explode no alvo.', 'Elemental', [hd(0, 200, { glow: true, pull: 0.3 }), th(0, 100, { pierce: true })], { el: 'Ponto', body: LUNGE, tags: ['elemento'], kw: ['gelo', 'agua', 'mare', 'relampago'] }),
      mv('justa', 'Justa', 'Carga a cavalo com a haste apoiada, como num torneio.', 'Montaria', [th(0, 170, { len: 0.5, pierce: true })], { mount: true, body: RIDE, windup: 220, react: 'knock', shake: 2, tags: ['montaria'], kw: ['justa', 'montad', 'cavalo', 'galope'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Prende o alvo com a haste para o aliado acertar.', 'Dupla', [th(0, 100)], { ally: true, body: LUNGE, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'adagas', label: 'Adagas e facas', desc: 'Adaga e faca de caça: perto do alvo, muitos golpes curtos, arremessos e truques.',
    tool: 'adaga', impact: 'cut', reach: 0.6,
    moves: [
      mv('corte-rapido', 'Corte rápido', 'Um talho curto, mais rápido que o olho.', 'Corte', [sw(-55, 55, 80)], { windup: 100 }),
      mv('estocada', 'Estocada', 'Crava a ponta entre as costelas.', 'Estocada', [th(0, 70, { back: 0.25 })], { body: LUNGE, impact: 'pierce', windup: 110 }),
      mv('estocada-dupla', 'Estocada dupla', 'Duas facadas em sequência.', 'Estocada', [th(-12, 60, { back: 0.2 }), th(12, 60, { back: 0.2 })], { body: LUNGE, impact: 'pierce', windup: 110, kw: ['dupla'] }),
      mv('rajada', 'Rajada de facadas', 'Corte, facada, corte, facada, corte.', 'Combo', [sw(-45, 40, 50), th(5, 45, { back: 0.2 }), sw(40, -45, 50), th(-8, 45, { back: 0.2 }), sw(-60, 50, 60, { ghost: true })], { body: WALK, windup: 100, kw: ['rajada', 'frenesi', 'furia'] }),
      mv('corte-cruzado', 'Corte cruzado', 'Dois talhos em X.', 'Combo', [sw(-110, 50, 80), sw(110, -50, 80)], { windup: 110, kw: ['cruzad', 'em x'] }),
      mv('pelas-costas', 'Punhalada pelas costas', 'Passa por trás do alvo e crava a lâmina nas costas.', 'Especial', [th(180, 80, { back: 0.2 })], { body: { pre: 0.2, go: 1, over: 1.4, hold: 0.55, ghost: true }, windup: 140, impact: 'pierce', kw: ['costas', 'traicoeir', 'furtiv', 'sorrateir'] }),
      mv('arremesso', 'Arremesso de adaga', 'Atira a adaga girando direto no alvo.', 'Arremesso', [tw({ self: true, spin: 5, speed: 15, arc: 0.2 })], { body: STAY, windup: 130, impact: 'pierce', kw: ['arremess', 'atira'] }),
      mv('leque-de-laminas', 'Leque de lâminas', 'Três lâminas arremessadas em leque.', 'Arremesso', [tw({ self: true, spin: 5, speed: 15, arc: 0.2, n: 3, spread: 0.45, stagger: 40 })], { body: STAY, windup: 150, impact: 'pierce', kw: ['leque', 'tres laminas', 'chuva de facas'] }),
      mv('corte-ascendente', 'Corte ascendente', 'Abre o alvo de baixo para cima.', 'Corte', [sw(85, -90, 90)], { react: 'launch', windup: 110 }),
      mv('giro', 'Giro', 'Gira rente ao alvo com a lâmina para fora.', 'Giro', [sp(1, 220)], { kw: ['giro', 'girat'] }),
      mv('bote', 'Bote', 'Salta como um gato e crava a lâmina de cima.', 'Salto', [th(45, 80, { back: 0.2 })], { body: LEAP, windup: 150, impact: 'pierce', kw: ['salto', 'bote', 'pulo'] }),
      mv('cortar-tendao', 'Cortar o tendão', 'Agacha e corta atrás do tornozelo.', 'Corte', [sw(10, 95, 90, { low: true })], { body: LOW, react: 'trip', windup: 120, kw: ['tendao', 'tornozelo', 'rasteir', 'perna'] }),
      mv('golpe-de-cabo', 'Golpe de cabo', 'Bate com o cabo na têmpora.', 'Esmagamento', [th(180, 60, { rev: true, back: 0.15, len: 0.05 })], { impact: 'pow', react: 'daze', kw: ['cabo', 'pomo'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Desvia com a lâmina curta e responde com uma facada.', 'Contra-ataque', [hd(-60, 140, { tink: true }), th(0, 70, { back: 0.2 })], { impact: 'pierce', kw: ['aparar', 'contra ataque', 'contra-ataque', 'defesa'] }),
      mv('finta', 'Finta', 'Ameaça um golpe alto e crava baixo.', 'Especial', [hd(-50, 120, { shake: true }), th(30, 70, { back: 0.2 })], { body: LUNGE, impact: 'pierce', kw: ['finta', 'engan', 'truque'] }),
      mv('golpe-na-garganta', 'Golpe na garganta', 'Mira com calma e crava de uma vez onde mais dói.', 'Especial', [hd(0, 220, { glow: true, pull: 0.3 }), th(-10, 60, { ghost: true, len: 0.4 })], { body: LUNGE, impact: 'pierce', react: 'knock', shake: 2, kw: ['garganta', 'final', 'finaliz', 'execu', 'assassin'] }),
      mv('lamina-de-erebo', 'Lâmina de Érebo', 'Vira sombra, atravessa o alvo e corta ao sair.', 'Elemental', [sw(-60, 80, 100, { ghost: true })], { el: 'Érebo', body: THROUGH, tags: ['elemento'], kw: ['sombra', 'sombrio', 'escurid'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Enquanto o aliado distrai, a adaga entra pelo flanco.', 'Dupla', [th(15, 70, { back: 0.2 })], { ally: true, body: LUNGE, impact: 'pierce', tags: ['dupla'], kw: ['dupla', 'aliado', 'flanco'] })
    ]
  },
  {
    id: 'correntes', label: 'Chicotes e correntes', desc: 'Chicote e mangual: a arma serpenteia até o alvo, enrola, puxa e estala.',
    tool: 'chicote', impact: 'cut', reach: 2.6, rope: true,
    moves: [
      mv('chicotada', 'Chicotada', 'A tira serpenteia e estala no alvo.', 'Chicotada', [ls(170)], { body: STAY }),
      mv('chicotada-dupla', 'Chicotada dupla', 'Duas chicotadas, ida e volta.', 'Chicotada', [ls(140, { amp: 0.5 }), ls(140, { amp: -0.5 })], { body: STAY, kw: ['dupla'] }),
      mv('estalo', 'Estalo', 'Estala a ponta bem no rosto do alvo.', 'Chicotada', [ls(180, { crack: true, amp: 0.25 })], { body: STAY, impact: 'pow', react: 'daze', kw: ['estalo', 'estala'] }),
      mv('chicotada-descendente', 'Chicotada de cima', 'Gira a arma acima da cabeça e desce sobre o alvo.', 'Chicotada', [ls(190, { over: true, amp: 0.7 })], { body: STAY, windup: 200, shake: 2 }),
      mv('rasteira', 'Rasteira', 'A tira corre no chão e laça os tornozelos.', 'Agarrar', [ls(180, { low: true, wrap: true })], { body: STAY, react: 'trip', kw: ['rasteir', 'tornozel', 'pernas'] }),
      mv('enrolar', 'Enrolar', 'A tira dá voltas no alvo e o prende.', 'Agarrar', [ls(200, { wrap: true })], { body: STAY, react: 'pull', impact: 'pow', kw: ['enrol', 'prender', 'amarr'] }),
      mv('puxao', 'Puxão', 'Enrola e puxa o alvo com força para perto.', 'Agarrar', [ls(180, { wrap: true }), hd(170, 160, { hit: true, tug: true })], { body: { pre: 0.1, go: 0, over: -0.3, hold: 1 }, react: 'pull', impact: 'pow', kw: ['puxa', 'puxao', 'arrast'] }),
      mv('giro', 'Giro', 'Gira a arma em volta do corpo e solta no alvo.', 'Giro', [sp(1.5, 320)], { body: STAY, kw: ['giro', 'girat', 'roda'] }),
      mv('laco', 'Laço', 'Roda a tira no alto como um laço e captura o alvo.', 'Agarrar', [sp(2, 320, { over: true }), ls(170, { wrap: true })], { body: STAY, react: 'pull', kw: ['laco', 'lacar'] }),
      mv('chicotada-em-x', 'Chicotada em X', 'Duas chicotadas diagonais que se cruzam.', 'Combo', [ls(130, { amp: 0.8 }), ls(130, { amp: -0.8 })], { body: STAY, kw: ['em x', 'cruzad'] }),
      mv('rajada', 'Rajada de chicotadas', 'Quatro estalos curtos seguidos.', 'Combo', [ls(90, { amp: 0.3 }), ls(90, { amp: -0.3 }), ls(90, { amp: 0.4 }), ls(110, { crack: true, amp: -0.2 })], { body: STAY, kw: ['rajada', 'frenesi', 'furia'] }),
      mv('desarmar', 'Desarmar', 'Laça a arma do alvo e arranca da mão dele.', 'Especial', [ls(180, { wrap: true }), hd(170, 120, { hit: true, tug: true })], { body: STAY, impact: 'pow', react: 'disarm', kw: ['desarm'] }),
      mv('salto', 'Chicotada saltando', 'Salta e chicoteia lá de cima.', 'Salto', [ls(170, { over: true })], { body: { pre: 0.1, dip: 0.12, go: 0.3, up: 0.7, hold: 1 }, windup: 180, kw: ['salto', 'pulo'] }),
      mv('estalo-no-chao', 'Estalo no chão', 'Estala no chão e a onda de poeira corre até o alvo.', 'Esmagamento', [ls(160, { low: true, crack: true }), gr(200)], { body: STAY, impact: 'crush', kw: ['chao', 'solo'] }),
      mv('corrente-tensa', 'Corrente tensa', 'Lança a ponta reta como uma lança.', 'Estocada', [ls(110, { amp: 0, straight: true })], { body: STAY, impact: 'pierce', kw: ['tensa', 'reta', 'lancad'] }),
      mv('chicote-de-brasas', 'Chicote de brasas', 'A tira pega fogo e deixa um rastro de brasas.', 'Elemental', [ls(190, { amp: 0.5 })], { el: 'Tártaro', body: STAY, tags: ['elemento'], kw: ['brasa', 'fogo', 'chama'] }),
      mv('golpe-final', 'Golpe final', 'Gira duas vezes ganhando força e estala com tudo.', 'Especial', [sp(2, 340), ls(170, { crack: true })], { body: STAY, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu'] })
    ]
  },
  {
    id: 'desarmado', label: 'Desarmado e manoplas', desc: 'Manoplas e garras de ferro: socos, ganchos, joelhadas e agarrões.',
    tool: 'manoplas', impact: 'pow', reach: 0.45,
    moves: [
      mv('jab', 'Jab', 'Soco curto e rápido com a mão da frente.', 'Estocada', [th(0, 55, { back: 0.25, len: 0.15 })], { windup: 80, body: LUNGE }),
      mv('direto', 'Direto', 'Soco reto com o peso do corpo.', 'Estocada', [th(0, 80, { back: 0.35, len: 0.2 })], { windup: 120, body: LUNGE, react: 'knock' }),
      mv('cruzado', 'Cruzado', 'Gancho de lado no queixo.', 'Corte', [sw(-85, 30, 90, { r: 0.8 })], { windup: 110 }),
      mv('uppercut', 'Uppercut', 'Soco de baixo para cima que tira o alvo do chão.', 'Corte', [sw(95, -65, 100, { r: 0.8 })], { windup: 130, body: LOW, react: 'launch', kw: ['uppercut', 'ascendente', 'queixo'] }),
      mv('um-dois', 'Um-dois', 'Jab e direto em sequência.', 'Combo', [th(-6, 55, { back: 0.2 }), th(6, 70, { back: 0.3 })], { windup: 90, body: LUNGE, kw: ['um dois', 'combo'] }),
      mv('combo-tres', 'Combo de três', 'Jab, direto e uppercut.', 'Combo', [th(-6, 55, { back: 0.2 }), th(6, 65, { back: 0.3 }), sw(95, -65, 90, { r: 0.8 })], { windup: 90, body: WALK, react: 'launch', kw: ['combo', 'tres', 'sequencia'] }),
      mv('soco-giratorio', 'Soco giratório', 'Gira o corpo e acerta com as costas do punho.', 'Giro', [sp(1, 220, { r: 0.8 })], { kw: ['girat', 'giro', 'costas do punho'] }),
      mv('soco-saltado', 'Soco saltado', 'Pula e desce o punho como um martelo.', 'Salto', [th(50, 90, { back: 0.3 })], { body: LEAP, windup: 160, shake: 2, kw: ['salto', 'pulo', 'martelo'] }),
      mv('ombrada', 'Ombrada', 'Corre e trombada com o ombro.', 'Investida', [hd(40, 140, { hit: true })], { body: DASH, windup: 160, impact: 'crush', react: 'knock', kw: ['ombrada', 'investida', 'trombada', 'carga'] }),
      mv('rajada', 'Rajada de socos', 'Seis socos curtos alternando as mãos.', 'Combo', [th(-10, 42, { back: 0.15 }), th(8, 42, { back: 0.15 }), th(-4, 42, { back: 0.15 }), th(12, 42, { back: 0.15 }), th(-8, 42, { back: 0.15 }), th(0, 60, { back: 0.3, ghost: true })], { windup: 90, body: LUNGE, kw: ['rajada', 'frenesi', 'furia', 'cem socos'] }),
      mv('soco-no-chao', 'Soco no chão', 'Bate no chão e a onda derruba o alvo.', 'Esmagamento', [sw(-150, 90, 120), gr(200)], { body: { pre: 0.1, dip: 0.2, go: 0, hold: 0.5 }, windup: 180, impact: 'crush', react: 'launch', shake: 2, kw: ['chao', 'solo', 'tremor'] }),
      mv('joelhada', 'Joelhada', 'Puxa o alvo e sobe o joelho.', 'Esmagamento', [hd(30, 70, { hit: false }), th(-30, 60, { back: 0.15, len: 0.05 })], { windup: 90, react: 'launch', kw: ['joelhada', 'joelho'] }),
      mv('aparar-contra', 'Aparar e contra-atacar', 'Bloqueia com o antebraço e devolve um direto.', 'Contra-ataque', [hd(-70, 140, { tink: true }), th(0, 70, { back: 0.3 })], { kw: ['aparar', 'contra ataque', 'contra-ataque', 'bloque', 'defesa'] }),
      mv('esquiva-e-contra', 'Esquiva e contra', 'Gira o tronco para fora do golpe e acerta de volta.', 'Contra-ataque', [hd(80, 140), th(0, 70, { back: 0.3 })], { body: { pre: 0.35, dip: 0.15, go: 1, hold: 0.8 }, kw: ['esquiv', 'gingado'] }),
      mv('agarrao', 'Agarrão', 'Agarra o alvo, levanta e joga no chão.', 'Agarrar', [th(0, 80, { back: 0.2, len: 0 })], { body: LUNGE, impact: 'crush', react: 'slam', shake: 2, kw: ['agarr', 'arremess', 'derrub', 'suplex'] }),
      mv('cotovelada', 'Cotovelada', 'Golpe curto de cotovelo, colado no alvo.', 'Esmagamento', [sw(-40, 20, 60, { r: 0.6 })], { windup: 80, body: LUNGE, react: 'daze', kw: ['cotovel'] }),
      mv('chute-giratorio', 'Chute giratório', 'Gira no calcanhar e acerta um chute largo.', 'Giro', [sp(1, 240, { low: true, r: 1.1 })], { body: CLOSE, react: 'knock', kw: ['chute', 'pontape'] }),
      mv('soco-carregado', 'Soco carregado', 'Treme o punho juntando força e solta um direto devastador.', 'Especial', [hd(180, 360, { glow: true, tremble: true }), th(0, 80, { back: 0.1, len: 0.3, ghost: true })], { body: LUNGE, shake: 3, react: 'knock', kw: ['carregad', 'final', 'finaliz', 'devastador'] }),
      mv('punho-de-tartaro', 'Punho de Tártaro', 'O punho pega fogo e explode no alvo.', 'Elemental', [hd(180, 200, { glow: true }), th(0, 80, { back: 0.3 })], { el: 'Tártaro', body: LUNGE, tags: ['elemento'], kw: ['flamejante', 'fogo', 'chama'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Segura o alvo para o aliado bater.', 'Dupla', [th(0, 80, { back: 0.3 })], { ally: true, body: LUNGE, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'escudo', label: 'Escudo', desc: 'Escudo como arma: empurrões, pancadas de borda, bloqueios e arremesso.',
    tool: 'escudo', impact: 'bash', reach: 0.55,
    moves: [
      mv('empurrao', 'Empurrão', 'Empurra com o escudo inteiro, soltando uma onda de choque.', 'Investida', [th(0, 110, { back: 0.25, len: 0.1, wave: true })], { body: LUNGE, react: 'knock', shake: 2 }),
      mv('golpe-de-borda', 'Golpe de borda', 'Bate com a borda do escudo de lado.', 'Esmagamento', [sw(-95, 40, 120, { r: 0.9 })], { kw: ['borda'] }),
      mv('investida', 'Investida com escudo', 'Corre escondido atrás do escudo e atropela.', 'Investida', [th(0, 150, { back: 0.1, len: 0.1, wave: true })], { body: DASH, windup: 180, react: 'knock', shake: 2, kw: ['investida', 'carga', 'atropel'] }),
      mv('aparar-e-refletir', 'Aparar e refletir', 'Segura o golpe e devolve a força numa onda.', 'Defesa', [hd(0, 200, { tink: true }), th(0, 90, { back: 0.15, len: 0.1, wave: true })], { kw: ['aparar', 'refletir', 'bloque', 'defesa', 'guard'] }),
      mv('contra-ataque', 'Contra-ataque', 'Bloqueia e emenda uma pancada com a borda.', 'Contra-ataque', [hd(0, 160, { tink: true }), sw(-95, 40, 110, { r: 0.9 })], { kw: ['contra ataque', 'contra-ataque'] }),
      mv('salto-esmagador', 'Salto esmagador', 'Salta e cai com o escudo por cima do alvo.', 'Salto', [th(60, 100, { back: 0.2, len: 0.1, quake: true })], { body: LEAP, windup: 180, impact: 'crush', shake: 3, kw: ['salto', 'pulo'] }),
      mv('arremesso', 'Arremesso de escudo', 'Arremessa o escudo girando, que volta para a mão.', 'Arremesso', [tw({ self: true, spin: 4, speed: 13, arc: 0.1, ret: true })], { body: STAY, windup: 170, kw: ['arremess', 'atira', 'bumerang'] }),
      mv('giro', 'Giro', 'Gira o corpo e bate com o escudo no embalo.', 'Giro', [sp(1, 260, { r: 0.9 })], { kw: ['giro', 'girat'] }),
      mv('golpe-duplo', 'Golpe duplo', 'Empurrão e pancada de borda em sequência.', 'Combo', [th(0, 90, { back: 0.2, len: 0.1, wave: true }), sw(-95, 40, 110, { r: 0.9 })], { body: WALK, kw: ['duplo', 'combo'] }),
      mv('muralha', 'Muralha', 'Finca os pés, o escudo brilha e a onda empurra tudo.', 'Defesa', [hd(0, 300, { glow: true }), th(0, 100, { back: 0.1, len: 0.1, wave: true })], { body: CLOSE, react: 'knock', shake: 2, kw: ['muralha', 'parede', 'inabal'] }),
      mv('rasteira', 'Rasteira', 'Desce a borda do escudo no pé do alvo.', 'Esmagamento', [sw(-20, 90, 100, { low: true, r: 0.9 })], { body: LOW, react: 'trip', kw: ['rasteir', 'pe', 'pernas'] }),
      mv('golpe-ascendente', 'Golpe ascendente', 'Sobe a borda por baixo do queixo.', 'Esmagamento', [sw(90, -80, 110, { r: 0.9 })], { react: 'launch', kw: ['ascendente', 'queixo'] }),
      mv('tremor', 'Tremor', 'Bate a borda do escudo no chão e a onda corre até o alvo.', 'Esmagamento', [sw(-120, 90, 120, { r: 0.9 }), gr(200)], { body: STAY, impact: 'crush', react: 'launch', shake: 2, kw: ['tremor', 'chao', 'sismic'] }),
      mv('ricochete', 'Ricochete', 'O escudo quica no chão antes de acertar o alvo.', 'Arremesso', [tw({ self: true, spin: 4, speed: 12, arc: 0.4, bounce: true, ret: true })], { body: STAY, windup: 170, kw: ['ricochet', 'quica'] }),
      mv('escudo-de-eter', 'Escudo de Éter', 'O escudo se enche de luz celestial e empurra o alvo.', 'Elemental', [hd(0, 220, { glow: true }), th(0, 100, { back: 0.15, len: 0.1, wave: true })], { el: 'Éter', body: LUNGE, react: 'knock', tags: ['elemento'], kw: ['sagrad', 'celest', 'luz', 'divin'] }),
      mv('golpe-em-dupla', 'Golpe em dupla', 'Segura o alvo contra o escudo enquanto o aliado ataca.', 'Dupla', [th(0, 100, { back: 0.2, len: 0.1, wave: true })], { ally: true, body: LUNGE, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] })
    ]
  },
  {
    id: 'arco', label: 'Arcos', desc: 'Arco curto e arco longo: tiros únicos, leques, chuvas de flechas e tiros carregados.',
    tool: 'arco', impact: 'pierce', reach: 0.4, ranged: true, proj: 'arrow',
    moves: [
      mv('tiro', 'Tiro', 'Puxa a corda e solta uma flecha.', 'Disparo', [sh()], { body: STAY, windup: 200 }),
      mv('tiro-duplo', 'Tiro duplo', 'Duas flechas, uma atrás da outra.', 'Disparo', [sh({ n: 2, stagger: 120 })], { body: STAY, windup: 200, kw: ['duplo', 'duas flechas'] }),
      mv('leque', 'Leque de flechas', 'Três flechas de uma vez, abertas em leque.', 'Disparo', [sh({ n: 3, spread: 0.6 })], { body: STAY, windup: 240, kw: ['leque', 'tres flechas', 'multipl'] }),
      mv('tiro-carregado', 'Tiro carregado', 'Segura a corda no limite até a flecha brilhar.', 'Especial', [hd(0, 360, { glow: true, aim: true }), sh({ big: true, speed: 24, pierce: true })], { body: STAY, windup: 200, react: 'knock', shake: 2, kw: ['carregad', 'poderos'] }),
      mv('chuva-de-flechas', 'Chuva de flechas', 'Atira para o alto e as flechas caem sobre o alvo.', 'Disparo', [sh({ sky: true, n: 6, spread: 0.9, stagger: 45 })], { body: STAY, windup: 240, kw: ['chuva', 'saraivada', 'ceu'] }),
      mv('tiro-perfurante', 'Tiro perfurante', 'A flecha atravessa o alvo e segue em frente.', 'Disparo', [sh({ pierce: true, speed: 22 })], { body: STAY, windup: 220, kw: ['perfur', 'atravess', 'trespass'] }),
      mv('tiro-rapido', 'Tiro rápido', 'Saca, encaixa e solta numa puxada curta.', 'Disparo', [sh({ speed: 20 })], { body: STAY, windup: 90, kw: ['rapido', 'saque'] }),
      mv('rajada-de-tres', 'Rajada de três', 'Três flechas soltas em sequência, quase sem intervalo.', 'Disparo', [sh({ n: 3, stagger: 90 })], { body: STAY, windup: 150, kw: ['rajada de tres', 'tres flechas', 'sequencia'] }),
      mv('tiro-alto', 'Tiro em parábola', 'A flecha sobe alto e cai no alvo.', 'Disparo', [sh({ arc: 2.4, speed: 12 })], { body: STAY, windup: 200, kw: ['parabola', 'alto', 'curva alta'] }),
      mv('tiro-saltando', 'Tiro saltando', 'Salta para trás e atira no ar.', 'Salto', [sh()], { body: BACK, windup: 180, kw: ['salto', 'pulo', 'saltando'] }),
      mv('queima-roupa', 'Tiro à queima-roupa', 'Chega perto e atira quase encostado.', 'Disparo', [sh({ speed: 30, wait: 220 })], { body: CLOSE, windup: 180, react: 'knock', kw: ['queima roupa', 'perto'] }),
      mv('rajada', 'Rajada', 'Cinco flechas seguidas, tão rápido quanto puxa.', 'Disparo', [sh({ n: 5, stagger: 70, spread: 0.2 })], { body: STAY, windup: 160, kw: ['rajada', 'frenesi'] }),
      mv('tiro-de-cobertura', 'Tiro de cobertura', 'Quatro flechas em volta do alvo para mantê-lo abaixado.', 'Disparo', [sh({ n: 4, stagger: 80, spread: 0.9 })], { body: { pre: 0.05, dip: 0.12, go: 0, hold: 0.4 }, windup: 160, react: 'stagger', kw: ['cobertura', 'supress', 'barragem'] }),
      mv('tiro-em-movimento', 'Tiro em movimento', 'Avança sem parar de atirar: duas flechas no caminho.', 'Disparo', [sh({ n: 2, stagger: 150 })], { body: { pre: 0, go: 0.45, hold: 1, dust: true }, windup: 140, kw: ['movimento', 'correndo', 'andando'] }),
      mv('flecha-ricochete', 'Flecha que ricocheteia', 'Quica no chão antes do alvo e sobe de surpresa.', 'Disparo', [sh({ bounce: true, speed: 15, arc: 0.2 })], { body: STAY, windup: 200, kw: ['ricochet', 'quica'] }),
      mv('flecha-explosiva', 'Flecha explosiva', 'Uma flecha com um saquinho de pólvora que estoura no alvo.', 'Especial', [hd(0, 220, { aim: true }), sh({ speed: 16, big: true })], { body: STAY, windup: 200, impact: 'blast', shake: 3, react: 'knock', el: 'Tártaro', kw: ['explosiv', 'polvora', 'bomba'] }),
      mv('flecha-arpao', 'Flecha de corda', 'Uma flecha amarrada numa corda que puxa o alvo.', 'Agarrar', [sh({ speed: 18, rope: true })], { body: { ...STAY, over: -0.35 }, windup: 220, react: 'pull', kw: ['corda', 'arpao', 'gancho'] }),
      mv('tiro-curvo', 'Tiro curvo', 'A flecha faz uma curva para contornar a cobertura.', 'Disparo', [sh({ curve: 1.2, speed: 13 })], { body: STAY, windup: 220, kw: ['curvo', 'curva', 'contorn'] }),
      mv('recuo-e-tiro', 'Recuo e tiro', 'Dá dois passos para trás e atira.', 'Disparo', [sh()], { body: { pre: 0.05, go: 0, over: -0.8, hold: 0.5, dust: true }, windup: 200, kw: ['recu', 'distancia'] }),
      mv('flecha-rasante', 'Flecha rasante', 'Atira baixo, rente ao chão, nas pernas.', 'Disparo', [sh({ arc: 0, low: true, speed: 20 })], { body: { pre: 0.05, dip: 0.15, go: 0, hold: 0.4 }, windup: 180, react: 'trip', kw: ['rasante', 'pernas', 'baixa'] }),
      mv('flecha-de-tartaro', 'Flecha de fogo', 'A ponta pega fogo com Tártaro antes de soltar.', 'Elemental', [hd(0, 200, { glow: true, aim: true }), sh()], { el: 'Tártaro', body: STAY, tags: ['elemento'], kw: ['fogo', 'chama', 'incendi'] }),
      mv('tiro-montado', 'Tiro montado', 'Atira em pleno galope.', 'Montaria', [sh({ speed: 20 })], { mount: true, body: { pre: 0.1, go: 0.35, hold: 1, dust: true }, windup: 220, tags: ['montaria'], kw: ['montad', 'cavalo', 'galope'] }),
      mv('tiro-em-dupla', 'Tiro em dupla', 'Atira junto com um aliado que ataca de perto.', 'Dupla', [sh()], { ally: true, body: STAY, windup: 200, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] }),
      mv('ponto-fraco', 'Tiro no ponto fraco', 'Prende a respiração, mira na fresta da armadura e solta.', 'Especial', [hd(0, 420, { aim: true }), sh({ speed: 28 })], { body: STAY, windup: 180, impact: 'pierce', react: 'stagger', kw: ['ponto fraco', 'mirad', 'mira', 'certeir', 'precis', 'critico'] }),
      mv('flecha-final', 'Flecha final', 'A flecha mais pesada da aljava, carregada até a corda gemer.', 'Especial', [hd(0, 420, { glow: true, aim: true, tremble: true }), sh({ big: true, speed: 26, pierce: true })], { body: STAY, windup: 200, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu'] })
    ]
  },
  {
    id: 'besta', label: 'Bestas', desc: 'Besta leve e besta: virotes retos e rápidos, recargas e disparos pesados.',
    tool: 'besta', impact: 'pierce', reach: 0.45, ranged: true, proj: 'bolt',
    moves: [
      mv('disparo', 'Disparo', 'Mira e solta o virote.', 'Disparo', [sh({ speed: 24, arc: 0.05 })], { body: STAY, windup: 170 }),
      mv('disparo-pesado', 'Disparo pesado', 'Um virote grosso que empurra o alvo para trás.', 'Disparo', [sh({ speed: 22, arc: 0.05, big: true })], { body: { ...STAY, over: -0.3 }, windup: 220, react: 'knock', shake: 2, kw: ['pesad'] }),
      mv('disparo-duplo', 'Disparo duplo', 'Dois virotes lado a lado.', 'Disparo', [sh({ n: 2, spread: 0.3, speed: 24, arc: 0.05 })], { body: STAY, windup: 200, kw: ['duplo', 'dois virotes'] }),
      mv('disparo-perfurante', 'Disparo perfurante', 'O virote atravessa o alvo.', 'Disparo', [sh({ pierce: true, speed: 28, arc: 0.03 })], { body: STAY, windup: 200, kw: ['perfur', 'atravess'] }),
      mv('recarga-manivela', 'Recarga com manivela', 'Gira a manivela, arma o virote pesado e dispara.', 'Disparo', [hd(-25, 360, { reload: true, crank: true }), sh({ speed: 24, arc: 0.05, big: true })], { body: STAY, windup: 140, react: 'knock', kw: ['manivela', 'armar'] }),
      mv('virote-ricochete', 'Virote ricocheteante', 'O virote quica numa pedra e acerta o alvo.', 'Disparo', [sh({ bounce: true, speed: 18, arc: 0.1 })], { body: STAY, windup: 190, kw: ['ricochet', 'quica'] }),
      mv('disparo-de-cobertura', 'Disparo de cobertura', 'Três virotes em volta do alvo para segurar o avanço.', 'Disparo', [sh({ n: 3, stagger: 130, spread: 0.8, speed: 24, arc: 0.05 })], { body: { pre: 0.05, dip: 0.12, go: 0, hold: 0.4 }, windup: 170, react: 'stagger', kw: ['cobertura', 'barragem'] }),
      mv('recarga-rapida', 'Recarga rápida', 'Dispara, recarrega num estalo e dispara de novo.', 'Combo', [sh({ speed: 24, arc: 0.05 }), hd(-30, 140, { reload: true }), sh({ speed: 24, arc: 0.05 })], { body: STAY, windup: 160, kw: ['recarga', 'recarreg'] }),
      mv('disparo-alto', 'Disparo em parábola', 'Mira para cima e o virote cai no alvo.', 'Disparo', [sh({ arc: 1.8, speed: 14 })], { body: STAY, windup: 200, kw: ['parabola', 'alto'] }),
      mv('rajada', 'Rajada', 'Três virotes seguidos de uma besta de repetição.', 'Disparo', [sh({ n: 3, stagger: 110, speed: 24, arc: 0.05 })], { body: STAY, windup: 170, kw: ['rajada', 'repeticao'] }),
      mv('disparo-carregado', 'Disparo carregado', 'Gira a manivela até o arco da besta brilhar.', 'Especial', [hd(0, 360, { glow: true, aim: true }), sh({ big: true, pierce: true, speed: 30, arc: 0.02 })], { body: STAY, windup: 180, react: 'knock', shake: 2, kw: ['carregad', 'poderos'] }),
      mv('saraivada', 'Saraivada', 'Virotes para o alto que caem em cima do alvo.', 'Disparo', [sh({ sky: true, n: 5, spread: 0.8, stagger: 55 })], { body: STAY, windup: 230, kw: ['saraivada', 'chuva'] }),
      mv('disparo-rasante', 'Disparo rasante', 'Ajoelha e atira nas pernas.', 'Disparo', [sh({ arc: 0, low: true, speed: 24 })], { body: { pre: 0.05, dip: 0.18, go: 0, hold: 0.4 }, windup: 180, react: 'trip', kw: ['rasante', 'ajoelh', 'pernas'] }),
      mv('disparo-saltando', 'Disparo saltando', 'Salta para trás e dispara no ar.', 'Salto', [sh({ speed: 24, arc: 0.05 })], { body: BACK, windup: 180, kw: ['salto', 'pulo', 'saltando'] }),
      mv('queima-roupa', 'Disparo à queima-roupa', 'Encosta a besta no alvo e dispara.', 'Disparo', [sh({ speed: 34, arc: 0, wait: 220 })], { body: CLOSE, windup: 160, react: 'knock', shake: 2, kw: ['queima roupa', 'perto'] }),
      mv('coronhada', 'Coronhada', 'Vira a besta e bate com a coronha.', 'Esmagamento', [th(180, 80, { rev: true, back: 0.2, len: 0.1 })], { body: LUNGE, impact: 'pow', react: 'daze', kw: ['coronha'] }),
      mv('virote-explosivo', 'Virote explosivo', 'Um virote com carga de Tártaro que explode no alvo.', 'Elemental', [hd(0, 200, { glow: true, aim: true }), sh({ speed: 22, arc: 0.05 })], { el: 'Tártaro', body: STAY, impact: 'blast', shake: 3, tags: ['elemento'], kw: ['explosiv', 'fogo', 'bomba'] }),
      mv('disparo-montado', 'Disparo montado', 'Dispara de cima do cavalo.', 'Montaria', [sh({ speed: 24, arc: 0.05 })], { mount: true, body: { pre: 0.1, go: 0.35, hold: 1, dust: true }, windup: 220, tags: ['montaria'], kw: ['montad', 'cavalo', 'galope'] }),
      mv('virote-final', 'Virote final', 'Mira longa, respiração presa e um virote que derruba.', 'Especial', [hd(0, 420, { aim: true, glow: true, tremble: true }), sh({ big: true, speed: 32, arc: 0, pierce: true })], { body: STAY, windup: 180, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu'] })
    ]
  },
  {
    id: 'arremesso', label: 'Arremesso', desc: 'Dardos, azagaia e funda: tudo que sai da mão voando.',
    tool: 'dardos', impact: 'pierce', reach: 0.5, ranged: true, proj: 'dart',
    moves: [
      mv('arremesso', 'Arremesso', 'Atira com o braço inteiro.', 'Arremesso', [tw({ speed: 14, arc: 0.4 })], { body: STAY, windup: 180 }),
      mv('leque', 'Leque', 'Três projéteis abertos em leque.', 'Arremesso', [tw({ n: 3, spread: 0.6, speed: 14, arc: 0.3 })], { body: STAY, windup: 200, kw: ['leque', 'tres'] }),
      mv('rajada', 'Rajada', 'Três arremessos seguidos, um em cada mão.', 'Arremesso', [tw({ n: 3, stagger: 90, speed: 15, arc: 0.3 })], { body: STAY, windup: 150, kw: ['rajada', 'sequencia'] }),
      mv('arremesso-alto', 'Arremesso alto', 'Atira para o alto e o projétil cai sobre o alvo.', 'Arremesso', [tw({ arc: 2.2, speed: 10 })], { body: STAY, windup: 200, kw: ['alto', 'parabola'] }),
      mv('arremesso-giratorio', 'Arremesso giratório', 'Gira o corpo e solta no embalo.', 'Giro', [sp(1, 220, { r: 0.7, hit: false }), tw({ speed: 15, arc: 0.3, spin: 4 })], { body: STAY, windup: 140, kw: ['girat', 'giro'] }),
      mv('arremesso-saltando', 'Arremesso saltando', 'Salta e atira lá de cima.', 'Salto', [tw({ speed: 14, arc: 0.2 })], { body: { pre: 0.1, dip: 0.12, go: 0, up: 0.8, hold: 1 }, windup: 180, kw: ['salto', 'pulo', 'saltando'] }),
      mv('recuo-e-arremesso', 'Recuo e arremesso', 'Pula para trás e atira enquanto recua.', 'Arremesso', [tw({ speed: 14, arc: 0.3 })], { body: BACK, windup: 160, kw: ['recu', 'distancia'] }),
      mv('rasante', 'Arremesso rasante', 'Rente ao chão, direto nas pernas.', 'Arremesso', [tw({ speed: 16, arc: 0, low: true })], { body: { pre: 0.05, dip: 0.15, go: 0, hold: 0.4 }, windup: 160, react: 'trip', kw: ['rasante', 'pernas'] }),
      mv('chuva', 'Chuva', 'Um punhado jogado para o alto que cai no alvo.', 'Arremesso', [tw({ sky: true, n: 5, spread: 0.8, stagger: 50 })], { body: STAY, windup: 220, kw: ['chuva', 'saraivada'] }),
      mv('arremesso-duplo', 'Arremesso duplo', 'Um com cada mão, ao mesmo tempo.', 'Arremesso', [tw({ n: 2, spread: 0.35, speed: 14, arc: 0.3 })], { body: STAY, windup: 170, kw: ['duplo'] }),
      mv('arremesso-perfurante', 'Arremesso perfurante', 'Tão forte que atravessa o alvo.', 'Arremesso', [tw({ speed: 20, arc: 0.15, pierce: true })], { body: { ...STAY, pre: 0.25 }, windup: 220, kw: ['perfur', 'atravess'] }),
      mv('arremesso-curvo', 'Arremesso curvo', 'Com efeito, faz uma curva no ar.', 'Arremesso', [tw({ curve: 1.1, speed: 12, arc: 0.2 })], { body: STAY, windup: 190, kw: ['curvo', 'curva', 'efeito'] }),
      mv('golpe-de-mao', 'Golpe de mão', 'Usa o projétil na mão como punhal.', 'Estocada', [th(0, 70, { back: 0.2, len: 0.05 })], { body: LUNGE, windup: 120, kw: ['mao', 'punhal', 'corpo a corpo'] }),
      mv('arremesso-carregado', 'Arremesso carregado', 'Mira com calma e atira com toda a força.', 'Especial', [hd(-100, 300, { glow: true }), tw({ speed: 20, arc: 0.15 })], { body: STAY, windup: 160, react: 'knock', kw: ['carregad', 'forte', 'mirad'] }),
      mv('ricochete', 'Ricochete', 'Quica no chão e sobe no alvo.', 'Arremesso', [tw({ speed: 13, arc: 0.3, bounce: true })], { body: STAY, windup: 180, kw: ['ricochet', 'quica'] }),
      mv('arremesso-de-nix', 'Arremesso de Nix', 'O projétil deixa um rastro de estrelas da noite.', 'Elemental', [hd(-100, 200, { glow: true }), tw({ speed: 14, arc: 0.4 })], { el: 'Nix', body: STAY, tags: ['elemento'], kw: ['estrela', 'noite', 'lunar'] }),
      mv('arremesso-em-dupla', 'Arremesso em dupla', 'Atira enquanto o aliado avança sobre o alvo.', 'Dupla', [tw({ speed: 14, arc: 0.3 })], { ally: true, body: STAY, windup: 180, tags: ['dupla'], kw: ['dupla', 'aliado', 'conjunto'] }),
      mv('arremesso-final', 'Arremesso final', 'O arremesso mais forte, com o corpo todo.', 'Especial', [hd(-150, 320, { glow: true, tremble: true }), tw({ speed: 22, arc: 0.1, pierce: true })], { body: { ...STAY, pre: 0.3 }, windup: 180, shake: 3, react: 'knock', kw: ['final', 'finaliz', 'execu'] })
    ]
  }
];

// ---------------------------------------------------------------- armas
// Cada arma: familia, sprite (held.js), ajustes e tecnicas exclusivas.
//   trail: fino | medio | largo | pesado  (formato do rastro)
//   sparks: aco | faisca | lasca | pedra | ouro  (cor das faiscas)
//   quake: todo acerto solta onda no chao (martelo)
//   proj: projetil da arma (arrow, bolt, dart, javelin, stone)
export const WEAPONS = [
  { id: 'espada-curta', name: 'Espada curta', fam: 'leves', held: 'espada-curta', trail: 'fino', sparks: 'aco', extra: [
    mv('gladio-no-flanco', 'Gládio no flanco', 'Encosta no alvo e crava a lâmina curta por baixo da guarda.', 'Estocada', [th(25, 70, { back: 0.2 })], { body: LUNGE, impact: 'pierce', kw: ['flanco', 'gladio'] }),
    mv('cortes-curtos', 'Cortes curtos', 'Dois talhos curtos e secos, quase sem recuar o braço.', 'Combo', [sw(-45, 40, 70), sw(40, -45, 70)], { kw: ['cortes curtos', 'talho'] })
  ] },
  { id: 'espada-longa', name: 'Espada longa', fam: 'leves', held: 'espada-longa', trail: 'medio', sparks: 'aco', extra: [
    mv('meia-espada', 'Meia-espada', 'Segura a lâmina pelo meio e crava como uma lança curta.', 'Estocada', [th(-8, 100, { len: 0.45, pierce: true })], { body: LUNGE, impact: 'pierce', kw: ['meia espada'] }),
    mv('corte-do-falcao', 'Corte do falcão', 'Salta bem alto e desce como um falcão.', 'Salto', [sw(-175, 50, 160, { quake: true, ghost: true })], { body: HIGH, windup: 200, shake: 2, kw: ['falcao', 'mergulho'] })
  ] },
  { id: 'sabre', name: 'Sabre', fam: 'leves', held: 'cimitarra', trail: 'largo', sparks: 'aco', extra: [
    mv('corte-de-cavalaria', 'Corte de cavalaria', 'Golpe largo de cima do cavalo, a lâmina curva rasgando.', 'Montaria', [sw(-150, 80, 150, { r: 1.15 })], { mount: true, body: RIDE, windup: 200, tags: ['montaria'], kw: ['cavalaria'] }),
    mv('molinete', 'Molinete', 'Gira o sabre no pulso, dois círculos, e corta.', 'Giro', [sp(2, 260, { front: true, r: 0.9 }), sw(-60, 60, 90)], { kw: ['molinete', 'pulso'] })
  ] },
  { id: 'rapieira', name: 'Rapieira', fam: 'leves', held: 'rapieira', trail: 'fino', sparks: 'aco', extra: [
    mv('fleche', 'Flecha do esgrimista', 'Atravessa a distância num pulo e crava a ponta fina.', 'Investida', [th(0, 120, { len: 0.4, ghost: true })], { body: DASH, windup: 150, impact: 'pierce', kw: ['fleche', 'esgrim'] }),
    mv('cem-estocadas', 'Cem estocadas', 'Uma nuvem de estocadas finas em volta do coração do alvo.', 'Combo', [th(-12, 45, { back: 0.2 }), th(10, 45, { back: 0.2 }), th(-5, 45, { back: 0.2 }), th(14, 45, { back: 0.2 }), th(-9, 45, { back: 0.2 }), th(0, 60, { ghost: true })], { body: LUNGE, impact: 'pierce', kw: ['cem', 'nuvem'] })
  ] },
  { id: 'foice', name: 'Foice', fam: 'leves', held: 'foice-curta', trail: 'largo', sparks: 'aco', extra: [
    mv('gancho-da-foice', 'Gancho da foice', 'Engancha o alvo pela lâmina curva e puxa.', 'Agarrar', [sw(130, -30, 120)], { react: 'pull', kw: ['gancho', 'enganch', 'puxa'] }),
    mv('ceifa-baixa', 'Ceifa baixa', 'Corta rente ao chão como quem colhe trigo.', 'Corte', [sw(-60, 100, 140, { low: true, r: 1.1 })], { body: LOW, react: 'trip', kw: ['ceifa', 'colh'] })
  ] },
  { id: 'montante', name: 'Montante', fam: 'pesadas', held: 'montante', trail: 'pesado', sparks: 'aco', extra: [
    mv('giro-do-montante', 'Giro do montante', 'Uma volta e meia com a lâmina enorme estendida.', 'Giro', [sp(1.5, 380, { r: 1.25, ghost: true })], { windup: 220, react: 'knock', kw: ['giro do montante'] }),
    mv('meia-espada-pesada', 'Meia-espada pesada', 'Segura a lâmina pelo meio e empurra a ponta com o corpo.', 'Estocada', [th(0, 120, { len: 0.5, pierce: true })], { body: LUNGE, impact: 'pierce', kw: ['meia espada'] })
  ] },
  { id: 'machado-de-guerra', name: 'Machado de guerra', fam: 'pesadas', held: 'machado-de-guerra', trail: 'largo', sparks: 'faisca', impact: 'cut', extra: [
    mv('racha-cranio', 'Racha-crânio', 'Desce o machado reto no topo da cabeça.', 'Esmagamento', [sw(-178, 30, 130, { quake: true })], { windup: 260, impact: 'cut', shake: 3, react: 'daze', kw: ['racha', 'cranio'] }),
    mv('machado-arremessado', 'Machado arremessado', 'Arremessa o machado pesado, girando como uma roda.', 'Arremesso', [tw({ self: true, spin: 3, speed: 10, arc: 0.5 })], { body: STAY, windup: 240, shake: 2, kw: ['arremess', 'atira'] })
  ] },
  { id: 'martelo-de-guerra', name: 'Martelo de guerra', fam: 'pesadas', held: 'martelo', trail: 'pesado', sparks: 'pedra', quake: true, extra: [
    mv('martelo-do-trovao', 'Martelo do trovão', 'O martelo junta raios e desce num estrondo.', 'Elemental', [hd(-170, 280, { glow: true, tremble: true }), sw(-170, 40, 140, { quake: true })], { el: 'Ponto', windup: 200, shake: 4, react: 'knock', tags: ['elemento'], kw: ['trovao', 'raio', 'relampago'] }),
    mv('arremesso-do-martelo', 'Arremesso do martelo', 'Atira o martelo girando, que volta para a mão.', 'Arremesso', [tw({ self: true, spin: 3, speed: 11, arc: 0.4, ret: true })], { body: STAY, windup: 240, shake: 2, kw: ['arremess', 'atira', 'volta'] })
  ] },
  { id: 'maca', name: 'Maça', fam: 'uma-mao', held: 'maca', trail: 'medio', sparks: 'faisca', extra: [
    mv('esmagar-armadura', 'Esmagar armadura', 'Golpe de cima pensado para amassar placas de metal.', 'Esmagamento', [sw(-150, 40, 130, { quake: true })], { windup: 200, impact: 'pow', react: 'stagger', shake: 2, kw: ['armadura', 'amass'] }),
    mv('maca-sagrada', 'Maça sagrada', 'A maça se acende com luz de Éter e abençoa o golpe.', 'Elemental', [hd(-140, 220, { glow: true }), sw(-140, 40, 130)], { el: 'Éter', tags: ['elemento'], kw: ['sagrad', 'santa', 'divin'] })
  ] },
  { id: 'machadinha', name: 'Machadinha', fam: 'uma-mao', held: 'machadinha', trail: 'largo', sparks: 'faisca', impact: 'cut', extra: [
    mv('machadinha-giratoria', 'Machadinha giratória', 'Arremessa a machadinha girando e ela volta para a mão.', 'Arremesso', [tw({ self: true, spin: 5, speed: 13, arc: 0.3, ret: true })], { body: STAY, windup: 160, kw: ['volta', 'bumerang', 'giratoria'] }),
    mv('gancho-de-machadinha', 'Gancho de machadinha', 'Engancha o alvo pela barba do machado e puxa.', 'Agarrar', [sw(120, -40, 110)], { react: 'pull', kw: ['gancho', 'enganch', 'puxa'] })
  ] },
  { id: 'lanca', name: 'Lança', fam: 'haste', held: 'lanca', trail: 'fino', sparks: 'aco', extra: [
    mv('parede-de-lancas', 'Parede de lanças', 'Três estocadas abertas em leque, fechando a passagem.', 'Estocada', [th(-30, 70), th(30, 70), th(0, 80)], { body: LUNGE, kw: ['parede', 'leque'] }),
    mv('lanca-cadente', 'Lança cadente', 'Salta altíssimo e cai com a lança apontada para baixo.', 'Salto', [th(70, 120, { len: 0.4, quake: true })], { body: { ...HIGH, up: 1.8 }, windup: 220, shake: 3, kw: ['cadente', 'dragao'] })
  ] },
  { id: 'alabarda', name: 'Alabarda', fam: 'haste', held: 'alabarda', trail: 'largo', sparks: 'aco', extra: [
    mv('gancho-da-alabarda', 'Gancho da alabarda', 'Engancha o alvo com o espigão de trás e derruba.', 'Agarrar', [sw(130, -20, 140)], { react: 'pull', impact: 'pow', kw: ['gancho', 'enganch', 'derrub'] }),
    mv('machado-de-haste', 'Machado de haste', 'Usa a lâmina de machado da alabarda num golpe de cima.', 'Esmagamento', [sw(-170, 40, 150, { quake: true })], { windup: 230, impact: 'cut', shake: 3, kw: ['machado'] })
  ] },
  { id: 'gadanha', name: 'Gadanha', fam: 'haste', held: 'foice', trail: 'pesado', sparks: 'aco', impact: 'cut', extra: [
    mv('ceifa-da-gadanha', 'Ceifa da gadanha', 'Um arco gigantesco com a lâmina curva da gadanha.', 'Corte', [sw(-160, 160, 300, { r: 1.3 })], { windup: 220, body: CLOSE, react: 'knock', kw: ['ceifa', 'colheita'] }),
    mv('colheita-das-almas', 'Colheita das almas', 'Gira a gadanha envolta em sombra de Érebo.', 'Elemental', [sp(1.5, 360, { ghost: true })], { el: 'Érebo', windup: 200, tags: ['elemento'], kw: ['alma', 'sombra', 'morte'] })
  ] },
  { id: 'cajado', name: 'Cajado', fam: 'haste', held: 'cajado-cristal', trail: 'medio', sparks: 'ouro', impact: 'crush', extra: [
    mv('ponta-arcana', 'Ponta arcana', 'O cristal do cajado estoura energia de Caos na estocada.', 'Elemental', [hd(0, 200, { glow: true }), th(0, 90)], { el: 'Caos', body: LUNGE, impact: 'pow', tags: ['elemento'], kw: ['arcan', 'cristal', 'caos'] }),
    mv('luz-do-cajado', 'Luz do cajado', 'Ergue o cajado, o cristal brilha com Éter e desce no alvo.', 'Elemental', [hd(-90, 240, { glow: true }), sw(-150, 30, 140)], { el: 'Éter', tags: ['elemento'], kw: ['luz', 'celest', 'sagrad'] })
  ] },
  { id: 'bordao', name: 'Bordão', fam: 'haste', held: 'bordao', trail: 'medio', sparks: 'lasca', impact: 'crush', extra: [
    mv('duas-pontas', 'Duas pontas', 'Bate com uma ponta e emenda com a outra.', 'Combo', [th(0, 80), th(180, 80, { rev: true })], { body: LUNGE, kw: ['duas pontas', 'ponta dupla'] }),
    mv('salto-do-peregrino', 'Salto do peregrino', 'Finca o bordão, salta por cima e cai batendo.', 'Salto', [sw(-170, 40, 150, { quake: true })], { body: HIGH, windup: 220, shake: 2, kw: ['peregrino', 'vara'] })
  ] },
  { id: 'adaga', name: 'Adaga', fam: 'adagas', held: 'adaga', trail: 'fino', sparks: 'aco', extra: [
    mv('danca-das-adagas', 'Dança das adagas', 'Gira em volta do alvo cortando de todos os lados.', 'Giro', [sp(1, 160, { ghost: true }), sw(-60, 60, 70), sp(1, 160, { ghost: true })], { body: WALK, kw: ['danca'] }),
    mv('punhal-oculto', 'Punhal oculto', 'Esconde a lâmina junto ao corpo e crava por baixo.', 'Estocada', [hd(80, 150), th(-35, 60, { back: 0.15 })], { body: LUNGE, impact: 'pierce', kw: ['oculto', 'escondid'] })
  ] },
  { id: 'faca-de-caca', name: 'Faca de caça', fam: 'adagas', held: 'faca-de-caca', trail: 'medio', sparks: 'aco', extra: [
    mv('esfolar', 'Esfolar', 'Dois cortes descendentes fundos, como quem tira o couro.', 'Combo', [sw(-120, 40, 80), sw(-110, 50, 80)], { kw: ['esfol', 'couro'] }),
    mv('bote-do-cacador', 'Bote do caçador', 'Corre abaixado e crava a faca de uma vez.', 'Investida', [th(10, 80, { ghost: true })], { body: DASH, windup: 150, impact: 'pierce', kw: ['cacador', 'presa'] })
  ] },
  { id: 'chicote', name: 'Chicote', fam: 'correntes', held: 'chicote', trail: 'fino', sparks: 'lasca', extra: [
    mv('estalo-duplo', 'Estalo duplo', 'Dois estalos tão rápidos que soam como um só.', 'Chicotada', [ls(120, { crack: true, amp: 0.3 }), ls(120, { crack: true, amp: -0.3 })], { body: STAY, impact: 'pow', react: 'daze', kw: ['estalo duplo'] }),
    mv('laco-do-domador', 'Laço do domador', 'Enrola o pescoço do alvo e o força a se curvar.', 'Agarrar', [ls(200, { wrap: true }), hd(170, 180, { hit: true, tug: true })], { body: STAY, react: 'trip', impact: 'pow', kw: ['domador', 'pescoco'] })
  ] },
  { id: 'mangual', name: 'Mangual', fam: 'correntes', held: 'mangual', trail: 'pesado', sparks: 'faisca', impact: 'crush', rope: 'chain', reach: 1.4, extra: [
    mv('bola-de-demolicao', 'Bola de demolição', 'Gira a bola acima da cabeça e a desce como uma marreta.', 'Esmagamento', [sp(2, 340, { over: true }), ls(160, { over: true, quake: true })], { body: CLOSE, shake: 3, react: 'knock', kw: ['demolic', 'marreta'] }),
    mv('mangual-giratorio', 'Mangual giratório', 'Três voltas com a bola à frente, uma barreira de ferro.', 'Giro', [sp(3, 420, { front: true })], { body: CLOSE, kw: ['barreira', 'tres voltas'] })
  ] },
  { id: 'manoplas', name: 'Manoplas', fam: 'desarmado', held: 'manoplas', trail: 'medio', sparks: 'faisca', extra: [
    mv('punho-de-ferro', 'Punho de ferro', 'Direto blindado que amassa o alvo e treme o chão.', 'Esmagamento', [th(0, 90, { back: 0.35, len: 0.25, quake: true })], { body: LUNGE, windup: 180, impact: 'crush', react: 'knock', shake: 3, kw: ['punho de ferro', 'blindad'] }),
    mv('martelo-duplo', 'Martelo duplo', 'Junta as duas manoplas e desce como um martelo.', 'Esmagamento', [sw(-160, 60, 120, { r: 0.8, quake: true })], { body: LEAP, windup: 180, impact: 'crush', shake: 2, kw: ['martelo duplo', 'duas maos'] })
  ] },
  { id: 'garras-de-ferro', name: 'Garras de ferro', fam: 'desarmado', held: 'garras-de-ferro', trail: 'garra', sparks: 'aco', impact: 'claw', extra: [
    mv('rasgar', 'Rasgar', 'Duas patadas de garra, de cima e de baixo.', 'Combo', [sw(-90, 40, 80, { multi: 3 }), sw(80, -60, 80, { multi: 3 })], { kw: ['rasga', 'patada'] }),
    mv('frenesi-de-garras', 'Frenesi de garras', 'Seis riscos de garra seguidos, sem pausa.', 'Combo', [sw(-70, 40, 55, { multi: 3 }), sw(40, -70, 55, { multi: 3 }), sw(-70, 40, 55, { multi: 3 }), sw(40, -70, 55, { multi: 3 }), sw(-70, 40, 55, { multi: 3 }), sw(-100, 50, 70, { multi: 3, ghost: true })], { body: WALK, kw: ['frenesi', 'garras'] })
  ] },
  { id: 'escudo', name: 'Escudo', fam: 'escudo', held: 'escudo', trail: 'largo', sparks: 'aco', extra: [
    mv('guarda-inabalavel', 'Guarda inabalável', 'Apara dois golpes seguidos e devolve com um empurrão.', 'Defesa', [hd(-10, 140, { tink: true }), hd(10, 140, { tink: true }), th(0, 100, { back: 0.15, len: 0.1, wave: true })], { react: 'knock', shake: 2, kw: ['inabal', 'guarda'] })
  ] },
  { id: 'arco-curto', name: 'Arco curto', fam: 'arco', held: 'arco', trail: 'fino', sparks: 'aco', proj: 'arrow', extra: [
    mv('tiro-agil', 'Tiro ágil', 'Pula de lado e atira duas flechas no ar.', 'Disparo', [sh({ n: 2, stagger: 70 })], { body: { pre: 0.05, go: 0, over: -0.3, up: 0.5, hold: 0.8 }, windup: 140, kw: ['agil', 'acrobat'] })
  ] },
  { id: 'arco-longo', name: 'Arco longo', fam: 'arco', held: 'arco-longo', trail: 'fino', sparks: 'aco', proj: 'arrow', extra: [
    mv('tiro-de-longo-alcance', 'Tiro de longo alcance', 'Mira para o céu e acerta o alvo lá longe.', 'Disparo', [hd(-30, 240, { aim: true }), sh({ arc: 3, speed: 14 })], { body: STAY, windup: 200, kw: ['longo alcance', 'distante'] }),
    mv('flecha-de-guerra', 'Flecha de guerra', 'Uma flecha grossa de ponta larga que derruba.', 'Disparo', [sh({ big: true, speed: 20 })], { body: { ...STAY, over: -0.25 }, windup: 260, react: 'knock', shake: 2, kw: ['guerra', 'ponta larga'] })
  ] },
  { id: 'besta-leve', name: 'Besta leve', fam: 'besta', held: 'besta-leve', trail: 'fino', sparks: 'aco', proj: 'bolt', extra: [
    mv('disparo-de-quadril', 'Disparo de quadril', 'Saca e atira da cintura, sem mirar.', 'Disparo', [sh({ speed: 26, arc: 0.05 })], { body: STAY, windup: 80, kw: ['quadril', 'saque'] })
  ] },
  { id: 'besta', name: 'Besta', fam: 'besta', held: 'besta', trail: 'fino', sparks: 'aco', proj: 'bolt', extra: [
    mv('virote-arpao', 'Virote arpão', 'Um virote preso a uma corda que puxa o alvo.', 'Agarrar', [sh({ speed: 24, arc: 0.05, rope: true })], { body: { ...STAY, over: -0.3 }, windup: 200, react: 'pull', kw: ['arpao', 'corda'] })
  ] },
  { id: 'dardos', name: 'Dardos', fam: 'arremesso', held: 'dardos', trail: 'fino', sparks: 'aco', proj: 'dart', extra: [
    mv('tres-dardos', 'Três dardos', 'Três dardos em linha, quase colados.', 'Arremesso', [tw({ n: 3, stagger: 40, speed: 18, arc: 0.15 })], { body: STAY, windup: 140, kw: ['tres dardos'] })
  ] },
  { id: 'azagaia', name: 'Azagaia', fam: 'arremesso', held: 'azagaia', trail: 'medio', sparks: 'aco', proj: 'javelin', extra: [
    mv('azagaia-poderosa', 'Azagaia poderosa', 'Corre três passos e arremessa com o corpo todo.', 'Arremesso', [tw({ speed: 18, arc: 0.4, pierce: true })], { body: { pre: 0.4, go: 0.3, hold: 0.8, dust: true }, windup: 220, react: 'knock', shake: 2, kw: ['poderosa', 'corrida'] }),
    mv('investida-com-azagaia', 'Investida com azagaia', 'Usa a azagaia como lança curta numa corrida.', 'Investida', [th(0, 140, { ghost: true })], { body: DASH, windup: 170, react: 'knock', kw: ['investida', 'carga'] })
  ] },
  { id: 'machadinha-arremesso', name: 'Machadinha arremessada', fam: 'arremesso', held: 'machadinha', trail: 'largo', sparks: 'faisca', proj: 'self', impact: 'cut', alias: true, extra: [
    mv('machadinha-bumerangue', 'Machadinha bumerangue', 'A machadinha gira no alvo e volta para a mão.', 'Arremesso', [tw({ speed: 13, arc: 0.3, spin: 5, ret: true })], { body: STAY, windup: 170, kw: ['bumerang', 'volta'] }),
    mv('duas-machadinhas', 'Duas machadinhas', 'Uma machadinha em cada mão, arremessadas juntas.', 'Arremesso', [tw({ n: 2, spread: 0.3, speed: 13, arc: 0.35, spin: 4 })], { body: STAY, windup: 190, kw: ['duas machadinhas', 'par'] })
  ] },
  { id: 'funda', name: 'Funda', fam: 'arremesso', held: 'funda', trail: 'fino', sparks: 'pedra', proj: 'stone', impact: 'crush', sling: true, extra: [
    mv('pedra-pesada', 'Pedra pesada', 'Uma pedra do tamanho de um punho, girada até zunir.', 'Esmagamento', [tw({ speed: 13, arc: 0.4, big: true })], { body: STAY, windup: 320, react: 'daze', shake: 2, kw: ['pesada', 'pedra grande'] }),
    mv('giro-da-funda', 'Giro da funda', 'Gira a funda acima da cabeça ganhando força e solta.', 'Giro', [sp(2, 300, { over: true, hit: false }), tw({ speed: 16, arc: 0.3 })], { body: STAY, windup: 120, shake: 2, kw: ['giro', 'gira'] }),
    mv('cascalho', 'Cascalho', 'Um punhado de pedrinhas espalhadas de uma vez.', 'Arremesso', [tw({ n: 5, spread: 0.7, speed: 15, arc: 0.3, small: true })], { body: STAY, windup: 180, kw: ['cascalho', 'pedrinhas'] })
  ] }
];

export const FAMILY_OF = Object.fromEntries(WEAPON_FAMILIES.map((f) => [f.id, f]));
export const WEAPON_OF = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
