import { describe, it, expect } from 'vitest';
import {
  generateKeypair,
  encodePublicKey,
  decodePublicKey,
  encodePrivateKey,
  decodePrivateKey,
} from '../src/keys.mjs';

describe('keys', () => {
  it('generates a base64 keypair with 32-byte raw lengths', () => {
    const kp = generateKeypair();
    expect(typeof kp.public_key).toBe('string');
    expect(typeof kp.private_key).toBe('string');
    expect(Buffer.from(kp.public_key, 'base64').length).toBe(32);
    expect(Buffer.from(kp.private_key, 'base64').length).toBe(32);
  });

  it('round-trips a public key through encode/decode', () => {
    const kp = generateKeypair();
    const decoded = decodePublicKey(kp.public_key);
    const reencoded = encodePublicKey(decoded);
    expect(reencoded).toBe(kp.public_key);
  });

  it('round-trips a private key through encode/decode', () => {
    const kp = generateKeypair();
    const decoded = decodePrivateKey(kp.private_key);
    const reencoded = encodePrivateKey(decoded);
    expect(reencoded).toBe(kp.private_key);
  });

  it('rejects malformed public key (wrong length)', () => {
    expect(() => decodePublicKey(Buffer.from([0, 1, 2]).toString('base64'))).toThrow(/32 raw bytes/);
  });

  it('rejects malformed private key (wrong length)', () => {
    expect(() => decodePrivateKey(Buffer.from([0, 1, 2]).toString('base64'))).toThrow(
      /32 raw bytes/,
    );
  });
});
