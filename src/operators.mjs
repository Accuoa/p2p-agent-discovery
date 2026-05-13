/**
 * Apply a single constraint op against an operand and value.
 * Returns true if the constraint is satisfied, false otherwise.
 * Type mismatches always fail (no coercion).
 */
export function applyOp(op, operand, value) {
  switch (op) {
    case 'eq':
      return strictEqual(operand, value);
    case 'ne':
      return !strictEqual(operand, value);
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      if (typeof operand !== 'number' || typeof value !== 'number') return false;
      if (op === 'gt') return operand > value;
      if (op === 'gte') return operand >= value;
      if (op === 'lt') return operand < value;
      return operand <= value;
    case 'contains':
      if (!Array.isArray(operand)) return false;
      return operand.some((el) => strictEqual(el, value));
    case 'in':
      if (!Array.isArray(value)) return false;
      return value.some((el) => strictEqual(el, operand));
    default:
      return false;
  }
}

function strictEqual(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((el, i) => strictEqual(el, b[i]));
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => strictEqual(a[k], b[k]));
  }
  return a === b;
}
