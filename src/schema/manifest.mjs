import { z } from 'zod';

const ID_REGEX = /^[a-z][a-z0-9.:_/-]{2,127}$/;

function noDotKeysIn(obj, pathLabel = 'params') {
  for (const key of Object.keys(obj)) {
    if (key.includes('.')) {
      throw new Error(`capability ${pathLabel} key "${key}" contains a dot (forbidden by spec)`);
    }
  }
}

const ParamsSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.any()), z.record(z.any())]))
  .superRefine((obj, ctx) => {
    try {
      noDotKeysIn(obj);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.message });
    }
  });

const CapabilitySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  params: ParamsSchema,
  tags: z.array(z.string()).optional(),
});

const EndpointSchema = z.object({
  transport: z.string().min(1),
  url: z.string().min(1),
});

const PublisherSchema = z.object({
  key: z.string().min(1),
  id: z.string().min(1),
});

const SignatureSchema = z.object({
  algo: z.literal('ed25519'),
  value: z.string().min(1),
});

export const ManifestSchema = z
  .object({
    version: z.literal('1.0'),
    id: z.string().regex(ID_REGEX, { message: 'id must match [a-z][a-z0-9.:_/-]{2,127}' }),
    name: z.string().min(1),
    publisher: PublisherSchema,
    capabilities: z.array(CapabilitySchema).min(1),
    endpoints: z.array(EndpointSchema).min(1),
    issued_at: z.string().min(1),
    expires_at: z.string().min(1),
    signature: SignatureSchema.optional(),
  })
  .superRefine((m, ctx) => {
    if (Date.parse(m.expires_at) <= Date.parse(m.issued_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expires_at must be strictly after issued_at',
      });
    }
  });

/**
 * Parse a manifest. Throws ZodError on validation failure.
 */
export function parseManifest(input) {
  return ManifestSchema.parse(input);
}
