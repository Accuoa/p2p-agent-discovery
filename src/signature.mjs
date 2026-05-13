import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { canonicalize } from './canonical.mjs';
import { decodePublicKey } from './keys.mjs';

/**
 * Sign a manifest. Excludes the `signature` field from the signed payload.
 * Returns the signature as a base64 string. Ed25519 (deterministic per RFC 8032).
 */
export function signManifest(manifest, privateKey) {
  const { signature: _, ...unsigned } = manifest;
  const payload = Buffer.from(canonicalize(unsigned));
  const sig = cryptoSign(null, payload, privateKey);
  return sig.toString('base64');
}

/**
 * Verify a manifest. Self-contained: uses the public key embedded in
 * manifest.publisher.key. Returns true iff signature is valid.
 * Never throws — returns false on any error.
 */
export function verifyManifest(manifest) {
  if (!manifest.signature?.value) return false;
  if (!manifest.publisher?.key) return false;

  let publicKey;
  try {
    publicKey = decodePublicKey(manifest.publisher.key);
  } catch {
    return false;
  }

  let sigBytes;
  try {
    sigBytes = Buffer.from(manifest.signature.value, 'base64');
  } catch {
    return false;
  }

  const { signature: _, ...unsigned } = manifest;
  const payload = Buffer.from(canonicalize(unsigned));

  try {
    return cryptoVerify(null, payload, publicKey, sigBytes);
  } catch {
    return false;
  }
}
