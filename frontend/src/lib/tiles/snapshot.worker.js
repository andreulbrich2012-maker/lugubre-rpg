// Worker: gera a foto do mapa fora da tela principal (nada trava enquanto desenha).
import { renderSnapshot } from './snapshot.js';

self.onmessage = (e) => {
  const { id, map, maxPx } = e.data;
  try {
    const snap = renderSnapshot(map, { maxPx, onProgress: (p) => self.postMessage({ id, progress: p }) });
    self.postMessage({ id, snap }, [snap.data.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
