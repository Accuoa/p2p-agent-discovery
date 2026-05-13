import { describe, it, expect } from 'vitest';
import { ManifestSchema, parseManifest } from '../src/schema/manifest.mjs';

const validManifest = {
  version: '1.0',
  id: 'agent:summarizer-v3',
  name: 'Summarizer v3',
  publisher: {
    key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    id: 'ed25519:abcdefghijk',
  },
  capabilities: [
    {
      name: 'text.summarize',
      version: '1.0',
      params: { languages: ['en', 'fr'], max_input_tokens: 100000 },
    },
  ],
  endpoints: [{ transport: 'https', url: 'https://example.com/agent' }],
  issued_at: '2026-05-13T00:00:00Z',
  expires_at: '2027-05-13T00:00:00Z',
  signature: { algo: 'ed25519', value: 'abc==' },
};

describe('ManifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(() => parseManifest(validManifest)).not.toThrow();
  });

  it('rejects missing version', () => {
    const bad = { ...validManifest };
    delete bad.version;
    expect(() => parseManifest(bad)).toThrow();
  });

  it('rejects empty capabilities array', () => {
    const bad = { ...validManifest, capabilities: [] };
    expect(() => parseManifest(bad)).toThrow();
  });

  it('rejects empty endpoints array', () => {
    const bad = { ...validManifest, endpoints: [] };
    expect(() => parseManifest(bad)).toThrow();
  });

  it('rejects id with invalid characters', () => {
    const bad = { ...validManifest, id: 'Invalid ID!' };
    expect(() => parseManifest(bad)).toThrow();
  });

  it('rejects expires_at before issued_at', () => {
    const bad = {
      ...validManifest,
      issued_at: '2027-05-13T00:00:00Z',
      expires_at: '2026-05-13T00:00:00Z',
    };
    expect(() => parseManifest(bad)).toThrow(/expires_at/);
  });

  it('rejects capability param key with a dot', () => {
    const bad = {
      ...validManifest,
      capabilities: [
        { name: 'x', version: '1.0', params: { 'has.dot': 1 } },
      ],
    };
    expect(() => parseManifest(bad)).toThrow(/dot/);
  });

  it('rejects signature.algo other than ed25519', () => {
    const bad = {
      ...validManifest,
      signature: { algo: 'rsa', value: 'abc==' },
    };
    expect(() => parseManifest(bad)).toThrow();
  });
});
