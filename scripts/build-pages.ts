import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = '/dsk/';

function run(args: string[]): void {
  const result = spawnSync('pnpm', args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, DSK_DOCS_BASE: base },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['--filter', '@flowscape-ui/dsk', 'build']);
run(['--filter', '@dsk/docs', 'build']);
writeFileSync(join(root, 'apps/docs/dist/.nojekyll'), '');
