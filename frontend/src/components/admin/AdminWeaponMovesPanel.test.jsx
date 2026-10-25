import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import AdminAnimationsPage from './AdminAnimationsPage';
import AdminWeaponMovesPanel from './AdminWeaponMovesPanel';

// Fumaca: a galeria monta sem erro (sem DOM, so render no servidor).
describe('galeria de golpes', () => {
  it('renderiza familia, arma, golpes base e exclusivos', () => {
    const html = renderToString(<AdminWeaponMovesPanel />);
    expect(html).toContain('Golpes de arma');
    expect(html).toContain('Corte horizontal');
    expect(html).toContain('Exclusivos');
    expect(html).toContain('Sortear pelo rollId');
  });
  it('a pagina de animacoes abre na aba de golpes', () => {
    const html = renderToString(<AdminAnimationsPage />);
    expect(html).toContain('Famílias, magias e monstros');
    expect(html).toContain('Golpes de arma');
  });
});
