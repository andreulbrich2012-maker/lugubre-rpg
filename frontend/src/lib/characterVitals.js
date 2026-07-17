export function clampResourceCurrent(value, max) {
  const safeValue = Math.max(0, Number(value || 0));
  const safeMax = Math.max(0, Number(max || 0));
  return Math.min(safeValue, safeMax);
}

export function normalizeResourcePair(current, max) {
  const safeMax = Math.max(0, Number(max || 0));
  return { current: clampResourceCurrent(current, safeMax), max: safeMax };
}

export function calculateResourceAdjustment({ type, current, max, field, delta }) {
  const previousCurrent = Math.max(0, Number(current || 0));
  const previousMax = Math.max(0, Number(max || 0));
  const minimumMax = type === 'mana' ? 0 : 1;
  const nextMax = field === 'max' ? Math.max(minimumMax, previousMax + Number(delta || 0)) : previousMax;
  const nextCurrent = field === 'current'
    ? clampResourceCurrent(previousCurrent + Number(delta || 0), nextMax)
    : clampResourceCurrent(previousCurrent, nextMax);

  return {
    current: nextCurrent,
    max: nextMax,
    changed: nextCurrent !== previousCurrent || nextMax !== previousMax,
    currentWasAdjusted: field === 'max' && nextCurrent < previousCurrent
  };
}
