export type Topic = {
  id: string;
  label: string;
  query: string;
  include?: string[];
  exclude?: string[];
  categoryId?: string;
  duration?: 'any' | 'medium' | 'long';
  order?: 'relevance' | 'date';
  language?: string;
};

export type Video = {
  id: string;
  title: string;
  channel: string;
  durationSec: number;
  publishedAt: string;
  description: string;
  thumbnail: string;
};

/** PT1H2M3S -> 3723. Anything unparseable is 0, which the duration filter drops. */
export function parseISODuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return (
    Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(mi ?? 0) * 60 + Number(s ?? 0)
  );
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-phrase, case-insensitive, unicode-aware. "matrix" does not match "matrixes". */
export function hasPhrase(haystack: string, phrase: string): boolean {
  if (!phrase) return false;
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escape(phrase)}(?=$|[^\\p{L}\\p{N}])`,
    'iu',
  );
  return re.test(haystack);
}

export function matchesRules(
  video: Pick<Video, 'title' | 'channel'>,
  include: string[] = [],
  exclude: string[] = [],
): boolean {
  const text = `${video.title}\n${video.channel}`;
  if (exclude.some((phrase) => hasPhrase(text, phrase))) return false;
  if (include.length === 0) return true;
  return include.some((phrase) => hasPhrase(text, phrase));
}

export function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Round-robin so one topic cannot dominate the home feed. */
export function interleave<T>(lists: T[][], cap: number): T[] {
  const out: T[] = [];
  const longest = lists.reduce((n, list) => Math.max(n, list.length), 0);
  for (let i = 0; i < longest && out.length < cap; i++) {
    for (const list of lists) {
      if (out.length >= cap) break;
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}
