import { z } from 'zod';

export const VALID_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'];

const ConstraintSchema = z.object({
  path: z.string().min(1),
  op: z.enum(VALID_OPS),
  value: z.any(),
});

const RankingSchema = z.object({
  path: z.string().min(1),
  direction: z.enum(['asc', 'desc']),
  weight: z.number(),
});

export const QuerySchema = z.object({
  version: z.literal('1.0'),
  capability: z.string().min(1),
  constraints: z.array(ConstraintSchema).optional().default([]),
  ranking: z.array(RankingSchema).optional().default([]),
});

/**
 * Parse a query. Throws ZodError on validation failure.
 */
export function parseQuery(input) {
  return QuerySchema.parse(input);
}
