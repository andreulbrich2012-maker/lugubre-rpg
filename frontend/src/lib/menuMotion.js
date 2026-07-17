export const MENU_OPEN_DURATION_MS = 900;
export const MENU_CLOSE_DURATION_MS = 400;
export const REDUCED_MENU_DURATION_MS = 80;

export function getMenuDurations(reducedMotion = false) {
  if (reducedMotion) {
    return { open: REDUCED_MENU_DURATION_MS, close: REDUCED_MENU_DURATION_MS };
  }
  return { open: MENU_OPEN_DURATION_MS, close: MENU_CLOSE_DURATION_MS };
}
