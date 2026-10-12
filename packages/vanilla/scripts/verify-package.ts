import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const archive = process.argv[2];
assert(archive, 'Pass the tarball created by pnpm pack.');
const filename = resolve(archive);
const files = new Set(
  execFileSync('tar', ['-tzf', filename], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/),
);
const packed = JSON.parse(
  execFileSync('tar', ['-xOf', filename, 'package/package.json'], {
    encoding: 'utf8',
  }),
) as { name: string; version: string; exports: unknown; types: string };
const local = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };
assert.equal(packed.name, local.name);
assert.equal(packed.version, local.version);

function verifyTarget(value: unknown): void {
  if (typeof value === 'string') {
    assert(value.startsWith('./'), `Invalid export target: ${value}`);
    assert(files.has(`package/${value.slice(2)}`), `Missing export: ${value}`);
  } else {
    assert(value && typeof value === 'object', 'Expected export conditions.');
    assert(
      !('development' in value),
      'Local development exports leaked into the archive.',
    );
    for (const target of Object.values(value)) verifyTarget(target);
  }
}
verifyTarget(packed.exports);
verifyTarget(packed.types);
for (const file of files) {
  assert(
    !/^package\/(src|tests|scripts|apps|node_modules)\//.test(file),
    `Unexpected package file: ${file}`,
  );
}
assert(
  files.has('package/dist/LICENSE'),
  'The archive must contain its license.',
);
console.log(
  `Verified ${packed.name}@${packed.version}: ${files.size} files and all export targets.`,
);
