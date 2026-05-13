# Community post — A2A community

> Channel: A2A Discord / AGNTCY community
> Audience: protocol nerds, multi-agent system builders
> Tone: technical, contribution-inviting

---

Hi all,

A2A defines how agents communicate. It doesn't define how agents find each other, and every framework handles that ad-hoc or not at all. I drafted a small, vendor-neutral spec to fill that gap: **p2p-agent-discovery**.

## What it defines

Two artifacts and one algorithm:

**Agent Manifest** — a signed JSON document where an agent declares its identity (Ed25519 public key + fingerprint), capabilities (named, versioned, parameterized), transport-agnostic endpoints, and an expiry window. The manifest is self-contained: no registry lookup, no shared secret. A consumer verifies it with the embedded public key and canonical JSON (RFC 8785 JCS).

Fingerprint convention: `ed25519:<11-char base64url SHA-256 prefix>`. The `publisher.id` field is derived deterministically from `publisher.key`, so a consumer can verify the fingerprint locally without a resolver.

**Discovery Query** — expresses a capability need: capability name (exact match), zero or more constraints (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`), and optional ranking (path/direction/weight triples). Paths use dot-syntax (`params.max_input_tokens`, `params.languages.0`). Type mismatches fail without coercion.

**Matching algorithm** — filter → score → sort. For each manifest: verify signature, check expiry, verify fingerprint. For each matching capability: apply all constraints, then `score = Σ(extract(path) × weight × sign(direction))`. Sort score descending, `manifest_id` ascending as tie-breaker. Pure function over canonical JSON — same inputs, byte-identical output, always.

## Composition with agent-reputation

This pairs directly with the `agent-reputation` spec (Accuoa Plan 8). Discovery finds agents by what they claim to do. Attestations from `agent-reputation` tell you whether to trust the claim. The composition pattern: run `p2p-agent-discovery` to get a ranked list of candidates; query the reputation store for attestations about those candidates from a trusted attestor set; use attestation count or confidence scores to re-rank or filter. Neither spec normatively references the other — they compose at the consumer layer. Details in [ARCHITECTURE.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/ARCHITECTURE.md).

## The benchmark

30 hand-built fixture pairs across six categories: simple capability matches, ranking exercises, filter-constraint cases, contains-operator cases, expiry-boundary cases, and empty-result cases. Network is audited via a fetch wrapper (not mocked) — the assertion is that `logs/network.jsonl` is empty after a full run. Three runs produce byte-identical output. SHA-256 locked at `7C0BF8021A4FC922F4594523202522A917CC963CBB660DE2016F98DC8DB2D8D7`. Result: **Strong band** (30/30, 0 external calls, 3 identical runs).

## Where I'm looking for feedback

1. Does the manifest schema cover what your framework's agent advertisements actually look like? Specifically: are there capability fields, endpoint types, or identity conventions that don't fit the current schema?
2. The lack of a shared capability taxonomy is a known gap — capability names are free-form strings. What's the right approach for v1.1? A `taxonomy_ref` pointer to an external vocabulary, or something embedded?
3. The self-contained-verification choice (public key embedded in every manifest) trades payload size for portability. Wrong tradeoff for your use case?
4. Transport is out of scope for v0.1 — the spec is silent on how manifests propagate (mDNS, DHT, gossip, static files all work). Is that the right call, or does a reference transport matter more than I think?

Open questions are tracked at [OPEN_QUESTIONS.md](https://github.com/Accuoa/p2p-agent-discovery/blob/main/OPEN_QUESTIONS.md). Issues welcome at [github.com/Accuoa/p2p-agent-discovery/issues](https://github.com/Accuoa/p2p-agent-discovery/issues). Happy to discuss in thread.

Code + spec: [github.com/Accuoa/p2p-agent-discovery](https://github.com/Accuoa/p2p-agent-discovery)  
Live spec: [accuoa.github.io/p2p-agent-discovery/SPEC.md](https://accuoa.github.io/p2p-agent-discovery/SPEC.md)
