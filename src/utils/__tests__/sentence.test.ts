import { describe, it, expect } from 'vitest';
import { getBlankIndices } from '../sentence';

describe('getBlankIndices', () => {
  it('returns the index of the single space in a sentence', () => {
    expect(getBlankIndices('我 你')).toEqual([1]);
  });

  it('returns multiple space indices in order', () => {
    expect(getBlankIndices('一 三 五')).toEqual([1, 3]);
  });

  it('handles consecutive trailing spaces', () => {
    expect(getBlankIndices('上山找  ')).toEqual([3, 4]);
  });

  it('handles a leading space', () => {
    expect(getBlankIndices(' 你好')).toEqual([0]);
  });

  it('returns an empty array when the sentence has no spaces', () => {
    expect(getBlankIndices('你好')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(getBlankIndices('')).toEqual([]);
  });

  it('does not treat underscores as blanks (only ASCII spaces)', () => {
    expect(getBlankIndices('我_你')).toEqual([]);
  });
});
