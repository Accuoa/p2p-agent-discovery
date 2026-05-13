# Twitter / X thread — P2PAgentDiscovery launch

## 1/

100% capability-match fidelity (30/30) — 0 external calls — Strong band — 3 byte-identical runs. New: P2PAgentDiscovery, a portable agent manifest + deterministic matcher. No central registry. ↓

## 2/

The problem: LangChain, AutoGen, CrewAI, every marketplace — each has its own agent registry. None of them speak to each other. When agent A (framework X) needs agent B (framework Y), there's no portable, signed document B can hand A to say "here's what I do — verify this yourself."

## 3/

p2p-agent-discovery is two things:

1. Agent Manifest — signed JSON: publisher key + fingerprint, capabilities array, transport-agnostic endpoints, expiry
2. Deterministic matching algorithm: filter → score → sort. Pure function over canonical JSON. Same inputs → byte-identical output, always.

## 4/

The signature scheme: Ed25519 over canonical JSON (RFC 8785 JCS). Fingerprint convention: `ed25519:<11-char base64url SHA-256 prefix>`. Self-contained — no registry lookup, no shared secret. Verifier needs only the manifest file and the embedded public key.

## 5/

Closest prior art: W3C DID Documents, OIDC Discovery. Both almost right.

DID docs bring in JSON-LD, DID methods, and resolver infrastructure agents don't need. OIDC Discovery assumes an OAuth/OIDC stack + central auth server. Neither is shaped for a lightweight, framework-neutral agent manifest any consumer can verify locally.

## 6/

The benchmark: 30 fixtures across 6 categories (simple, ranking, filter, contains, expiry, empty). Network is audited via a fetch wrapper — not mocked. Final assertion: `logs/network.jsonl` is empty. It is. Three runs, byte-identical. SHA-256 locked: `7C0BF8021A4FC922F4594523202522A917CC963CBB660DE2016F98DC8DB2D8D7`.

## 7/

Run it:

```
p2pad keygen alice
p2pad manifest create draft.json alice.priv > manifest.json
p2pad manifest verify manifest.json
p2pad discover query.json manifests/
```

Or one-liner from repo root: `bash full-cycle.sh`

## 8/

This pairs with agent-reputation (Plan 8 sibling). Discovery finds agents by what they claim to do. Reputation tells you whether to trust the claim. Chain them: discover → filter by attestation count from trusted attestors → invoke. The composition pattern is in ARCHITECTURE.md.

## 9/

v1.1 candidates on the table: `taxonomy_ref` (anchor capability names to a shared vocabulary), `attestation_refs` (link to reputation attestations from the manifest), transport hints. Weigh in at OPEN_QUESTIONS.md before these get locked.

## 10/

Spec, reference CLI, benchmark, full-cycle script: https://accuoa.github.io/p2p-agent-discovery/

Apache-2.0. Issues welcome: https://github.com/Accuoa/p2p-agent-discovery/issues
