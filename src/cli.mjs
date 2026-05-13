#!/usr/bin/env node
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { generateKeypair, decodePrivateKey } from './keys.mjs';
import { signManifest, verifyManifest } from './signature.mjs';
import { verifyFingerprint } from './fingerprint.mjs';
import { match } from './match.mjs';
import { canonicalize } from './canonical.mjs';

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

function cmdManifestCreate(draftPath, privPath) {
  if (!draftPath || !privPath) fail('manifest create requires <draft.json> <priv>');
  let draft, priv;
  try {
    draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
  } catch (e) {
    fail(`could not parse draft: ${e.message}`);
  }
  try {
    priv = readFileSync(privPath, 'utf-8').trim();
  } catch (e) {
    fail(`could not read priv: ${e.message}`);
  }
  const sig = signManifest(draft, decodePrivateKey(priv));
  const signed = { ...draft, signature: { algo: 'ed25519', value: sig } };
  process.stdout.write(canonicalize(signed) + '\n');
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

function cmdDiscover(queryPath, manifestDir) {
  if (!queryPath || !manifestDir) fail('discover requires <query.json> <manifest_dir>');
  let q;
  try {
    q = JSON.parse(readFileSync(queryPath, 'utf-8'));
  } catch (e) {
    fail(`could not parse query: ${e.message}`);
  }
  const manifests = [];
  let entries;
  try {
    entries = readdirSync(manifestDir);
  } catch (e) {
    fail(`could not read manifest dir: ${e.message}`);
  }
  for (const f of entries) {
    if (extname(f) !== '.json') continue;
    const p = join(manifestDir, f);
    if (!statSync(p).isFile()) continue;
    try {
      manifests.push(JSON.parse(readFileSync(p, 'utf-8')));
    } catch (e) {
      fail(`could not parse ${p}: ${e.message}`);
    }
  }
  const now = process.env.P2PAD_TIME_OVERRIDE || new Date().toISOString();
  const results = match(q, manifests, { now });
  process.stdout.write(canonicalize(results) + '\n');
}

function main() {
  const [cmd, sub, ...rest] = args;
  if (cmd === 'keygen') return cmdKeygen(sub);
  if (cmd === 'manifest' && sub === 'create') return cmdManifestCreate(rest[0], rest[1]);
  if (cmd === 'manifest' && sub === 'verify') return cmdManifestVerify(rest[0]);
  if (cmd === 'discover') return cmdDiscover(sub, rest[0]);
  fail(`unknown command: ${args.join(' ')}`);
}

main();
