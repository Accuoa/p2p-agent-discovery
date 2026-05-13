# Calibration

**Locked headline:** 100% capability-match fidelity (30/30) — 0 external network calls — Strong band — 3 byte-identical runs.

## Method

`benchmark/calibrate.sh` runs `npm run benchmark` three times sequentially and asserts byte-identical stdout across all three. The benchmark loads 30 fixture pairs from `benchmark/data/`, runs the matcher under an audited fetch wrapper, compares canonical-JSON output to the golden file, and reports pass/fail and external network calls.

## Fidelity bands

| Band | Threshold |
|---|---|
| Strong | 30/30 + 0 external calls + 3 byte-identical runs |
| Adequate | 27–29 / 30 + 0 external calls + 3 byte-identical runs |
| Weak | < 27 / 30 OR any external calls OR run drift |

## Result

```json
{"external_network_calls":0,"fail":0,"failures":[],"pass":30,"total":30}
```

Three byte-identical runs (sha256 hashes match):

- `logs/calibration/run-1.json`
- `logs/calibration/run-2.json`
- `logs/calibration/run-3.json`

SHA256 (all three): `7C0BF8021A4FC922F4594523202522A917CC963CBB660DE2016F98DC8DB2D8D7`

## Reproducibility note

The 30 fixture signed manifests contain fresh per-run Ed25519 keypairs (the dataset is keypair-randomized at generation time; see `benchmark/generate-fixtures.mjs`). Once committed to `benchmark/data/samples.jsonl`, the dataset is frozen — the calibration is deterministic against that frozen snapshot. Re-running `generate-fixtures.mjs` produces a structurally equivalent dataset with different keys; that is expected.

The reference matcher is fully deterministic given a fixed dataset, fixed time (`P2PAD_TIME_OVERRIDE=2026-05-13T00:00:00Z`), and fixed input order.
