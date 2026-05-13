import { describe, it, expect } from 'vitest';
import { generateKeypair, decodePrivateKey } from '../src/keys.mjs';
import { signManifest } from '../src/signature.mjs';
import { fingerprintForPublicKey } from '../src/fingerprint.mjs';
import { match } from '../src/match.mjs';

function buildSignedManifest({
  id = 'agent:test-1',
  capabilities = [{ name: 'text.summarize', version: '1.0', params: {} }],
  issued_at = '2026-05-01T00:00:00Z',
  expires_at = '2027-05-01T00:00:00Z',
} = {}) {
  const kp = generateKeypair();
  const unsigned = {
    version: '1.0',
    id,
    name: id,
    publisher: { key: kp.public_key, id: fingerprintForPublicKey(kp.public_key) },
    capabilities,
    endpoints: [{ transport: 'https', url: 'https://example.com/' + id }],
    issued_at,
    expires_at,
  };
  const sig = signManifest(unsigned, decodePrivateKey(kp.private_key));
  return { ...unsigned, signature: { algo: 'ed25519', value: sig } };
}

const fixedTime = '2026-05-13T00:00:00Z';

describe('match', () => {
  it('returns empty array on empty manifest set', () => {
    const out = match({ version: '1.0', capability: 'x' }, [], { now: fixedTime });
    expect(out).toEqual([]);
  });

  it('matches by capability name', () => {
    const m1 = buildSignedManifest({ id: 'agent:a' });
    const m2 = buildSignedManifest({
      id: 'agent:b',
      capabilities: [{ name: 'translate', version: '1.0', params: {} }],
    });
    const out = match({ version: '1.0', capability: 'text.summarize' }, [m1, m2], {
      now: fixedTime,
    });
    expect(out).toHaveLength(1);
    expect(out[0].manifest_id).toBe('agent:a');
    expect(out[0].capability_name).toBe('text.summarize');
  });

  it('rejects manifest with invalid signature', () => {
    const m = buildSignedManifest({ id: 'agent:bad' });
    m.name = 'tampered';
    const out = match({ version: '1.0', capability: 'text.summarize' }, [m], { now: fixedTime });
    expect(out).toEqual([]);
  });

  it('rejects expired manifest', () => {
    const m = buildSignedManifest({
      id: 'agent:expired',
      expires_at: '2026-01-01T00:00:00Z',
    });
    const out = match({ version: '1.0', capability: 'text.summarize' }, [m], { now: fixedTime });
    expect(out).toEqual([]);
  });

  it('rejects manifest with bad fingerprint', () => {
    const m = buildSignedManifest({ id: 'agent:badfp' });
    m.publisher.id = 'ed25519:wrongprefix';
    // re-sign so signature is valid against tampered publisher.id
    const kp = generateKeypair();
    m.publisher.key = kp.public_key;
    m.signature.value = signManifest(m, decodePrivateKey(kp.private_key));
    const out = match({ version: '1.0', capability: 'text.summarize' }, [m], { now: fixedTime });
    expect(out).toEqual([]);
  });

  it('applies constraints (gte)', () => {
    const small = buildSignedManifest({
      id: 'agent:small',
      capabilities: [{ name: 'x', version: '1.0', params: { tokens: 10 } }],
    });
    const big = buildSignedManifest({
      id: 'agent:big',
      capabilities: [{ name: 'x', version: '1.0', params: { tokens: 100 } }],
    });
    const q = {
      version: '1.0',
      capability: 'x',
      constraints: [{ path: 'params.tokens', op: 'gte', value: 50 }],
    };
    const out = match(q, [small, big], { now: fixedTime });
    expect(out.map((r) => r.manifest_id)).toEqual(['agent:big']);
  });

  it('sorts by score desc then manifest_id asc', () => {
    const a = buildSignedManifest({
      id: 'agent:a',
      capabilities: [{ name: 'x', version: '1.0', params: { tokens: 50 } }],
    });
    const b = buildSignedManifest({
      id: 'agent:b',
      capabilities: [{ name: 'x', version: '1.0', params: { tokens: 100 } }],
    });
    const c = buildSignedManifest({
      id: 'agent:c',
      capabilities: [{ name: 'x', version: '1.0', params: { tokens: 100 } }],
    });
    const q = {
      version: '1.0',
      capability: 'x',
      ranking: [{ path: 'params.tokens', direction: 'desc', weight: 1 }],
    };
    const out = match(q, [c, b, a], { now: fixedTime });
    expect(out.map((r) => r.manifest_id)).toEqual(['agent:b', 'agent:c', 'agent:a']);
  });

  it('non-numeric ranking term contributes 0', () => {
    const m = buildSignedManifest({
      id: 'agent:m',
      capabilities: [{ name: 'x', version: '1.0', params: { langs: ['en'] } }],
    });
    const q = {
      version: '1.0',
      capability: 'x',
      ranking: [{ path: 'params.langs', direction: 'desc', weight: 1 }],
    };
    const out = match(q, [m], { now: fixedTime });
    expect(out[0].score).toBe(0);
  });
});
