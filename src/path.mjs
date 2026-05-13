/**
 * Extract a value at a dot-path within a value. Numeric segments select
 * array elements. Returns null on missing key, out-of-bounds, or non-container
 * intermediates. Empty path returns the input itself.
 */
export function extractAtPath(value, path) {
  if (path === '' || path == null) return value;
  const segments = path.split('.');
  let cur = value;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return null;
    if (Array.isArray(cur)) {
      if (!/^[0-9]+$/.test(seg)) return null;
      const idx = parseInt(seg, 10);
      if (idx < 0 || idx >= cur.length) return null;
      cur = cur[idx];
      continue;
    }
    if (typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, seg)) return null;
      cur = cur[seg];
      continue;
    }
    return null;
  }
  return cur;
}
