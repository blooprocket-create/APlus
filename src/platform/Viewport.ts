export interface ViewportProfile {
  width: number;
  height: number;
  touchUI: boolean;
  landscape: boolean;
  pixelRatio: number;
}

/** Width alone cannot identify a phone rotated into landscape. */
export function viewportProfile(width: number, height: number, coarsePointer: boolean, devicePixelRatio = 1): ViewportProfile {
  const w = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
  const h = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
  const touchUI = coarsePointer || Math.min(w, h) <= 600;
  const budget = touchUI ? 1_500_000 : 3_000_000;
  const density = Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;
  return { width: w, height: h, touchUI, landscape: w >= h, pixelRatio: Math.min(density, touchUI ? 1.5 : 2, Math.max(1, Math.sqrt(budget / (w * h)))) };
}

export function getViewportProfile(): ViewportProfile {
  const viewport = window.visualViewport;
  return viewportProfile(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight, window.matchMedia?.('(any-pointer: coarse)').matches ?? false, window.devicePixelRatio ?? 1);
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

/** Fullscreen and orientation locking are enhancements; ordinary browser play is always available. */
export async function toggleGameFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return true;
    }
    if (!document.documentElement.requestFullscreen) return false;
    await document.documentElement.requestFullscreen();
    try { await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape'); } catch { /* Some browsers support fullscreen but not orientation locking. */ }
    return true;
  } catch {
    return false;
  }
}
