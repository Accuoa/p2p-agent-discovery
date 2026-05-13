import { verifyManifest } from './signature.mjs';
import { verifyFingerprint } from './fingerprint.mjs';
import { extractAtPath } from './path.mjs';
import { applyOp } from './operators.mjs';
import { parseManifest } from './schema/manifest.mjs';
import { parseQuery } from './schema/query.mjs';

/**
 * Match a query against a set of manifests per SPEC §Matching algorithm.
 * Returns a deterministic ranked array of { manifest_id, capability_name, score }.
 *
 * Sign convention (per SPEC): sign("desc") = +1, sign("asc") = -1.
 * The sort step orders by score DESC, so a "desc" direction contributes
 * positively, ranking larger operand values earlier.
 *
 * @param {object} query  - validated against QuerySchema (or raw; will be parsed)
 * @param {object[]} manifests - array of manifest objects (raw; each parsed individually)
 * @param {object} options
 * @param {string} options.now - ISO-8601 timestamp; defaults to current time
 * @param {boolean} options.strict - if true, validation/verification failures throw instead of silently rejecting
 */
export function match(query, manifests, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const strict = options.strict === true;

  const parsedQuery = parseQuery(query);

  const results = [];
  for (const rawManifest of manifests) {
    let m;
    try {
      m = parseManifest(rawManifest);
    } catch (err) {
      if (strict) throw err;
      continue;
    }
    // Explicit missing-signature guard before verifyManifest so strict mode
    // surfaces a distinct error message ("missing" vs "invalid").
    if (!m.signature) {
      if (strict) throw new Error(`manifest ${m.id} missing signature`);
      continue;
    }
    if (!verifyManifest(m)) {
      if (strict) throw new Error(`manifest ${m.id} signature invalid`);
      continue;
    }
    if (nowMs >= Date.parse(m.expires_at)) {
      if (strict) throw new Error(`manifest ${m.id} expired`);
      continue;
    }
    if (!verifyFingerprint(m.publisher.key, m.publisher.id)) {
      if (strict) throw new Error(`manifest ${m.id} fingerprint mismatch`);
      continue;
    }

    for (const cap of m.capabilities) {
      if (cap.name !== parsedQuery.capability) continue;

      let constraintsPass = true;
      for (const c of parsedQuery.constraints) {
        const operand = extractAtPath(cap, c.path);
        if (!applyOp(c.op, operand, c.value)) {
          constraintsPass = false;
          break;
        }
      }
      if (!constraintsPass) continue;

      let score = 0;
      for (const r of parsedQuery.ranking) {
        const operand = extractAtPath(cap, r.path);
        if (typeof operand !== 'number') continue;
        const sign = r.direction === 'desc' ? 1 : -1;
        score += operand * r.weight * sign;
      }

      results.push({
        manifest_id: m.id,
        capability_name: cap.name,
        score,
      });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.manifest_id < b.manifest_id ? -1 : a.manifest_id > b.manifest_id ? 1 : 0;
  });

  return results;
}
