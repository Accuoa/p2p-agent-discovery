import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateKeypair, decodePrivateKey } from '../src/keys.mjs';
import { signManifest } from '../src/signature.mjs';
import { fingerprintForPublicKey } from '../src/fingerprint.mjs';

const CLI = join(process.cwd(), 'src', 'cli.mjs');

function runCli(args, opts = {}) {
  return execFileSync('node', [CLI, ...args], { encoding: 'utf-8', ...opts });
}

describe('cli: keygen', () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'p2pad-cli-'));
  });

  it('writes <name>.priv and <name>.pub files', () => {
    runCli(['keygen', 'alice'], { cwd: tmp });
    expect(existsSync(join(tmp, 'alice.priv'))).toBe(true);
    expect(existsSync(join(tmp, 'alice.pub'))).toBe(true);
    const priv = readFileSync(join(tmp, 'alice.priv'), 'utf-8').trim();
    const pub = readFileSync(join(tmp, 'alice.pub'), 'utf-8').trim();
    expect(Buffer.from(priv, 'base64').length).toBe(32);
    expect(Buffer.from(pub, 'base64').length).toBe(32);
  });
});

describe('cli: manifest verify', () => {
  let tmp;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'p2pad-cli-'));
  });

  it('verifies a valid signed manifest and exits 0', () => {
    const kp = generateKeypair();
    const m = {
      version: '1.0',
      id: 'agent:cli-1',
      name: 'CLI Test',
      publisher: { key: kp.public_key, id: fingerprintForPublicKey(kp.public_key) },
      capabilities: [{ name: 'x', version: '1.0', params: {} }],
      endpoints: [{ transport: 'https', url: 'https://x' }],
      issued_at: '2026-01-01T00:00:00Z',
      expires_at: '2027-01-01T00:00:00Z',
    };
    m.signature = { algo: 'ed25519', value: signManifest(m, decodePrivateKey(kp.private_key)) };
    const mPath = join(tmp, 'manifest.json');
    writeFileSync(mPath, JSON.stringify(m));
    const out = runCli(['manifest', 'verify', mPath]);
    expect(out).toContain('ed25519:');
  });

  it('exits non-zero on tampered manifest', () => {
    const kp = generateKeypair();
    const m = {
      version: '1.0',
      id: 'agent:cli-tampered',
      name: 'CLI Test',
      publisher: { key: kp.public_key, id: fingerprintForPublicKey(kp.public_key) },
      capabilities: [{ name: 'x', version: '1.0', params: {} }],
      endpoints: [{ transport: 'https', url: 'https://x' }],
      issued_at: '2026-01-01T00:00:00Z',
      expires_at: '2027-01-01T00:00:00Z',
    };
    m.signature = { algo: 'ed25519', value: signManifest(m, decodePrivateKey(kp.private_key)) };
    m.name = 'Tampered';
    const mPath = join(tmp, 'manifest-bad.json');
    writeFileSync(mPath, JSON.stringify(m));
    let err;
    try {
      runCli(['manifest', 'verify', mPath]);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.status).not.toBe(0);
  });
});

import { join as pjoin } from 'node:path';
import { writeFileSync as ws, readFileSync as rs, mkdirSync as md, mkdtempSync as mt } from 'node:fs';
import { tmpdir as td } from 'node:os';
import { execFileSync as ex } from 'node:child_process';
import { generateKeypair as gkp, decodePrivateKey as dpk } from '../src/keys.mjs';
import { signManifest as sm } from '../src/signature.mjs';
import { fingerprintForPublicKey as fp } from '../src/fingerprint.mjs';
import { describe as dd, it as ii, expect as ee, beforeEach as bb } from 'vitest';

const CLI2 = pjoin(process.cwd(), 'src', 'cli.mjs');

dd('cli: manifest create', () => {
  let tmp;
  bb(() => {
    tmp = mt(pjoin(td(), 'p2pad-cli-mc-'));
  });

  ii('signs a draft manifest and writes it to stdout', () => {
    const kp = gkp();
    const privPath = pjoin(tmp, 'a.priv');
    ws(privPath, kp.private_key);
    const draft = {
      version: '1.0',
      id: 'agent:create-1',
      name: 'create test',
      publisher: { key: kp.public_key, id: fp(kp.public_key) },
      capabilities: [{ name: 'x', version: '1.0', params: {} }],
      endpoints: [{ transport: 'https', url: 'https://x' }],
      issued_at: '2026-01-01T00:00:00Z',
      expires_at: '2027-01-01T00:00:00Z',
    };
    const draftPath = pjoin(tmp, 'draft.json');
    ws(draftPath, JSON.stringify(draft));
    const out = ex('node', [CLI2, 'manifest', 'create', draftPath, privPath], { encoding: 'utf-8' });
    const signed = JSON.parse(out);
    ee(signed.signature?.algo).toBe('ed25519');
    ee(typeof signed.signature?.value).toBe('string');
  });
});

dd('cli: discover', () => {
  let tmp;
  bb(() => {
    tmp = mt(pjoin(td(), 'p2pad-cli-d-'));
  });

  ii('runs the matcher against a manifest directory', () => {
    const dir = pjoin(tmp, 'manifests');
    md(dir, { recursive: true });
    for (const [name, tokens] of [['m1', 50], ['m2', 100]]) {
      const kp = gkp();
      const m = {
        version: '1.0',
        id: `agent:${name}`,
        name,
        publisher: { key: kp.public_key, id: fp(kp.public_key) },
        capabilities: [{ name: 'x', version: '1.0', params: { tokens } }],
        endpoints: [{ transport: 'https', url: 'https://x' }],
        issued_at: '2026-01-01T00:00:00Z',
        expires_at: '2027-01-01T00:00:00Z',
      };
      m.signature = { algo: 'ed25519', value: sm(m, dpk(kp.private_key)) };
      ws(pjoin(dir, `${name}.json`), JSON.stringify(m));
    }
    const q = {
      version: '1.0',
      capability: 'x',
      ranking: [{ path: 'params.tokens', direction: 'desc', weight: 1 }],
    };
    const qPath = pjoin(tmp, 'q.json');
    ws(qPath, JSON.stringify(q));
    const out = ex(
      'node',
      [CLI2, 'discover', qPath, dir],
      { encoding: 'utf-8', env: { ...process.env, P2PAD_TIME_OVERRIDE: '2026-05-13T00:00:00Z' } },
    );
    const result = JSON.parse(out);
    ee(result.map((r) => r.manifest_id)).toEqual(['agent:m2', 'agent:m1']);
  });
});
