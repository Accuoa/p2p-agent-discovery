# P2PAgentDiscovery — Specification v0.1

## Status

Draft v0.1. Subject to change before v1.0.

## Motivation

Multi-agent systems built across organizations and frameworks need a way for an agent to announce what it can do, and for a consumer to find an agent that matches a need, without going through a central registry. Existing approaches lock discovery to a specific platform or transport: each framework ships its own internal registry, each marketplace ships its own catalog, and there is no portable manifest format an agent in Framework A can publish that an agent in Framework B can read and match against.

P2PAgentDiscovery defines a portable agent manifest format and a deterministic capability-matching algorithm. The format is transport-agnostic — manifests can be served over HTTPS, gossipped via mDNS, distributed through a DHT, or read from a local directory of `.json` files. The matching algorithm is a pure function over canonical JSON: same inputs, byte-identical output, always.

The protocol pairs cleanly with `agent-reputation` (Accuoa Plan 8): discovery finds an agent claiming a capability; attestations tell you whether to trust that claim.

## Overview

Two artifacts on the wire:

**Agent Manifest.** A signed JSON document where an agent declares its identity (Ed25519 public key + fingerprint), capabilities (named, versioned, parameterized), endpoints (transport-agnostic), and expiry window.

**Discovery Query.** A JSON document where a consumer expresses a capability need with hard constraints and a ranking spec.

A consumer collects manifests from any source (this protocol does not specify the transport), verifies each signature, then runs `match(query, manifests[]) → ranked_results[]`.

## Normative requirements

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY in this document follow RFC 2119.

### Manifest schema (v1.0)

A manifest MUST be a JSON object with the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string | yes | MUST be `"1.0"` for this spec revision |
| `id` | string | yes | Canonical identifier, lowercase ASCII, MUST match regex `^[a-z][a-z0-9.:_/-]{2,127}$` |
| `name` | string | yes | Human-readable, free-form |
| `publisher.key` | string | yes | Base64-encoded Ed25519 public key (32 raw bytes, 44 chars unpadded base64) |
| `publisher.id` | string | yes | MUST equal `"ed25519:" + base64url(SHA256(decoded_key))[:11]` |
| `capabilities` | array | yes | Non-empty array of capability objects |
| `capabilities[].name` | string | yes | Capability identifier, free-form publisher namespace |
| `capabilities[].version` | string | yes | Semver of the capability shape |
| `capabilities[].params` | object | yes | Free-form key/value pairs. Scalars, arrays of scalars, or flat objects only — no nested arrays of objects. Keys MUST NOT contain `.` (used as path separator in queries) |
| `capabilities[].tags` | array of string | no | Optional |
| `endpoints` | array | yes | Non-empty array of endpoint objects |
| `endpoints[].transport` | string | yes | E.g., `"https"`, `"mcp"`, `"a2a"`. Free-form |
| `endpoints[].url` | string | yes | URL-encoded endpoint address |
| `issued_at` | string | yes | ISO-8601 UTC timestamp |
| `expires_at` | string | yes | ISO-8601 UTC timestamp. MUST be strictly after `issued_at` |
| `signature.algo` | string | yes | MUST be `"ed25519"` |
| `signature.value` | string | yes | Base64 Ed25519 signature over canonical JSON of the manifest with the `signature` field removed |

### Query schema (v1.0)

A query MUST be a JSON object with the following fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string | yes | MUST be `"1.0"` |
| `capability` | string | yes | Exact match against `capabilities[].name` |
| `constraints` | array | no | Zero or more constraint objects |
| `constraints[].path` | string | yes | Dot-path within a capability object, e.g., `"params.max_input_tokens"`. See "Dot-path syntax" below |
| `constraints[].op` | string | yes | One of: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in` |
| `constraints[].value` | scalar or array | yes | Type depends on the op |
| `ranking` | array | no | Zero or more ranking objects |
| `ranking[].path` | string | yes | Dot-path |
| `ranking[].direction` | string | yes | `"asc"` or `"desc"` |
| `ranking[].weight` | number | yes | Real number, may be negative |

A query with empty `constraints` and empty `ranking` MUST return every capability matching the `capability` name, each with score 0, tie-broken on `manifest_id`.

### Constraint operators

- `eq` / `ne` — strict equality / inequality over JSON values (no type coercion).
- `gt` / `gte` / `lt` / `lte` — numeric comparison. Both operand and value MUST be numbers; otherwise the constraint fails.
- `contains` — operand MUST be an array; passes if `value ∈ operand`.
- `in` — value MUST be an array; passes if `operand ∈ value`.

Type mismatches MUST cause the constraint to fail. No coercion is performed.

### Dot-path syntax

A dot-path is a `.`-separated sequence of segments. Each segment is a literal object key; numeric segments select the corresponding (zero-indexed) element of a JSON array. Extraction proceeds by walking each segment in order. If any segment refers to a missing key, an out-of-bounds index, or a non-container intermediate value, extraction yields the JSON value `null`, and the corresponding constraint or ranking term applies its mismatch rule.

Examples (with capability `{ "name": "x", "params": { "max_input_tokens": 100000, "languages": ["en","fr"] } }`):

- `params.max_input_tokens` → `100000`
- `params.languages` → `["en","fr"]`
- `params.languages.0` → `"en"`
- `params.missing` → `null`

Capability param keys MUST NOT contain `.` so that dot-paths are unambiguous.

### Matching algorithm (normative)

Given a query Q and a set of manifests M, the discovery output is computed as:

1. For each manifest m in M:
   1. Verify `m.signature.value` against `m.publisher.key` over canonical JSON of m with `signature` removed. If verification fails, reject m.
   2. Check `current_time < m.expires_at`. If false, reject m.
   3. Check `m.publisher.id == "ed25519:" + base64url(SHA256(decoded(m.publisher.key)))[:11]`. If false, reject m.
   4. For each capability c in `m.capabilities`:
      1. If `c.name != Q.capability`, skip c.
      2. For each constraint k in `Q.constraints`, extract the value at `k.path` within c and apply `k.op` against `k.value`. If any constraint fails, skip c.
      3. Compute `score = Σ over r in Q.ranking of: extract(r.path, c).as_number × r.weight × sign(r.direction)`, where `sign("asc") = +1` and `sign("desc") = −1`. If `extract(r.path, c)` is not numeric, that ranking term contributes 0.
      4. Append `{ "manifest_id": m.id, "capability_name": c.name, "score": <number> }` to results.
2. Sort results: primary key `score` descending, secondary key `manifest_id` ascending (ASCII lexicographic).
3. Output the sorted array as a JSON array.

The `current_time` used in the expiry check above MAY be overridden via an injected value to make benchmark runs reproducible. Implementations MUST document this knob.

### Canonical JSON

All signature operations MUST use canonical JSON per RFC 8785 (JCS): UTF-8 encoding, lexicographically sorted object keys, no insignificant whitespace, numbers in shortest round-trippable form.

### Error handling

| Failure | Behavior |
|---|---|
| Invalid signature | Manifest rejected. Implementations MAY surface a strict mode that exits non-zero |
| Expired manifest | Rejected by default. Strict mode MAY exit non-zero |
| Fingerprint mismatch | Manifest rejected |
| Unknown constraint operator | Query rejected, exit non-zero before matching |
| Malformed manifest JSON | Caller rejected, exit non-zero, the bad file MUST be identified by path |
| Empty manifest set | Empty result array, exit zero |
| No matching capabilities | Empty result array, exit zero |

## Test vectors

Canonical examples live in [examples/fixtures/](./examples/fixtures/). The 30-fixture benchmark in [benchmark/](./benchmark/) verifies the reference implementation produces byte-identical golden output.

## Reference implementation

A minimal Node.js reference implementation that passes the test vectors lives in [reference-impl/](./reference-impl/).

## Composition with Plan 8

This protocol does not normatively reference [agent-reputation](https://github.com/Accuoa/agent-reputation) (Plan 8). The two layers compose: discovery (this spec) finds agents by claim; reputation (Plan 8) lets a third party attest that an agent has actually succeeded at a claimed capability. A consumer can layer both — discover by claim, then filter or re-rank by attestation count from a trusted attestor set. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the composition pattern.

## Open questions

See [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md).

## Changelog

- v0.1 — initial draft (2026-05-13)
