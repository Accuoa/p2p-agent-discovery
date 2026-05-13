# USAGE

## Commands

### `p2pad keygen <name>`

Generate an Ed25519 keypair. Writes:
- `<name>.priv` — base64-encoded 32-byte private key
- `<name>.pub`  — base64-encoded 32-byte public key

### `p2pad manifest create <draft.json> <priv>`

Sign a draft manifest. Writes the signed canonical JSON to stdout.

### `p2pad manifest verify <manifest.json>`

Verify a signed manifest. Exits 0 on valid; prints `ok <id> <fingerprint>`. Exits non-zero on invalid signature or fingerprint mismatch.

### `p2pad discover <query.json> <manifest_dir>`

Read every `*.json` file in `<manifest_dir>`, verify each, run the matcher with `<query.json>`, and write the ranked result array to stdout.

## Environment

- `P2PAD_TIME_OVERRIDE` — ISO-8601 timestamp used in place of the current time for expiry checks. Used by the benchmark for reproducibility.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Caller error (bad args, unparseable JSON, missing file) |
| 2 | Validation failure (invalid signature, fingerprint mismatch, schema violation) |
