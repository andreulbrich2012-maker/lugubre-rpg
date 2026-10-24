import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

// Barcos e viagens da campanha. Recarrega quando chega 'voyage:updated' pelo feed; o relogio do
// servidor (offset) deixa o progresso igual para todo mundo. subscribe(fn) recebe todos os
// eventos (a vista do mar do jogador acompanha os monstros da cena de mar).
export function useVoyages(campaignId, { enabled = true, onScenesChanged } = {}) {
  const [boats, setBoats] = useState([]);
  const [voyages, setVoyages] = useState([]);
  const [pick, setPick] = useState(null); // mestre clicando no mapa: { label, onCell }
  const offset = useRef(0);
  const listeners = useRef(new Set());
  const scenesChanged = useRef(onScenesChanged);
  scenesChanged.current = onScenesChanged;

  const reload = useCallback(async () => {
    if (!campaignId) return null;
    const t0 = Date.now();
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/boats`);
      offset.current = new Date(data.now).getTime() - (t0 + Date.now()) / 2;
      setBoats(data.boats || []);
      setVoyages(data.voyages || []);
      return data;
    } catch { return null; }
  }, [campaignId]);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);

  const onEvent = useCallback((ev) => {
    if (ev.type === 'voyage:updated') {
      reload();
      scenesChanged.current?.();
    }
    listeners.current.forEach((fn) => fn(ev));
  }, [reload]);

  const subscribe = useCallback((fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); }, []);
  const now = useCallback(() => Date.now() + offset.current, []);

  return { boats, voyages, reload, onEvent, subscribe, now, pick, setPick };
}
