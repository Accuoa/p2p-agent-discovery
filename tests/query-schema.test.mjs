import { describe, it, expect } from 'vitest';
import { QuerySchema, parseQuery, VALID_OPS } from '../src/schema/query.mjs';

const valid = {
  version: '1.0',
  capability: 'text.summarize',
  constraints: [
    { path: 'params.languages', op: 'contains', value: 'fr' },
    { path: 'params.max_input_tokens', op: 'gte', value: 50000 },
  ],
  ranking: [{ path: 'params.max_input_tokens', direction: 'desc', weight: 1.0 }],
};

describe('QuerySchema', () => {
  it('accepts a valid query', () => {
    expect(() => parseQuery(valid)).not.toThrow();
  });

  it('accepts a query with no constraints and no ranking', () => {
    expect(() => parseQuery({ version: '1.0', capability: 'x' })).not.toThrow();
  });

  it('rejects unknown constraint op', () => {
    const bad = {
      ...valid,
      constraints: [{ path: 'params.x', op: 'regex', value: 'foo' }],
    };
    expect(() => parseQuery(bad)).toThrow();
  });

  it('rejects unknown ranking direction', () => {
    const bad = {
      ...valid,
      ranking: [{ path: 'params.x', direction: 'sideways', weight: 1 }],
    };
    expect(() => parseQuery(bad)).toThrow();
  });

  it('rejects missing capability', () => {
    const bad = { version: '1.0' };
    expect(() => parseQuery(bad)).toThrow();
  });

  it('exposes the canonical set of operators', () => {
    expect(VALID_OPS.sort()).toEqual(
      ['contains', 'eq', 'gt', 'gte', 'in', 'lt', 'lte', 'ne'].sort(),
    );
  });
});
