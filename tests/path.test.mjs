import { describe, it, expect } from 'vitest';
import { extractAtPath } from '../src/path.mjs';

const c = {
  name: 'x',
  params: {
    max_input_tokens: 100000,
    languages: ['en', 'fr'],
  },
};

describe('extractAtPath', () => {
  it('returns scalar via dotted path', () => {
    expect(extractAtPath(c, 'params.max_input_tokens')).toBe(100000);
  });

  it('returns array via dotted path', () => {
    expect(extractAtPath(c, 'params.languages')).toEqual(['en', 'fr']);
  });

  it('returns array element via numeric segment', () => {
    expect(extractAtPath(c, 'params.languages.0')).toBe('en');
    expect(extractAtPath(c, 'params.languages.1')).toBe('fr');
  });

  it('returns null on missing key', () => {
    expect(extractAtPath(c, 'params.missing')).toBeNull();
  });

  it('returns null on out-of-bounds array index', () => {
    expect(extractAtPath(c, 'params.languages.99')).toBeNull();
  });

  it('returns null on non-container intermediate', () => {
    expect(extractAtPath(c, 'name.something')).toBeNull();
  });

  it('returns the root for empty path', () => {
    expect(extractAtPath(c, '')).toBe(c);
  });
});
