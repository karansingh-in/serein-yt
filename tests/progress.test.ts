import { describe, expect, it } from 'vitest';
import { isFinished, readProgress, resumeAt } from '../src/progress';

describe('resumeAt', () => {
  it('resumes a lecture that was left in the middle', () => {
    expect(resumeAt(1234.7, 3600)).toBe(1234);
  });

  it('starts at the beginning when barely started', () => {
    expect(resumeAt(5, 3600)).toBeUndefined();
    expect(resumeAt(20, 3600)).toBe(20);
  });

  it('does not resume a finished video', () => {
    expect(resumeAt(3590, 3600)).toBeUndefined();
    expect(resumeAt(3600, 3600)).toBeUndefined();
  });

  it('ignores nonsense', () => {
    expect(resumeAt(Number.NaN, 3600)).toBeUndefined();
    expect(resumeAt(600, 0)).toBeUndefined();
    expect(resumeAt(600, Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe('readProgress', () => {
  it('reads the player payload', () => {
    expect(
      readProgress({ event: 'infoDelivery', info: { currentTime: 12.5, duration: 600 } }),
    ).toEqual({ position: 12.5, duration: 600 });
  });

  it('ignores anything without a usable time', () => {
    expect(readProgress(null)).toBeNull();
    expect(readProgress('hello')).toBeNull();
    expect(readProgress({ event: 'onReady' })).toBeNull();
    expect(readProgress({ info: { currentTime: 3 } })).toBeNull();
    expect(readProgress({ info: { currentTime: '3', duration: 600 } })).toBeNull();
    expect(readProgress({ info: { currentTime: 3, duration: 0 } })).toBeNull();
  });
});

describe('isFinished', () => {
  it('counts the last half minute as done', () => {
    expect(isFinished({ position: 3570, duration: 3600 })).toBe(true);
    expect(isFinished({ position: 3500, duration: 3600 })).toBe(false);
  });
});
