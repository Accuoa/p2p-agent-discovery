import { describe, it, expect } from 'vitest';
import { applyOp } from '../src/operators.mjs';

describe('applyOp', () => {
  it('eq: scalar match', () => {
    expect(applyOp('eq', 5, 5)).toBe(true);
    expect(applyOp('eq', 5, 6)).toBe(false);
    expect(applyOp('eq', 'x', 'x')).toBe(true);
  });

  it('ne: scalar mismatch', () => {
    expect(applyOp('ne', 5, 6)).toBe(true);
    expect(applyOp('ne', 5, 5)).toBe(false);
  });

  it('gt/gte/lt/lte numeric comparison', () => {
    expect(applyOp('gt', 5, 3)).toBe(true);
    expect(applyOp('gt', 5, 5)).toBe(false);
    expect(applyOp('gte', 5, 5)).toBe(true);
    expect(applyOp('lt', 3, 5)).toBe(true);
    expect(applyOp('lte', 5, 5)).toBe(true);
  });

  it('gt/gte/lt/lte fail on type mismatch', () => {
    expect(applyOp('gt', 'a', 'b')).toBe(false);
    expect(applyOp('gt', null, 1)).toBe(false);
    expect(applyOp('lt', 1, 'b')).toBe(false);
  });

  it('contains: operand is array, checks membership', () => {
    expect(applyOp('contains', ['en', 'fr'], 'fr')).toBe(true);
    expect(applyOp('contains', ['en', 'fr'], 'de')).toBe(false);
    expect(applyOp('contains', 'not-array', 'fr')).toBe(false);
    expect(applyOp('contains', null, 'fr')).toBe(false);
  });

  it('in: value is array, checks operand membership', () => {
    expect(applyOp('in', 'fr', ['en', 'fr'])).toBe(true);
    expect(applyOp('in', 'de', ['en', 'fr'])).toBe(false);
    expect(applyOp('in', 'fr', 'not-array')).toBe(false);
  });

  it('unknown op returns false', () => {
    expect(applyOp('regex', 'abc', '.*')).toBe(false);
  });

  it('eq/ne handle nulls strictly', () => {
    expect(applyOp('eq', null, null)).toBe(true);
    expect(applyOp('eq', null, 0)).toBe(false);
    expect(applyOp('ne', null, 0)).toBe(true);
  });
});
