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
const recordedAt = entry.match(/\*\*Recorded at:\*\* `([^`]+)`/)?.[1];
if (
  !recordedAt ||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(recordedAt) ||
  !Number.isFinite(Date.parse(recordedAt))
)
  throw new Error(
    'The changelog requires an ISO 8601 recording timestamp with a timezone offset.',
  );
console.log(
  `Release metadata verified for ${manifest.name}@${manifest.version}.`,
);
