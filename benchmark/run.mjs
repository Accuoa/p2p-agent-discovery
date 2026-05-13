#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { match } from '../src/match.mjs';
import { canonicalize } from '../src/canonical.mjs';
import { createAuditedFetch, truncateAuditLog, countExternalCalls } from '../src/audit.mjs';
import { score } from './score.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, 'data');
const LOGS = join(dirname(__dirname), 'logs');
mkdirSync(LOGS, { recursive: true });

const FIXED_TIME = '2026-05-13T00:00:00Z';
const SAMPLES = join(DATA, 'samples.jsonl');
const EXPECTED = join(DATA, 'expected.jsonl');
const ACTUAL = join(LOGS, 'actual.jsonl');
const AUDIT = join(LOGS, 'audit.jsonl');

// Install audited fetch globally so any accidental network call is logged.
truncateAuditLog(AUDIT);
globalThis.fetch = createAuditedFetch({
  logPath: AUDIT,
  internalHosts: [],
  baseFetch: async () => {
    throw new Error('benchmark runs offline — no fetch allowed');
  },
});

const samples = readFileSync(SAMPLES, 'utf-8').trim().split('\n').map(JSON.parse);

const actualLines = [];
for (const s of samples) {
  const golden = match(s.query, s.manifests, { now: FIXED_TIME });
  actualLines.push(canonicalize({ name: s.name, golden }));
}
writeFileSync(ACTUAL, actualLines.join('\n') + '\n');

const result = score(ACTUAL, EXPECTED);
const external = countExternalCalls(AUDIT);

const report = {
  total: result.total,
  pass: result.pass,
  fail: result.total - result.pass,
  external_network_calls: external,
  failures: result.failures,
};

process.stdout.write(canonicalize(report) + '\n');
process.exit(result.pass === result.total && external === 0 ? 0 : 1);
