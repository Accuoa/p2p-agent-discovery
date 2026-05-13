# Architecture

This document describes how the reference implementation is structured and the design decisions behind it. The normative protocol lives in [SPEC.md](./SPEC.md).

## Goals

1. Deterministic — same inputs, byte-identical outputs, every time, across operating systems.
2. Zero external dependencies during discovery — no network calls, no service lookups.
3. Composable with other Accuoa portfolio protocols, particularly agent-reputation (Plan 8).
4. Transport-agnostic — the protocol can run over any transport that preserves manifest signatures.

## Components

| Component | Path | Role |
|---|---|---|
| Manifest schema validator | `reference-impl/src/manifest.js` | Parse + validate a manifest against the spec schema |
| Query schema validator | `reference-impl/src/query.js` | Parse + validate a discovery query |
| Matcher | `reference-impl/src/match.js` | Pure `match(query, manifests[]) → results[]` |
| Signer / Verifier | `reference-impl/src/sign.js` | Ed25519 sign + verify over canonical JSON |
| Fingerprint | `reference-impl/src/fingerprint.js` | Pure `pubkey → "ed25519:<base64url-prefix>"` |
| Canonical JSON | `reference-impl/src/canonical.js` | RFC 8785 implementation |
| CLI | `reference-impl/src/cli.js` | The `p2pad` subcommands |

Code shared with `agent-reputation` (Plan 8): Ed25519 sign/verify primitives, canonical JSON, and the audit-wrapper pattern. Where the spec semantics differ (manifest vs. attestation envelope), the implementations are separate files but the cryptographic primitives are byte-equivalent.

## Data flow

```
PUBLISHER
  └─ p2pad keygen <name>                       # → name.priv, name.pub (Ed25519)
  └─ author manifest draft (JSON)
  └─ p2pad manifest create <draft.json> <name.priv>
      └─ canonicalize manifest minus signature
      └─ sign with priv
      └─ embed signature → write signed manifest

(any transport publishes the signed manifest — out of scope for v0.1)

CONSUMER
  └─ collect manifests from any source (out of scope)
  └─ p2pad discover <query.json> <manifest_dir/>
      └─ for each *.json in manifest_dir:
          ├─ parse + schema-validate
          ├─ verify signature against publisher.key
          ├─ verify publisher.id matches fingerprint of publisher.key
          ├─ check current_time < expires_at
          └─ if all pass: feed into matcher
      └─ run match(query, valid_manifests[]) → ranked results
      └─ emit JSON to stdout
```

## Determinism guarantees

- All canonical JSON output uses RFC 8785 (UTF-8, sorted keys, no whitespace, normalized numbers).
- Tie-break on `manifest_id` ASCII lexicographic, never on insertion order.
- Closed set of constraint operators. No regex, no custom predicates, no callbacks.
- `current_time` for expiry checks is injectable via the env var `P2PAD_TIME_OVERRIDE` (ISO-8601). Benchmark runs pin this value; production omits it.
- Pseudo-random tie-breakers are forbidden.
- All times normalized to ISO-8601 UTC.

## Composition with Plan 8 (agent-reputation)

The two protocols compose:

1. **Discovery (Plan 9)** returns ranked manifests by claim. Output: `[{manifest_id, capability_name, score}]`.
2. **Reputation (Plan 8)** verifies that a third party has attested to the agent succeeding at that capability. Input: a manifest_id + capability_name; output: list of valid Ed25519-signed attestations.
3. A consumer can layer the two: discover by claim, then filter or re-rank by attestation count from a trusted attestor set.

Plan 9 does not normatively reference Plan 8 in v0.1. The composition is enabled by independent design but not codified in the wire format.

## Test strategy

- **Unit tests** (`tests/`) for each pure function: canonical JSON, fingerprint, manifest validation, query validation, constraint operators, scoring.
- **Integration tests** for each CLI subcommand (`keygen`, `manifest create`, `manifest verify`, `discover`).
- **Benchmark suite** (`benchmark/`) — 30 hand-crafted fixture pairs (query, manifest_set, golden output). Pass = byte-identical to golden across three reruns.
- **Calibration script** (`benchmark/calibrate.sh`) — confirms three byte-identical runs, locks the headline metric.

## Headline metric

**100% capability-match fidelity (30/30) — 0 external network calls — Strong band — three byte-identical runs.**

The Strong band requires:
- 30/30 fixture pairs produce byte-identical output to golden.
- Zero external network calls observed across all benchmark runs (verified by the audit wrapper).
- Three sequential benchmark runs produce byte-identical aggregate output (calibration script enforces this).

## Build / runtime

- Node.js 20+
- Single runtime dependency: `@noble/ed25519` (audited, zero transitive deps) for Ed25519 primitives.
- All protocol logic implemented from the spec — no validation, JSON-schema, or matching libraries pulled in.
- Vitest for tests.

## Out of scope for v0.1

- Transport implementations (mDNS, DHT, gossip, HTTPS server).
- Key rotation / multi-key publishers.
- Manifest revocation.
- Query joins or boolean composition across capabilities.
- Capability taxonomy or shared ontology.
- Regex constraints.
- Plan 8 attestation integration on the wire (composition documented, not implemented).
