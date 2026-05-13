#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeypair, decodePrivateKey } from '../src/keys.mjs';
import { signManifest } from '../src/signature.mjs';
import { fingerprintForPublicKey } from '../src/fingerprint.mjs';
import { match } from '../src/match.mjs';
import { canonicalize } from '../src/canonical.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

const FIXED_TIME = '2026-05-13T00:00:00Z';

function buildManifest({ id, capability, params, expiresIn = 365 }) {
  const kp = generateKeypair();
  const issued = new Date('2026-05-01T00:00:00Z');
  const expires = new Date(issued);
  expires.setDate(expires.getDate() + expiresIn);
  const m = {
    version: '1.0',
    id,
    name: id,
    publisher: { key: kp.public_key, id: fingerprintForPublicKey(kp.public_key) },
    capabilities: [{ name: capability, version: '1.0', params }],
    endpoints: [{ transport: 'https', url: `https://example.com/${id}` }],
    issued_at: issued.toISOString(),
    expires_at: expires.toISOString(),
  };
  m.signature = { algo: 'ed25519', value: signManifest(m, decodePrivateKey(kp.private_key)) };
  return m;
}

const fixtures = [];

// 1-5: simple capability matches, no constraints, no ranking
for (let i = 1; i <= 5; i++) {
  const ms = [
    buildManifest({ id: `agent:simple-${i}-a`, capability: `cap${i}`, params: {} }),
    buildManifest({ id: `agent:simple-${i}-b`, capability: 'unrelated', params: {} }),
  ];
  fixtures.push({
    name: `simple-${i}`,
    query: { version: '1.0', capability: `cap${i}` },
    manifests: ms,
  });
}

// 6-10: numeric ranking, single dimension
for (let i = 1; i <= 5; i++) {
  const ms = [
    buildManifest({ id: `agent:rank-${i}-low`, capability: 'compute', params: { score: 10 * i } }),
    buildManifest({ id: `agent:rank-${i}-mid`, capability: 'compute', params: { score: 20 * i } }),
    buildManifest({ id: `agent:rank-${i}-high`, capability: 'compute', params: { score: 30 * i } }),
  ];
  fixtures.push({
    name: `rank-${i}`,
    query: {
      version: '1.0',
      capability: 'compute',
      ranking: [{ path: 'params.score', direction: 'desc', weight: 1.0 }],
    },
    manifests: ms,
  });
}

// 11-15: constraint filtering
for (let i = 1; i <= 5; i++) {
  const threshold = 50 * i;
  const ms = [
    buildManifest({ id: `agent:filt-${i}-a`, capability: 'x', params: { tokens: threshold - 10 } }),
    buildManifest({ id: `agent:filt-${i}-b`, capability: 'x', params: { tokens: threshold } }),
    buildManifest({ id: `agent:filt-${i}-c`, capability: 'x', params: { tokens: threshold + 10 } }),
  ];
  fixtures.push({
    name: `filter-${i}`,
    query: {
      version: '1.0',
      capability: 'x',
      constraints: [{ path: 'params.tokens', op: 'gte', value: threshold }],
    },
    manifests: ms,
  });
}

// 16-20: contains/in operators
for (let i = 1; i <= 5; i++) {
  const ms = [
    buildManifest({
      id: `agent:lang-${i}-en`,
      capability: 'translate',
      params: { langs: ['en'] },
    }),
    buildManifest({
      id: `agent:lang-${i}-multi`,
      capability: 'translate',
      params: { langs: ['en', 'fr', 'de'] },
    }),
    buildManifest({
      id: `agent:lang-${i}-jp`,
      capability: 'translate',
      params: { langs: ['jp'] },
    }),
  ];
  fixtures.push({
    name: `contains-${i}`,
    query: {
      version: '1.0',
      capability: 'translate',
      constraints: [{ path: 'params.langs', op: 'contains', value: 'fr' }],
    },
    manifests: ms,
  });
}

// 21-25: expired manifests should be filtered
for (let i = 1; i <= 5; i++) {
  const ms = [
    buildManifest({ id: `agent:exp-${i}-old`, capability: 'y', params: {}, expiresIn: -30 }),
    buildManifest({ id: `agent:exp-${i}-fresh`, capability: 'y', params: {} }),
  ];
  fixtures.push({
    name: `expiry-${i}`,
    query: { version: '1.0', capability: 'y' },
    manifests: ms,
  });
}

// 26-30: empty / no-match cases
for (let i = 1; i <= 5; i++) {
  const ms = [
    buildManifest({
      id: `agent:empty-${i}-a`,
      capability: 'never-asked',
      params: {},
    }),
  ];
  fixtures.push({
    name: `empty-${i}`,
    query: { version: '1.0', capability: 'something-else' },
    manifests: ms,
  });
}

const samples = [];
const expected = [];
for (const f of fixtures) {
  samples.push({ name: f.name, query: f.query, manifests: f.manifests });
  const golden = match(f.query, f.manifests, { now: FIXED_TIME });
  expected.push({ name: f.name, golden });
}

writeFileSync(
  join(DATA_DIR, 'samples.jsonl'),
  samples.map((s) => canonicalize(s)).join('\n') + '\n',
);
writeFileSync(
  join(DATA_DIR, 'expected.jsonl'),
  expected.map((e) => canonicalize(e)).join('\n') + '\n',
);

console.log(`wrote ${fixtures.length} fixtures to ${DATA_DIR}`);
