import { buildEngineProject } from './build-engine-project.ts';
import type { ExampleProject } from '../theme/example-project-types.ts';

declare const data: ExampleProject;
export { data };

export default {
  watch: [
    '../../snippets/fabric/**',
    '../../snippets/shared/**',
    '../../examples/tldraw-project/**',
    '../../package.json',
    '../../../../packages/vanilla/dist/**',
    '../../../../packages/vanilla/assets/**',
    '../../../../packages/vanilla/package.json',
  ],
  load: () => buildEngineProject('fabric'),
};
