import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  useId,
  type PropType,
  type VNode,
} from 'vue';
import { useData } from 'vitepress';
import type { ExampleProject, ProjectFile } from './example-project-types.ts';
import {
  projectChevron,
  projectFileIcon,
  projectFolderIcon,
} from './project-icons.ts';
import './example-project.css';

interface Folder {
  name: string;
  files: ProjectFile[];
  folders: Map<string, Folder>;
}

/** A read-only project explorer. The displayed sources also produce its ZIP. */
export const ExampleProjectViewer = defineComponent({
  props: {
    project: { type: Object as PropType<ExampleProject>, required: true },
  },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const selected = ref('src/main.ts');
    const ready = ref(false);
    onMounted(() => {
      ready.value = true;
    });
    const message = ref('');
    const editor = ref<HTMLElement>();
    const id = useId();
    const file = computed(
      () =>
        props.project.files.find((file) => file.path === selected.value) ??
        props.project.files[0]!,
    );
    const tree = computed(() => {
      const root: Folder = {
        name: props.project.name,
        files: [],
        folders: new Map(),
      };
      for (const file of props.project.files) {
        const parts = file.path.split('/');
        parts.pop();
        let folder = root;
        for (const name of parts) {
          if (!folder.folders.has(name))
            folder.folders.set(name, { name, files: [], folders: new Map() });
          folder = folder.folders.get(name)!;
        }
        folder.files.push(file);
      }
      return root;
    });
    const choose = async (path: string) => {
      selected.value = path;
      message.value = '';
      await nextTick();
      editor.value?.scrollTo({ top: 0, left: 0 });
    };
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(file.value.code);
        message.value = t('Copied', 'Скопировано');
      } catch {
        message.value = t(
          'Select the code and copy it manually.',
          'Выделите код и скопируйте его вручную.',
        );
      }
    };
    const icon = (kind: 'copy' | 'download') =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.6,
          'aria-hidden': 'true',
        },
        [
          h('path', {
            d:
              kind === 'copy'
                ? 'M8 8h12v13H8zM16 8V3H3v13h5'
                : 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
          }),
        ],
      );
    const children = (folder: Folder): VNode[] => [
      ...Array.from(folder.folders.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((folder) =>
          h('li', { key: folder.name }, [
            h('details', { open: folder.name !== 'vendor' }, [
              h('summary', [
                projectChevron(),
                projectFolderIcon(),
                h('span', folder.name),
              ]),
              h('ul', children(folder)),
            ]),
          ]),
        ),
      ...[...folder.files]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((entry) =>
          h('li', { key: entry.path }, [
            h(
              'button',
              {
                type: 'button',
                disabled: !ready.value,
                class: [
                  'dsk-project-file',
                  { 'is-active': file.value.path === entry.path },
                ],
                'aria-current':
                  file.value.path === entry.path ? 'true' : undefined,
                'aria-controls': id,
                title: entry.path,
                onClick: () => choose(entry.path),
              },
              [
                projectFileIcon(entry.path),
                h('span', entry.path.split('/').pop()),
              ],
            ),
          ]),
        ),
    ];
    return () =>
      h(
        'section',
        {
          class: 'dsk-project',
          'data-ready': String(ready.value),
          'aria-label': t('Example project files', 'Файлы проекта примера'),
        },
        [
          h('header', { class: 'dsk-project-header' }, [
            h('div', [
              h(
                'span',
                { class: 'dsk-project-eyebrow' },
                t('COMPLETE PROJECT', 'ПОЛНЫЙ ПРОЕКТ'),
              ),
              h('strong', props.project.name),
            ]),
            h(
              'a',
              {
                class: 'dsk-project-download',
                href: `data:application/zip;base64,${props.project.archive}`,
                download: `${props.project.name}.zip`,
              },
              [icon('download'), t('Download ZIP', 'Скачать ZIP')],
            ),
          ]),
          h('div', { class: 'dsk-project-workspace' }, [
            h(
              'nav',
              {
                class: 'dsk-project-explorer',
                'aria-label': t('Project files', 'Файлы проекта'),
              },
              [
                h(
                  'div',
                  { class: 'dsk-project-explorer-title' },
                  t('EXPLORER', 'ПРОВОДНИК'),
                ),
                h('details', { open: true, class: 'dsk-project-root' }, [
                  h('summary', { title: props.project.name }, [
                    projectChevron(),
                    h('strong', props.project.name),
                  ]),
                  h('ul', children(tree.value)),
                ]),
              ],
            ),
            h('div', { class: 'dsk-project-editor' }, [
              h('div', { class: 'dsk-project-tab' }, [
                h('div', { class: 'dsk-project-active-tab' }, [
                  projectFileIcon(file.value.path),
                  h('span', file.value.path.split('/').pop()),
                ]),
                !file.value.binary
                  ? h(
                      'button',
                      {
                        type: 'button',
                        onClick: copy,
                        'aria-label': t('Copy file', 'Скопировать файл'),
                        title: t('Copy file', 'Скопировать файл'),
                      },
                      [icon('copy')],
                    )
                  : null,
              ]),
              h(
                'div',
                {
                  class: 'dsk-project-breadcrumbs',
                  'aria-label': t('File path', 'Путь к файлу'),
                },
                file.value.path
                  .split('/')
                  .flatMap((part, index, parts) => [
                    index > 0 ? projectChevron() : null,
                    index === parts.length - 1
                      ? projectFileIcon(file.value.path)
                      : projectFolderIcon(),
                    h('span', part),
                  ]),
              ),
              h(
                'p',
                { class: 'dsk-project-description' },
                file.value.description[lang.value === 'ru' ? 'ru' : 'en'],
              ),
              h(
                'div',
                {
                  id,
                  ref: editor,
                  class: 'dsk-project-code',
                  tabindex: 0,
                  role: 'region',
                  'aria-label': file.value.path,
                },
                file.value.binary
                  ? h('div', { class: 'dsk-project-binary' }, [
                      h('strong', '.tgz'),
                      h(
                        'p',
                        t(
                          'Included in the project archive',
                          'Включён в архив проекта',
                        ),
                      ),
                    ])
                  : h('div', { innerHTML: file.value.html }),
              ),
              h('footer', { class: 'dsk-project-status' }, [
                h(
                  'span',
                  { role: 'status' },
                  message.value || t('Read only', 'Только чтение'),
                ),
                h('span', `${file.value.language.toUpperCase()} · UTF-8`),
              ]),
            ]),
          ]),
          h('div', { class: 'dsk-project-run' }, [
            h(
              'span',
              t(
                'Extract ZIP, then run inside the project folder:',
                'Распакуйте ZIP и выполните в папке проекта:',
              ),
            ),
            h('code', 'npm install'),
            h('code', 'npm run dev'),
          ]),
        ],
      );
  },
});
