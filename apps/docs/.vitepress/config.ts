import { readFileSync } from 'node:fs';
import { defineConfig, type DefaultTheme } from 'vitepress';

const siteBase = process.env.DSK_DOCS_BASE ?? '/';

function sidebar(ru: boolean): DefaultTheme.SidebarItem[] {
  const base = ru ? '/ru' : '';
  return [
    {
      text: ru ? 'Начало работы' : 'Getting started',
      items: [
        {
          text: ru ? 'Введение' : 'Introduction',
          link: `${base}/guide/introduction`,
        },
        {
          text: ru ? 'Подключение' : 'Installation',
          link: `${base}/guide/installation`,
        },
        {
          text: ru ? 'Стили и темы' : 'Styling & themes',
          link: `${base}/guide/styling`,
        },
      ],
    },
    {
      text: ru ? 'Компоненты' : 'Components',
      items: [
        {
          text: ru ? 'Поля и группы' : 'Inputs & groups',
          link: `${base}/components/inputs`,
        },
        {
          text: ru ? 'Цвет и пипетка' : 'Color & eyedropper',
          link: `${base}/components/color`,
        },
        {
          text: ru ? 'Угол и кривые' : 'Angle & curves',
          link: `${base}/components/geometry`,
        },
        {
          text: ru ? 'Дерево слоёв' : 'Layer tree',
          link: `${base}/components/layers`,
        },
        {
          text: ru ? 'Виджеты холста' : 'Canvas widgets',
          link: `${base}/components/canvas`,
        },
      ],
    },
    {
      text: 'Real world examples',
      items: [
        ['tldraw', 'tldraw SDK', 'svg'],
        ['excalidraw', 'Excalidraw', 'png'],
        ['reactflow', 'React Flow', 'svg'],
        ['three', 'Three.js', 'ico'],
        ['konva', 'Konva.js', 'png'],
        ['fabric', 'Fabric.js', 'ico'],
      ].map(([engine, label, extension]) => ({
        text: `<span class="dsk-engine-nav"><img src="${siteBase}engines/${engine}.${extension}" width="18" height="18" alt="" aria-hidden="true" /><span>${label}</span></span>`,
        docFooterText: label,
        link: `${base}/examples/${engine}`,
      })),
    },
  ];
}

export default defineConfig({
  title: 'DSK',
  base: siteBase,
  description: 'Design System Kit — UI primitives for creative tools.',
  outDir: './dist',
  srcExclude: ['examples/tldraw-project/**'],
  cleanUrls: true,
  appearance: 'force-dark',
  vite: {
    optimizeDeps: {
      // Discover all demo engines at startup, not midway through route navigation.
      include: [
        '@excalidraw/excalidraw',
        '@xyflow/react',
        'three',
        'konva',
        'fabric',
        'tldraw',
        'react',
        'react-dom/client',
      ],
    },
  },
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: `data:image/svg+xml,${encodeURIComponent(readFileSync(new URL('../../../packages/vanilla/assets/dsk-logo.svg', import.meta.url), 'utf8'))}`,
        type: 'image/svg+xml',
      },
    ],
  ],
  vue: {
    template: {
      compilerOptions: { isCustomElement: (tag) => tag.startsWith('dsk-') },
    },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Documentation', link: '/guide/introduction' },
          { text: 'Components', link: '/components/inputs' },
          { text: 'GitHub', link: 'https://github.com/Flowscape-UI/dsk' },
        ],
        sidebar: sidebar(false),
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      description:
        'Design System Kit — компоненты для творческих инструментов.',
      themeConfig: {
        nav: [
          { text: 'Документация', link: '/ru/guide/introduction' },
          { text: 'Компоненты', link: '/ru/components/inputs' },
          { text: 'GitHub', link: 'https://github.com/Flowscape-UI/dsk' },
        ],
        sidebar: sidebar(true),
        outline: { label: 'На этой странице' },
        docFooter: { prev: 'Предыдущая страница', next: 'Следующая страница' },
        sidebarMenuLabel: 'Меню',
        returnToTopLabel: 'Наверх',
        langMenuLabel: 'Язык',
        darkModeSwitchLabel: 'Оформление',
        lightModeSwitchTitle: 'Светлая тема',
        darkModeSwitchTitle: 'Тёмная тема',
        skipToContentLabel: 'К содержимому',
      },
    },
  },
  themeConfig: {
    siteTitle: 'Design System Kit',
    outline: [2, 3],
    search: {
      provider: 'local',
      options: {
        locales: {
          ru: {
            translations: {
              button: {
                buttonText: 'Поиск',
                buttonAriaLabel: 'Поиск по документации',
              },
              modal: {
                noResultsText: 'Ничего не найдено',
                resetButtonTitle: 'Очистить',
                backButtonTitle: 'Назад',
                displayDetails: 'Показать подробности',
                footer: {
                  selectText: 'выбрать',
                  navigateText: 'перейти',
                  closeText: 'закрыть',
                },
              },
            },
          },
        },
      },
    },
  },
});
