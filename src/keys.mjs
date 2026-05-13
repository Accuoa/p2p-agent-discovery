import { generateKeyPairSync, createPublicKey, createPrivateKey } from 'node:crypto';

// Standard ASN.1 prefixes for Ed25519 (RFC 8410)
// SPKI (public key): SEQUENCE { SEQUENCE { OID 1.3.101.112 } BIT STRING { 32 raw bytes } }
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
// PKCS8 (private key): SEQUENCE { INTEGER 0, SEQUENCE { OID 1.3.101.112 }, OCTET STRING { OCTET STRING { 32 raw bytes } } }
const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export function generateKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    private_key: encodePrivateKey(privateKey),
    public_key: encodePublicKey(publicKey),
  };
}

export function encodePublicKey(publicKey) {
  const der = publicKey.export({ format: 'der', type: 'spki' });
  return der.slice(-32).toString('base64');
}

export function encodePrivateKey(privateKey) {
  const der = privateKey.export({ format: 'der', type: 'pkcs8' });
  return der.slice(-32).toString('base64');
}

export function decodePublicKey(base64) {
  const raw = Buffer.from(base64, 'base64');
  if (raw.length !== 32) {
    throw new Error(`expected 32 raw bytes for Ed25519 public key, got ${raw.length}`);
  }
  return createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, raw]),
    format: 'der',
    type: 'spki',
  });
}

export function decodePrivateKey(base64) {
  const raw = Buffer.from(base64, 'base64');
  if (raw.length !== 32) {
    throw new Error(`expected 32 raw bytes for Ed25519 private key, got ${raw.length}`);
  }
  return createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, raw]),
    format: 'der',
    type: 'pkcs8',
  });
}
