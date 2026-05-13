# Benchmark data

30 query/manifest-set fixtures. Each line of `samples.jsonl` is one fixture:

```json
{
  "name": "<fixture-id>",
  "query": { ... },
  "manifests": [ ... ]
}
```

Each line of `expected.jsonl` is the golden output of running `match(query, manifests, { now: "2026-05-13T00:00:00Z" })`:

```json
{ "name": "<fixture-id>", "golden": [ ... ] }
```

To regenerate (output is keypair-randomized; this changes signatures and fingerprints but preserves the schema and golden semantics):

```bash
node benchmark/generate-fixtures.mjs
```
