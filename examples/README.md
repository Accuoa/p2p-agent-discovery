# Examples

Drafts you can sign with your own keys and run against the reference CLI.

## Quick walkthrough

```bash
# 1. Generate a keypair
p2pad keygen alice

# 2. Edit examples/manifest-summarizer.json — paste your alice.pub into publisher.key
#    and the output of:
#       node -e "import('./src/fingerprint.mjs').then(m => console.log(m.fingerprintForPublicKey(require('fs').readFileSync('alice.pub','utf-8').trim())))"
#    into publisher.id

# 3. Sign the manifest
p2pad manifest create examples/manifest-summarizer.json alice.priv > manifests/summarizer.json

# 4. Verify
p2pad manifest verify manifests/summarizer.json

# 5. Discover
p2pad discover examples/query-summarize-fr.json manifests/
```
