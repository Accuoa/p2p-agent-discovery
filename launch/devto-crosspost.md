---
title: "Discover any agent by what it claims to do — no central registry"
published: false
description: "A portable agent manifest format and a deterministic capability-matching algorithm. Open spec, Apache-2.0, reference CLI included."
canonical_url: https://accuoa.github.io/p2p-agent-discovery/launch
tags: ai, agents, opensource, protocol
---

## Why I built this

A few weeks ago I was sketching out a multi-agent flow where the agent on one side of a handoff was running in one framework and the agent on the other side was running in another. The framework-specific registries each side used couldn't see each other. There wasn't a portable thing one agent could hand to the other to say "here's what I am and here's how to reach me, verify this signature yourself."

I looked at A2A and AGNTCY. Both have answers for the communication layer once two agents are already pointed at each other. Neither pins down a portable, signed, verifiable agent manifest that an agent in framework A can publish for an agent in framework B to consume without a central registry. The closest prior art I found was DID documents (W3C) and OpenID Connect Discovery — both close in spirit, neither shaped right for agents that announce capabilities.

I wrote down what that manifest would have to look like for me to use it on both sides, plus the matching algorithm a consumer would run locally. `p2p-agent-discovery` is that spec, with a reference CLI that demonstrates the full cycle: keygen, manifest create, manifest verify, discover.

## What's broken today

Each framework manages its own agents internally. LangChain, AutoGen, and CrewAI all have internal registries that don't speak to each other. Each marketplace maintains its own catalog. When an agent in framework A needs to invoke an agent in framework B, there is no portable wire format both sides can produce and consume — no signed document one agent can hand to another that says "here is what I do and here is how to verify I'm who I claim to be."

The problem compounds at org and team boundaries. Within a single framework and a single deployment, a platform might maintain a central agent catalog. The moment you cross that boundary — different org, different stack, different deployment context — that catalog becomes invisible. Agent B's capabilities stay locked inside B's registry. Agent A has to either trust B's self-report or call a registry it has a pre-arranged relationship with. Neither of those scales to the open agent ecosystem that A2A is pointing toward.

The closest prior art is W3C DID documents and OpenID Connect Discovery. DID documents are self-sovereign identity records that carry verification methods and service endpoints — the right shape in principle, but designed for human identity and the broader DID ecosystem, which brings in JSON-LD contexts, DID methods, and resolver infrastructure that agents don't need. OIDC Discovery is a well-proven pattern for capability advertisement, but it's tied to the OAuth/OIDC stack and assumes a central authorization server. Neither is the right shape for a lightweight, framework-neutral agent manifest that any consumer can verify locally with nothing but a public key.

The result: agent discovery is registry-specific by default. Every framework reinvents it, every marketplace creates a new silo, and agents can't find each other across org boundaries without a pre-arranged business relationship. The time to establish a shared manifest primitive is before the ecosystem locks in.

## Spec walkthrough

`p2p-agent-discovery` defines two artifacts and one algorithm.

**Agent Manifest.** A signed JSON document where an agent declares its identity, capabilities, endpoints, and expiry window. The identity block is the `publisher` object: an Ed25519 public key (44-char unpadded base64, 32 raw bytes) and a fingerprint derived from it with the format `ed25519:<11-char base64url SHA-256 prefix>`. The `capabilities` array holds one or more capability objects, each with a `name`, a `version`, a `params` object (arbitrary key/value pairs that constrain and rank expressions can reference), and optional `tags`. The `endpoints` array is transport-agnostic — `"https"`, `"mcp"`, `"a2a"`, or any other scheme. A manifest is self-contained: everything a consumer needs to verify it and decide whether to use it lives inside the document.

```json
{
  "version": "1.0",
  "id": "agent:summarizer/v1",
  "name": "Summarizer Agent",
  "publisher": {
    "key": "MCowBQYDK2VdA...",
    "id": "ed25519:XyZ1a2b3c4d"
  },
  "capabilities": [
    {
      "name": "summarize",
      "version": "1.0.0",
      "params": {
        "max_input_tokens": 100000,
        "languages": ["en", "fr", "de"]
      },
      "tags": ["nlp", "text"]
    }
  ],
  "endpoints": [
    { "transport": "https", "url": "https://api.example.com/summarizer" }
  ],
  "issued_at": "2026-05-13T00:00:00Z",
  "expires_at": "2026-08-13T00:00:00Z",
  "signature": {
    "algo": "ed25519",
    "value": "BASE64_SIG_HERE"
  }
}
```

**Discovery Query.** A JSON document where a consumer expresses a need: which `capability` name to look for, zero or more `constraints` on capability fields, and an optional `ranking` definition. Constraints support eight operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, and `in`. All paths inside constraints and ranking use dot-path syntax (`params.max_input_tokens`, `params.languages.0`). Type mismatches cause the constraint to fail — no coercion.

**Matching algorithm.** Filter → score → sort. For each manifest: verify signature, check expiry, verify fingerprint. For each matching capability: apply all constraints, then compute `score = Σ(extract(path) × weight × sign(direction))`. Sort by score descending, then `manifest_id` ascending for tie-breaking. The algorithm is a pure function over canonical JSON — same inputs, byte-identical output, always.

**Signature scheme.** Ed25519 over canonical JSON per RFC 8785 (JCS): UTF-8, lexicographically sorted object keys, no insignificant whitespace, numbers in shortest round-trippable form. The `signature` field is excluded before hashing. Ed25519 is deterministic per RFC 8032: same private key, same message, same signature every run. The fingerprint convention `ed25519:<11-char base64url SHA-256 prefix>` gives a stable human-readable identity that a consumer can verify from the embedded public key without any external lookup.

## The numbers

The benchmark runs 30 hand-built fixtures across six categories: 5 simple capability matches, 5 ranking exercises, 5 filter-constraint cases, 5 contains-operator cases, 5 expiry-boundary cases, and 5 empty-result cases. Every fixture has a labeled expected output declared alongside the input. The scorer is deterministic: given the same manifest directory, query, and injected clock value (`P2PAD_TIME_OVERRIDE`), it always returns the same ranked list.

Network footprint is audited rather than mocked. The benchmark wraps the Node.js `http` and `https` modules and logs every outbound call to `logs/network.jsonl`. The final assertion is that the log is empty. It is.

Determinism is verified by running the engine three times with identical inputs and comparing outputs byte-for-byte. All three runs produce identical results. The locked SHA-256 of all three runs is:

```
7C0BF8021A4FC922F4594523202522A917CC963CBB660DE2016F98DC8DB2D8D7
```

```
[p2p-agent-discovery] running benchmark — 30 fixtures

  loading fixtures...   30/30 OK
  matching...           30/30 OK

FIDELITY:
  simple (5):           5/5 (100.0%)
  ranking (5):          5/5 (100.0%)
  filter (5):           5/5 (100.0%)
  contains (5):         5/5 (100.0%)
  expiry (5):           5/5 (100.0%)
  empty (5):            5/5 (100.0%)

  total:                30/30 (100.0%)

NETWORK FOOTPRINT:
  external calls:  0
  audit log:       ./logs/network.jsonl

STATUS: Strong band
```

"Strong band" is the benchmark's top classification. It requires 100% fidelity across all six categories, zero external calls, and three byte-identical runs. The 30-fixture count is honest — it is not a massive corpus. But the methodology is: every fixture is hand-built, every category is labeled, the output is deterministic, and you can reproduce it with nothing beyond `node`.

## Try it

Install and run the full cycle:

```bash
# Clone and install
git clone https://github.com/Accuoa/p2p-agent-discovery
cd p2p-agent-discovery && npm install

# Quick cycle
p2pad keygen alice
p2pad manifest create draft.json alice.priv > manifest.json
p2pad manifest verify manifest.json
p2pad discover query.json manifests/
```

Or run the one-liner that installs, runs the test suite (67/67), runs the benchmark (30/30), and runs calibration:

```bash
bash full-cycle.sh
```

Expected final output: Strong band, SHA-256 matching the locked value above.

## Limitations

The spec deliberately omits several things that are out of scope for v0.1:

- **No transport implementation.** The spec says nothing about how manifests are distributed. mDNS, DHT, gossip, and a local directory of `.json` files are all valid transport substrates; none are specified.
- **No shared capability taxonomy.** Capability names are free-form strings. Two publishers can use different names for the same capability; a shared vocabulary is not provided.
- **No key rotation or revocation.** An expired manifest is rejected; there is no mechanism for an agent to rotate its key or revoke a manifest before expiry.
- **No query joins.** A single query targets one capability name. Multi-capability queries are not supported.
- **No regex constraints.** Constraint operators are all structural comparisons; regex matching is not included.
- **No attestation refs on the wire.** Integration with Plan 8 (agent-reputation) attestation data is architectural but not normative in v0.1.

All of these are tracked in [OPEN_QUESTIONS.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/OPEN_QUESTIONS.md).

## What's next

**Composition with agent-reputation (Plan 8).** `p2p-agent-discovery` finds agents by what they claim to do. `agent-reputation` (Accuoa Plan 8) lets third parties attest that an agent has actually succeeded at a claimed capability. The two specs are designed to chain: run discovery to get a ranked list of candidates, query the reputation store for attestations about those candidates from a trusted attestor set, then decide which one to invoke. This pattern is documented in [ARCHITECTURE.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/ARCHITECTURE.md).

**v1.1 candidates.** The most likely additions based on early feedback: an optional `taxonomy_ref` field on capabilities (to anchor capability names to a shared vocabulary like a domain-specific ontology), an `attestation_refs` field on the manifest (linking to agent-reputation attestations so discovery and trust can be resolved in a single document fetch), and transport hints. Weigh in on priorities in [OPEN_QUESTIONS.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/OPEN_QUESTIONS.md).

---

If the spec covers a real need you have, or if a field is missing or wrong for your framework's trust model, open an issue: [github.com/Accuoa/p2p-agent-discovery/issues](https://github.com/Accuoa/p2p-agent-discovery/issues). The full normative spec is at [SPEC.md](https://accuoa.github.io/p2p-agent-discovery/SPEC.md). Open design questions and v1.1 candidates are in [OPEN_QUESTIONS.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/OPEN_QUESTIONS.md).
