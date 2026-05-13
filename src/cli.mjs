#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'node:fs';
import { generateKeypair } from './keys.mjs';
import { verifyManifest } from './signature.mjs';
import { verifyFingerprint } from './fingerprint.mjs';

const args = process.argv.slice(2);

function fail(msg, code = 1) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function cmdKeygen(name) {
  if (!name) fail('keygen requires <name>');
  const kp = generateKeypair();
  writeFileSync(`${name}.priv`, kp.private_key);
  writeFileSync(`${name}.pub`, kp.public_key);
  process.stdout.write(`wrote ${name}.priv and ${name}.pub\n`);
}

function cmdManifestVerify(path) {
  if (!path) fail('manifest verify requires <path>');
  let m;
  try {
    m = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    fail(`could not read or parse ${path}: ${e.message}`);
  }
  if (!verifyManifest(m)) fail(`signature invalid for ${path}`, 2);
  if (!verifyFingerprint(m.publisher?.key, m.publisher?.id)) {
    fail(`fingerprint mismatch for ${path}`, 2);
  }
  process.stdout.write(`ok ${m.id} ${m.publisher.id}\n`);
}

function main() {
  const [cmd, sub, ...rest] = args;
  if (cmd === 'keygen') return cmdKeygen(sub);
  if (cmd === 'manifest' && sub === 'verify') return cmdManifestVerify(rest[0]);
  if (cmd === 'manifest' && sub === 'create') {
    fail('manifest create is implemented in Task 14');
  }
  if (cmd === 'discover') {
    fail('discover is implemented in Task 14');
  }
  fail(`unknown command: ${args.join(' ')}`);
}

main();
