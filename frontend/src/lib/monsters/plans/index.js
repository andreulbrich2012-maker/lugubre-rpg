// Registro dos planos de corpo. Cada plano pinta as 3 vistas (frente, lado, costas)
// a partir dos parametros da base; as ~80 bases sao combinacoes desenhadas a mao
// destes planos (proporcoes, orelhas, chifres, caudas, asas, materiais).
import { quad } from './quad.js';
import { biped } from './biped.js';
import { flyer } from './flyer.js';
import { blob } from './blob.js';
import { floater } from './floater.js';
import { serpent } from './serpent.js';
import { crawler, fish } from './crawler.js';

export const PLANS = { quad, biped, flyer, blob, floater, serpent, crawler, fish };
