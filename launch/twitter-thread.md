# Twitter / X thread — P2PAgentDiscovery launch

## 1/

100% capability-match fidelity (30/30) — 0 external calls — Strong band — 3 byte-identical runs.

New: P2PAgentDiscovery — portable agent manifest + deterministic matcher. No central registry. ↓

## 2/

The problem: LangChain, AutoGen, CrewAI, every marketplace — each has its own agent registry. None speak to each other.

When agent A needs agent B from a different framework, there's no portable signed document B can hand A.

## 3/

p2p-agent-discovery is two things:

1. Agent Manifest — signed JSON: publisher key + fingerprint, capabilities, endpoints, expiry
2. Deterministic matching algorithm: filter → score → sort. Same inputs → byte-identical output.

## 4/

Signature scheme: Ed25519 over canonical JSON (RFC 8785 JCS).

Fingerprint: `ed25519:<11-char base64url SHA-256 prefix>`.

Self-contained — no registry, no shared secret. Verifier needs only the manifest file.

## 5/

Closest prior art: W3C DID Documents, OIDC Discovery. Both almost right.

DID brings JSON-LD + resolver infra agents don't need. OIDC assumes a central auth server.

Neither is shaped for a lightweight, framework-neutral agent manifest.

## 6/

The benchmark: 30 fixtures across 6 categories — simple, ranking, filter, contains, expiry, empty.

Network is audited via fetch wrapper, not mocked. Three runs, byte-identical.

SHA-256 of the report is locked in calibration.md.

## 7/

Run it:

```
p2pad keygen alice
p2pad manifest create draft.json alice.priv > m.json
p2pad manifest verify m.json
p2pad discover query.json manifests/
```

Or one-liner: `bash full-cycle.sh`

## 8/

This pairs with agent-reputation (Plan 8 sibling).

Discovery finds agents by claim. Reputation tells you whether to trust the claim.

Compose: discover → filter by attestation count → invoke. Pattern is in ARCHITECTURE.md.

## 9/

v1.1 candidates: `taxonomy_ref` (anchor capability names), `attestation_refs` (link reputation from manifest), transport hints.

Weigh in at OPEN_QUESTIONS.md before these lock.

## 10/

Spec, reference CLI, benchmark, full-cycle:
https://accuoa.github.io/p2p-agent-discovery/

Apache-2.0. Issues welcome:
https://github.com/Accuoa/p2p-agent-discovery/issues
