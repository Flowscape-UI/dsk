import { readFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string; private?: boolean };
const expectedTag = `v${manifest.version}`;
if (process.env.GITHUB_REF_NAME !== expectedTag)
  throw new Error(`The release tag must be ${expectedTag}.`);
if (manifest.private)
  throw new Error(
    'Publication is disabled. The owner must approve removing private: true before a release.',
  );
const changelog = readFileSync(
  new URL('../../../CHANGELOG.md', import.meta.url),
  'utf8',
);
const entry = changelog
  .split(`## ${manifest.version} - `)[1]
  ?.split('\n## ')[0];
if (!entry || !/\*\*Status:\*\* (?:Ready for release|Released)\./.test(entry))
  throw new Error(
    `Mark version ${manifest.version} as Ready for release in CHANGELOG.md before publishing.`,
  );
console.log(
  `Release metadata verified for ${manifest.name}@${manifest.version}.`,
);
