import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

// Canal de eventos da campanha por polling (a Vercel nao roda Socket.io).
// 1,5 s com a aba visivel, 10 s escondida; o cursor garante que nenhum evento se perde nem repete.
export function useCampaignFeed(campaignId, onEvents, { enabled = true } = {}) {
  const handler = useRef(onEvents);
  handler.current = onEvents;

  useEffect(() => {
    if (!campaignId || !enabled) return undefined;
    let cursor = null;
    let timer = null;
    let stopped = false;
    let failures = 0;

    async function tick() {
      if (stopped) return;
      try {
        const { data } = await api.get(`/campaigns/${campaignId}/events`, { params: cursor == null ? {} : { after: cursor } });
        failures = 0;
        if (cursor != null && data.events?.length) handler.current(data.events);
        if (data.cursor != null) cursor = data.cursor;
      } catch {
        failures += 1;
      }
      if (stopped) return;
      const base = document.hidden ? 10000 : 1500;
      timer = setTimeout(tick, Math.min(base * 2 ** Math.min(failures, 3), 30000));
    }

    const wake = () => {
      if (document.hidden || stopped) return;
      clearTimeout(timer);
      tick();
    };
    tick();
    document.addEventListener('visibilitychange', wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [campaignId, enabled]);
}
