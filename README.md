# P2PAgentDiscovery

> Status: draft spec v0.1

A portable agent manifest format and a deterministic capability-matching algorithm — so agents in different frameworks can announce capabilities and be discovered by claim, without a central registry.

Read the [spec](./SPEC.md) for the normative manifest format and matching algorithm. The [architecture](./ARCHITECTURE.md) document covers the reference implementation. The [reference implementation](./reference-impl/) is a Node.js CLI that passes the test vectors in [examples/fixtures/](./examples/fixtures/).

## Quick example

```bash
p2pad keygen alice                             # → alice.priv, alice.pub
p2pad manifest create draft.json alice.priv    # → signed manifest.json
p2pad manifest verify manifest.json            # → exit 0, prints fingerprint
p2pad discover query.json manifests/           # → ranked JSON results to stdout
```

## Headline metric

**100% capability-match fidelity (30/30) — 0 external network calls — Strong band — three byte-identical runs.**

See [benchmark/](./benchmark/) and `calibration.md` (committed once the reference implementation lands).

## Composes with

- [agent-reputation](https://github.com/Accuoa/agent-reputation) — discovery (this protocol) finds the agent by its claim; reputation tells you whether to trust the claim.

## Open questions

See [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md). Honest list of unresolved design decisions — feedback welcome.

## Landing page

[accuoa.github.io/p2p-agent-discovery](https://accuoa.github.io/p2p-agent-discovery)

## License

Apache-2.0 — see [LICENSE](./LICENSE). The patent grant is intentional; protocol adopters need this assurance.
