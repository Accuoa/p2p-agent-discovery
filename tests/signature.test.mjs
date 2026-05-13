import { describe, it, expect } from 'vitest';
import { generateKeypair, decodePrivateKey } from '../src/keys.mjs';
import { signManifest, verifyManifest } from '../src/signature.mjs';

function freshManifest(publicKey) {
  return {
    version: '1.0',
    id: 'agent:test-1',
    name: 'Test Agent',
    publisher: { key: publicKey, id: 'placeholder' },
    capabilities: [{ name: 'x', version: '1.0', params: {} }],
    endpoints: [{ transport: 'https', url: 'https://example.com' }],
    issued_at: '2026-05-13T00:00:00Z',
    expires_at: '2027-05-13T00:00:00Z',
  };
}

describe('signature', () => {
  it('signs a manifest and verify returns true', () => {
    const kp = generateKeypair();
    const m = freshManifest(kp.public_key);
    const priv = decodePrivateKey(kp.private_key);
    const sig = signManifest(m, priv);
    expect(typeof sig).toBe('string');
    const signed = { ...m, signature: { algo: 'ed25519', value: sig } };
    expect(verifyManifest(signed)).toBe(true);
  });

  it('verify returns false if any field is tampered', () => {
    const kp = generateKeypair();
    const m = freshManifest(kp.public_key);
    const priv = decodePrivateKey(kp.private_key);
    const sig = signManifest(m, priv);
    const signed = { ...m, signature: { algo: 'ed25519', value: sig } };
    signed.name = 'Tampered';
    expect(verifyManifest(signed)).toBe(false);
  });

  it('verify returns false if signature is missing', () => {
    const kp = generateKeypair();
    const m = freshManifest(kp.public_key);
    expect(verifyManifest(m)).toBe(false);
  });

  it('verify returns false if publisher.key is missing', () => {
    const kp = generateKeypair();
    const m = freshManifest(kp.public_key);
    const priv = decodePrivateKey(kp.private_key);
    const sig = signManifest(m, priv);
    const signed = { ...m, signature: { algo: 'ed25519', value: sig } };
    delete signed.publisher.key;
    expect(verifyManifest(signed)).toBe(false);
  });

  it('signature is deterministic (RFC 8032 Ed25519)', () => {
    const kp = generateKeypair();
    const m = freshManifest(kp.public_key);
    const priv = decodePrivateKey(kp.private_key);
    const sig1 = signManifest(m, priv);
    const sig2 = signManifest(m, priv);
    expect(sig1).toBe(sig2);
  });
});
