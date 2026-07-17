import { useCallback, useEffect, useRef, useState } from 'react';
import { getMenuDurations } from '../lib/menuMotion';
import { useReducedMotion } from './useReducedMotion';

export function useMenuTransition() {
  const reducedMotion = useReducedMotion();
  const durations = getMenuDurations(reducedMotion);
  const [phase, setPhase] = useState('closed');
  const phaseRef = useRef('closed');
  const timerRef = useRef(null);

  const updatePhase = useCallback((nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const clearTransition = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const open = useCallback(() => {
    if (phaseRef.current !== 'closed') return false;
    clearTransition();
    updatePhase('opening');
    timerRef.current = window.setTimeout(() => updatePhase('open'), durations.open);
    return true;
  }, [clearTransition, durations.open, updatePhase]);

  const close = useCallback((afterClose) => {
    if (phaseRef.current === 'closed' || phaseRef.current === 'closing') return false;
    clearTransition();
    updatePhase('closing');
    timerRef.current = window.setTimeout(() => {
      updatePhase('closed');
      afterClose?.();
    }, durations.close);
    return true;
  }, [clearTransition, durations.close, updatePhase]);

  const forceClose = useCallback(() => {
    clearTransition();
    updatePhase('closed');
  }, [clearTransition, updatePhase]);

  useEffect(() => clearTransition, [clearTransition]);

  return {
    phase,
    mounted: phase !== 'closed',
    interactive: phase === 'open',
    reducedMotion,
    durations,
    open,
    close,
    forceClose
  };
}
