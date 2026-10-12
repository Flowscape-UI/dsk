import { buildTldrawProject } from './build-tldraw-project.ts';
import type { ExampleProject } from '../theme/example-project-types.ts';

declare const data: ExampleProject;
export { data };

export default {
  watch: [
    '../../examples/tldraw-project/**',
    '../../snippets/tldraw/**',
    '../../../../packages/vanilla/dist/**',
    '../../../../packages/vanilla/assets/**',
    '../../../../packages/vanilla/package.json',
  ],
  load: buildTldrawProject,
};
