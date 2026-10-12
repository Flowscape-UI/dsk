import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as tar } from 'tar';
import { strToU8, zipSync } from 'fflate';
import { createHighlighter } from 'shiki';
import type {
  ExampleProject,
  ProjectFile,
} from '../theme/example-project-types.ts';

const docs = fileURLToPath(new URL('../../', import.meta.url));
const library = fileURLToPath(
  new URL('../../../../packages/vanilla/', import.meta.url),
);
const template = join(docs, 'examples/tldraw-project');
const snippet = join(docs, 'snippets/tldraw');

/** Package the built library so the ZIP works independently of npm publication. */
function librarySnapshot(): Uint8Array {
  const parent = resolve(tmpdir());
  const stage = mkdtempSync(join(parent, 'dsk-example-package-'));
  try {
    const manifest = JSON.parse(
      readFileSync(join(library, 'package.json'), 'utf8'),
    ) as {
      name: string;
      version: string;
      license: string;
      dependencies: Record<string, string>;
    };
    cpSync(join(library, 'dist'), join(stage, 'dist'), { recursive: true });
    cpSync(join(library, 'assets'), join(stage, 'assets'), { recursive: true });
    cpSync(join(library, '../../LICENSE'), join(stage, 'LICENSE'));
    writeFileSync(
      join(stage, 'package.json'),
      JSON.stringify(
        {
          name: manifest.name,
          version: manifest.version,
          license: manifest.license,
          type: 'module',
          sideEffects: ['**/*.css', './dist/index.js', './dist/dsk.global.js'],
          types: './dist/index.d.ts',
          dependencies: manifest.dependencies,
          exports: {
            '.': { types: './dist/index.d.ts', default: './dist/index.js' },
            './styles.css': {
              types: './dist/styles.d.css.ts',
              default: './dist/styles.css',
            },
            './logo.svg': './assets/dsk-logo.svg',
            './global': './dist/dsk.global.js',
            './package.json': './package.json',
          },
        },
        null,
        2,
      ),
    );
    tar(
      {
        cwd: stage,
        file: join(stage, 'dsk.tgz'),
        prefix: 'package/',
        gzip: true,
        portable: true,
        sync: true,
        mtime: new Date('2000-01-01'),
      },
      ['package.json', 'dist', 'assets', 'LICENSE'],
    );
    return readFileSync(join(stage, 'dsk.tgz'));
  } finally {
    // Only remove the unique staging directory created by this invocation.
    if (resolve(stage).startsWith(join(parent, 'dsk-example-package-')))
      rmSync(stage, { recursive: true, force: true });
  }
}

export async function buildTldrawProject(): Promise<ExampleProject> {
  const definitions = [
    [
      'README.md',
      template,
      'md',
      'Start here: installation, customization and deployment.',
      'Начните здесь: установка, настройка и публикация.',
    ],
    [
      'package.json',
      template,
      'json',
      'Dependencies and the dev, build and preview commands.',
      'Зависимости и команды dev, build и preview.',
    ],
    [
      'tsconfig.json',
      template,
      'json',
      'Strict TypeScript settings for a browser application.',
      'Строгие настройки TypeScript для браузерного приложения.',
    ],
    [
      'index.html',
      template,
      'html',
      'Page markup and the host for the editor.',
      'Разметка страницы и контейнер редактора.',
    ],
    [
      '.env.example',
      template,
      'dotenv',
      'The tldraw deployment key. Leave empty for localhost.',
      'Ключ tldraw для публикации. На localhost оставьте пустым.',
    ],
    [
      '.gitignore',
      template,
      'text',
      'Keep installed dependencies, build output and local settings out of Git.',
      'Исключает зависимости, сборку и локальные настройки из Git.',
    ],
    [
      'src/main.ts',
      template,
      'ts',
      'The entry point: mount the editor and register cleanup.',
      'Точка входа: подключение редактора и очистка при перезагрузке.',
    ],
    [
      'src/mount-example.ts',
      snippet,
      'ts',
      'The same editor setup used by the live example above.',
      'Тот же код создания редактора, что используется в примере выше.',
    ],
    [
      'src/bind-dsk.ts',
      snippet,
      'ts',
      'Camera coordinates, two-way inputs, history and the comment anchor.',
      'Координаты камеры, двусторонняя связь полей, история и привязка комментария.',
    ],
    [
      'src/style.css',
      snippet,
      'css',
      'The shared editor layout and DSK appearance.',
      'Общая компоновка редактора и оформление DSK.',
    ],
    [
      'src/page.css',
      template,
      'css',
      'Styles for the standalone page only.',
      'Стили только для самостоятельной страницы.',
    ],
  ] as const;
  return buildSourceProject(
    'dsk-tldraw-example',
    definitions.map(([path, directory, language, en, ru]) => ({
      path,
      language,
      en,
      ru,
      code: readFileSync(join(directory, path.replace(/^src\//, '')), 'utf8'),
    })),
  );
}

export interface ProjectSource {
  path: string;
  language: string;
  code: string;
  en: string;
  ru: string;
}

/** Highlight and archive the same sources so the viewer cannot drift from its ZIP. */
export async function buildSourceProject(
  name: string,
  sources: ProjectSource[],
): Promise<ExampleProject> {
  const highlighter = await createHighlighter({
    themes: ['dark-plus'],
    langs: ['ts', 'json', 'html', 'css', 'md', 'dotenv'],
  });
  try {
    const archive: Record<string, Uint8Array> = {};
    const files: ProjectFile[] = sources.map(
      ({ path, language, code: source, en, ru }) => {
        const code = source.replace(/\r\n/g, '\n');
        archive[`${name}/${path}`] = strToU8(code);
        return {
          path,
          language,
          code,
          html: highlighter.codeToHtml(code.trimEnd(), {
            lang: language,
            theme: 'dark-plus',
          }),
          description: { en, ru },
        };
      },
    );
    archive[`${name}/vendor/flowscape-ui-dsk.tgz`] = librarySnapshot();
    files.push({
      path: 'vendor/flowscape-ui-dsk.tgz',
      language: 'tgz',
      code: '',
      html: '',
      binary: true,
      description: {
        en: 'The built DSK package, included in the ZIP. npm installs this local snapshot automatically. No editing is needed.',
        ru: 'Собранный пакет DSK внутри ZIP. npm автоматически установит эту локальную копию. Редактировать её не нужно.',
      },
    });
    return {
      name,
      files,
      archive: Buffer.from(
        zipSync(archive, { level: 6, mtime: new Date('2000-01-01') }),
      ).toString('base64'),
    };
  } finally {
    highlighter.dispose();
  }
}
