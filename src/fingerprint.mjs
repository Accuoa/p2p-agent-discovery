import { createHash } from 'node:crypto';

/**
 * Encode bytes as unpadded base64url.
 */
function base64url(bytes) {
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Derive the canonical fingerprint for a base64 Ed25519 public key.
 * Returns "ed25519:" + first 11 chars of base64url(SHA256(decoded_pubkey)).
 */
export function fingerprintForPublicKey(base64PublicKey) {
  const decoded = Buffer.from(base64PublicKey, 'base64');
  if (decoded.length !== 32) {
    throw new Error(`expected 32-byte public key, got ${decoded.length}`);
  }
  const hash = createHash('sha256').update(decoded).digest();
  return 'ed25519:' + base64url(hash).slice(0, 11);
}

/**
 * Verify a claimed publisher.id matches the canonical fingerprint of the
 * provided public key. Returns false on any error or mismatch.
 */
export function verifyFingerprint(base64PublicKey, claimedId) {
  if (typeof claimedId !== 'string' || !claimedId.startsWith('ed25519:')) return false;
  try {
    return fingerprintForPublicKey(base64PublicKey) === claimedId;
  } catch {
    return false;
  }
}
