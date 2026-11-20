import { describe, expect, it } from 'vitest';
import { decodeEntities, dedupe, hasPhrase, interleave, matchesRules, parseISODuration } from './filters';

describe('parseISODuration', () => {
  it('reads hours, minutes and seconds', () => {
    expect(parseISODuration('PT1H2M3S')).toBe(3723);
    expect(parseISODuration('PT12M30S')).toBe(750);
    expect(parseISODuration('PT45S')).toBe(45);
  });

  it('returns 0 for anything it cannot read', () => {
    expect(parseISODuration('')).toBe(0);
    expect(parseISODuration('live')).toBe(0);
  });
});

describe('hasPhrase', () => {
  it('matches whole words only', () => {
    expect(hasPhrase('Introduction to Linear Algebra', 'linear algebra')).toBe(true);
    expect(hasPhrase('Matrixes and determinants', 'matrix')).toBe(false);
    expect(hasPhrase('Matrix multiplication', 'matrix')).toBe(true);
  });

  it('ignores case', () => {
    expect(hasPhrase('EIGENVALUE decomposition', 'eigenvalue')).toBe(true);
  });
});

describe('matchesRules', () => {
  const video = { title: 'Linear algebra lecture 1', channel: 'MIT OpenCourseWare' };

  it('keeps everything when include is empty', () => {
    expect(matchesRules(video, [], [])).toBe(true);
  });

  it('requires one include phrase', () => {
    expect(matchesRules(video, ['matrix', 'vector space'], [])).toBe(false);
    expect(matchesRules(video, ['linear algebra'], [])).toBe(true);
  });

  it('drops excluded phrases before checking include', () => {
    expect(matchesRules(video, ['linear algebra'], ['lecture'])).toBe(false);
  });
});

describe('interleave', () => {
  it('takes one from each list per round and stops at the cap', () => {
    const a = ['a1', 'a2', 'a3'];
    const b = ['b1', 'b2'];
    expect(interleave([a, b], 10)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3']);
    expect(interleave([a, b], 3)).toEqual(['a1', 'b1', 'a2']);
  });
});

describe('dedupe', () => {
  it('keeps the first of each id', () => {
    expect(dedupe([{ id: 'x' }, { id: 'y' }, { id: 'x' }])).toEqual([{ id: 'x' }, { id: 'y' }]);
  });
});

describe('decodeEntities', () => {
  it('turns the escapes the data API sends back into text', () => {
    expect(decodeEntities('Gil Strang&#39;s Final Lecture')).toBe("Gil Strang's Final Lecture");
    expect(decodeEntities('Math &amp; Physics &quot;101&quot;')).toBe('Math & Physics "101"');
    expect(decodeEntities('A &#x2014; B')).toBe('A — B');
  });

  it('leaves anything it does not recognise alone', () => {
    expect(decodeEntities('&unknown; & 5 < 6')).toBe('&unknown; & 5 < 6');
    expect(decodeEntities('')).toBe('');
  });
});
