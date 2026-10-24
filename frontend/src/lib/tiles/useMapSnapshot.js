import { useEffect, useState } from 'react';
import { snapshotKey } from './snapshot.js';

// Foto do mapa (mapa-item): gera uma vez no worker e guarda no navegador (IndexedDB) pela chave do
// conteudo; abrir de novo e instantaneo. Devolve { url, width, height, cell, progress, error }.
const memory = new Map();

function idb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('lugubre-mapas', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('fotos');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbGet(key) {
  const db = await idb(); if (!db) return null;
  return new Promise((resolve) => { try { const r = db.transaction('fotos').objectStore('fotos').get(key); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); } catch { resolve(null); } });
}
async function idbPut(key, value) {
  const db = await idb(); if (!db) return;
  try { db.transaction('fotos', 'readwrite').objectStore('fotos').put(value, key); } catch { /* sem armazenamento */ }
}

export function useMapSnapshot(sceneId, map) {
  const [state, setState] = useState({ progress: 0 });
  useEffect(() => {
    if (!map?.cols) return undefined;
    let alive = true;
    const key = snapshotKey(sceneId, map);
    const show = (rec) => { if (!alive) return; const url = URL.createObjectURL(rec.blob); memory.set(key, { ...rec, url }); setState({ ...rec, url, progress: 1 }); };
    (async () => {
      if (memory.has(key)) { setState({ ...memory.get(key), progress: 1 }); return; }
      const saved = await idbGet(key);
      if (saved?.blob) { show(saved); return; }
      const worker = new Worker(new URL('./snapshot.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = async (e) => {
        const { progress, snap, error } = e.data;
        if (error) { if (alive) setState({ error }); worker.terminate(); return; }
        if (progress != null && !snap) { if (alive) setState((s) => ({ ...s, progress })); return; }
        worker.terminate();
        const canvas = document.createElement('canvas');
        canvas.width = snap.width; canvas.height = snap.height;
        canvas.getContext('2d').putImageData(new ImageData(snap.data, snap.width, snap.height), 0, 0);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        const rec = { blob, width: snap.width, height: snap.height, cell: snap.cell };
        idbPut(key, rec);
        show(rec);
      };
      worker.postMessage({ id: key, map, maxPx: 3200 });
    })();
    return () => { alive = false; };
  }, [sceneId, map]);
  return state;
}
