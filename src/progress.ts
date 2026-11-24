// Reading the player's own progress reports. Pure so it can be tested without a browser.

export type Progress = { position: number; duration: number };

/** Below this many seconds in, starting at the beginning is what people want. */
const MIN_RESUME = 20;
/** Inside this many seconds of the end, the video counts as finished. */
const END_GAP = 30;

export function resumeAt(position: number, duration: number): number | undefined {
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return undefined;
  if (duration <= 0 || position < MIN_RESUME) return undefined;
  if (duration - position <= END_GAP) return undefined;
  return Math.floor(position);
}

/** The player posts JSON like `{ event: "infoDelivery", info: { currentTime, duration } }`. */
export function readProgress(data: unknown): Progress | null {
  if (typeof data !== 'object' || data === null) return null;
  const info = (data as { info?: unknown }).info;
  if (typeof info !== 'object' || info === null) return null;
  const { currentTime, duration } = info as { currentTime?: unknown; duration?: unknown };
  if (typeof currentTime !== 'number' || typeof duration !== 'number') return null;
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return null;
  return { position: currentTime, duration };
}

export function isFinished(progress: Progress): boolean {
  return progress.duration - progress.position <= END_GAP;
}
