import { useCallback, useEffect, useRef, useState } from 'react';

// Parte visivel de uma area com rolagem ({x, y, w, h} em px do conteudo), atualizada no maximo
// uma vez por quadro. Uso: const [ref, view] = useScrollView(); <div ref={ref} className="overflow-auto">.
// Mapa grande (ate 1000x1000) so desenha e so monta casas/itens dentro disso.
export default function useScrollView() {
  const [view, setView] = useState(null);
  const cleanup = useRef(null);
  const ref = useCallback((el) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const next = { x: el.scrollLeft, y: el.scrollTop, w: el.clientWidth, h: el.clientHeight };
      setView((cur) => (cur && cur.x === next.x && cur.y === next.y && cur.w === next.w && cur.h === next.h ? cur : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(el);
    cleanup.current = () => { el.removeEventListener('scroll', onScroll); ro?.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => () => cleanup.current?.(), []);
  return [ref, view];
}
