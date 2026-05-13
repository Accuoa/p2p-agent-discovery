import { describe, it, expect } from 'vitest';
import { generateKeypair } from '../src/keys.mjs';
import { fingerprintForPublicKey, verifyFingerprint } from '../src/fingerprint.mjs';

describe('fingerprint', () => {
  it('produces an ed25519:<11chars> string', () => {
    const kp = generateKeypair();
    const fp = fingerprintForPublicKey(kp.public_key);
    expect(fp).toMatch(/^ed25519:[A-Za-z0-9_-]{11}$/);
  });

  it('is deterministic for the same key', () => {
    const kp = generateKeypair();
    expect(fingerprintForPublicKey(kp.public_key)).toBe(fingerprintForPublicKey(kp.public_key));
  });

  it('differs across different keys', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(fingerprintForPublicKey(kp1.public_key)).not.toBe(
      fingerprintForPublicKey(kp2.public_key),
    );
  });

  it('verifyFingerprint passes when id matches derived', () => {
    const kp = generateKeypair();
    const id = fingerprintForPublicKey(kp.public_key);
    expect(verifyFingerprint(kp.public_key, id)).toBe(true);
  });

  it('verifyFingerprint fails when id mismatches', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    const id = fingerprintForPublicKey(kp2.public_key);
    expect(verifyFingerprint(kp1.public_key, id)).toBe(false);
  });

  it('verifyFingerprint fails for malformed id', () => {
    const kp = generateKeypair();
    expect(verifyFingerprint(kp.public_key, 'not-a-fingerprint')).toBe(false);
  });
});
