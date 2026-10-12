import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  buildSourceProject,
  type ProjectSource,
} from './build-tldraw-project.ts';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(docs, 'package.json'), 'utf8'),
) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const engines = {
  excalidraw: {
    label: 'Excalidraw',
    dependencies: ['@excalidraw/excalidraw', 'react', 'react-dom'],
    types: ['@types/react', '@types/react-dom'],
  },
  reactflow: {
    label: 'React Flow',
    dependencies: ['@xyflow/react', 'react', 'react-dom'],
    types: ['@types/react', '@types/react-dom'],
  },
  three: {
    label: 'Three.js',
    dependencies: ['three'],
    types: ['@types/three'],
  },
  konva: { label: 'Konva.js', dependencies: ['konva'], types: [] },
  fabric: { label: 'Fabric.js', dependencies: ['fabric'], types: [] },
};
export type ExampleEngine = keyof typeof engines;

export async function buildEngineProject(engine: ExampleEngine) {
  const config = engines[engine];
  const name = `dsk-${engine}-example`;
  const sources: ProjectSource[] = [];
  const add = (
    path: string,
    code: string,
    language: string,
    en: string,
    ru: string,
  ) => sources.push({ path, code, language, en, ru });
  add(
    'README.md',
    `# DSK + ${config.label}

A standalone version of the documentation example. Requires Node.js 22.12+ and internet access for npm install.

## Run

Extract the entire ZIP, including vendor. Open a terminal in ${name}:

\`\`\`sh
npm install
npm run dev
\`\`\`

Open the localhost address printed by Vite. Run npm run build to check types and build for production, then npm run preview to serve that build.

## Files

- index.html: the page, loading indicator, and editor host.
- src/main.ts: client startup, loading state, and cleanup.
- src/${engine}/: the actual engine adapter used in the documentation.
- src/shared/: native DSK controls, ruler layout, and camera overlay.
- src/page.css: standalone page styles.
- vendor/flowscape-ui-dsk.tgz: a built DSK snapshot installed automatically by npm.

## Customize

Edit the engine's mount-example.ts to change shapes or scene objects. DSK stays outside the engine's rendering surface. Update the engine through its public API and synchronize the selected object and camera back to the shared shell.

The example starts automatically. State stays in memory and resets on reload. Call the returned disposer when removing the example in a routed application. Initialize browser engines only after the DOM host exists, never during server rendering.
`,
    'md',
    'Run, customize, and build the standalone example.',
    'Запуск, настройка и сборка самостоятельного примера.',
  );
  add(
    'package.json',
    JSON.stringify(
      {
        name,
        version: '0.0.0',
        private: true,
        type: 'module',
        engines: { node: '>=22.12.0' },
        scripts: {
          dev: 'vite --host localhost',
          build: 'tsc --noEmit && vite build',
          preview: 'vite preview --host localhost',
        },
        dependencies: {
          '@flowscape-ui/dsk': 'file:./vendor/flowscape-ui-dsk.tgz',
          ...Object.fromEntries(
            config.dependencies.map((key) => [key, manifest.dependencies[key]]),
          ),
        },
        devDependencies: {
          typescript: '6.0.3',
          vite: manifest.devDependencies.vite,
          ...Object.fromEntries(
            config.types.map((key) => [key, manifest.devDependencies[key]]),
          ),
        },
      },
      null,
      2,
    ) + '\n',
    'json',
    'Only the dependencies required by this engine.',
    'Только зависимости, необходимые для этого движка.',
  );
  add(
    'tsconfig.json',
    readFileSync(join(docs, 'examples/tldraw-project/tsconfig.json'), 'utf8'),
    'json',
    'Strict TypeScript configuration for Vite.',
    'Строгая конфигурация TypeScript для Vite.',
  );
  add(
    '.gitignore',
    'node_modules/\ndist/\n.env.local\n',
    'text',
    'Generated and local files excluded from Git.',
    'Генерируемые и локальные файлы, исключённые из Git.',
  );
  add(
    'index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DSK + ${config.label}</title>
  </head>
  <body>
    <main>
      <h1>DSK + ${config.label}</h1>
      <p>Native controls connected to a real ${config.label} scene.</p>
      <div id="loading" role="status"><span class="loading-spinner" aria-hidden="true"></span>Loading interactive example...</div>
      <div id="example"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    'html',
    'Page structure, accessible loading state, and editor host.',
    'Разметка страницы, индикатор загрузки и контейнер редактора.',
  );
  add(
    'src/main.ts',
    `import './page.css';

const root = document.querySelector<HTMLElement>('#example');
const loading = document.querySelector<HTMLElement>('#loading');
if (!root || !loading) throw new Error('Missing example elements');
const host = root;
const status = loading;
let active = true;
let dispose: (() => void) | undefined;
const observer = new MutationObserver(() => {
  if (host.dataset.ready === 'true') {
    status.hidden = true;
    observer.disconnect();
  }
});
observer.observe(host, { attributes: true, attributeFilter: ['data-ready'] });

// Load this engine only after the browser has created its host.
async function start() {
  try {
    const { mountExample } = await import('./${engine}/mount-example.ts');
    if (!active) return;
    const cleanup = await mountExample(host, document.documentElement.lang === 'ru');
    if (!active) { cleanup(); return; }
    dispose = cleanup;
    if (host.dataset.ready === 'true') status.hidden = true;
  } catch (error) {
    if (!active) return;
    status.textContent = 'The example could not load. Check the console and reload the page.';
    console.error(error);
  }
}
void start();

// In a routed application, call cleanup when leaving this page.
function cleanup() {
  active = false;
  observer.disconnect();
  dispose?.();
}
if (import.meta.hot) import.meta.hot.dispose(cleanup);
`,
    'ts',
    'Automatic loading and cleanup on navigation or hot reload.',
    'Автоматическая загрузка и очистка при навигации или перезагрузке.',
  );
  add(
    'src/page.css',
    readFileSync(join(docs, 'examples/tldraw-project/page.css'), 'utf8') +
      `
#loading { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 120px; }
#loading[hidden] { display: none; }
.loading-spinner { width: 24px; height: 24px; border: 2px solid #39393f; border-top-color: #ff0073; border-radius: 50%; animation: spin 900ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .loading-spinner { animation: none; } }
`,
    'css',
    'Standalone page layout and loading indicator.',
    'Оформление самостоятельной страницы и индикатор загрузки.',
  );
  for (const folder of [engine, 'shared']) {
    for (const entry of readdirSync(join(docs, 'snippets', folder), {
      withFileTypes: true,
    })) {
      if (!entry.isFile() || !/\.(ts|css)$/.test(entry.name)) continue;
      if (
        entry.name === 'engine-error-boundary.ts' &&
        !config.dependencies.includes('react')
      )
        continue;
      add(
        `src/${folder}/${entry.name}`,
        readFileSync(join(docs, 'snippets', folder, entry.name), 'utf8'),
        entry.name.endsWith('.css') ? 'css' : 'ts',
        folder === 'shared'
          ? 'The shared native DSK inspector, rulers, and comment overlay.'
          : `The ${config.label} adapter used by the live example.`,
        folder === 'shared'
          ? 'Общая панель DSK, линейки и слой комментария.'
          : `Адаптер ${config.label} из интерактивного примера.`,
      );
    }
  }
  return buildSourceProject(name, sources);
}
