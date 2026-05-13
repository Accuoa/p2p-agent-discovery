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
