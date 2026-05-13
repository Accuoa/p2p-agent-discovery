# Open Questions

This document is intentionally honest about what's not yet settled.

## Q1: Should the spec recommend a default transport for v1.0?

**Context.** "P2P" in this protocol means transport-agnostic — no central registry is assumed. But a spec with no transport reference can read as evasive. Implementers will reasonably ask "OK, so how do I actually move manifests around?"

**Options.**
- A: Recommend nothing — leave transport entirely to implementers.
- B: Mention HTTP GET of a static URL as a trivial non-normative baseline.
- C: Normatively specify a transport (e.g., DHT-based, mDNS).

**Current lean.** B. Honors transport-agnosticism while giving a concrete starting point. Add to a non-normative "Implementation notes" section in v1.0, not the normative body.

**Feedback wanted.** Open an issue or DM.

## Q2: Capability name ontology — free-form or shared?

**Context.** Capability names like `text.summarize` are free-form publisher strings in v0.1. Two publishers might both claim `summarize` but mean different things — one returns a paragraph, the other a list of bullet points. The spec does nothing to disambiguate.

**Options.**
- A: Free-form forever; let conventions emerge across the ecosystem.
- B: Add an optional `taxonomy_ref` field in v1.1 that points at a registry (AGNTCY's capability taxonomy is a candidate).
- C: Normatively specify a shared taxonomy in v1.0.

**Current lean.** A for v0.1. Revisit B in v1.1 if a registry achieves real adoption.

**Feedback wanted.** Open an issue or DM.

## Q3: Regex constraints?

**Context.** Excluded from v1.0 to avoid regex-engine drift between implementation languages. ECMAScript regex, Python regex, RE2, and PCRE all differ in edge cases (back-references, lookahead, Unicode category handling).

**Options.**
- A: Keep regex out forever — closed set of comparison operators only.
- B: Add in v1.1 with a normative regex dialect (ECMAScript 2018 or RE2 are the realistic candidates).

**Current lean.** A unless a real fixture demands it.

**Feedback wanted.** Open an issue or DM.

## Q4: How should this compose with Plan 8 (agent-reputation)?

**Context.** Discovery finds agents by claim; reputation verifies the claim. Composition is enabled by independent design but not codified in either wire format.

**Options.**
- A: Document the composition pattern in SPEC.md and ARCHITECTURE.md without a normative reference (status quo for v0.1).
- B: Add a normative `attestation_refs` field on the manifest in v1.1 that points at attestation URLs.
- C: Leave composition entirely to consumers; remove any cross-protocol documentation.

**Current lean.** A for v0.1. Reconsider B in v1.1 once Plan 8 has more adoption.

**Feedback wanted.** Open an issue or DM.
