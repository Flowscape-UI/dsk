import { InstallCard } from './install-card.ts';
import {
  defineComponent,
  h,
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { useData, withBase } from 'vitepress';
import type {
  DskColorArea,
  DskColorHue,
  DskColorAlpha,
  DskInput,
  DskAngle,
  DskPanZoom,
  DskRuler,
  CanvasCamera,
} from '@flowscape-ui/dsk';

/** The landing page composes real DSK controls through their public APIs. */
export const EditorPreview = defineComponent({
  name: 'EditorPreview',
  setup() {
    const { lang } = useData();
    const characterStyles = new Map<number, Record<string, number>>();
    const characterStyle = (index: number) => {
      let style = characterStyles.get(index);
      if (!style) {
        style = { '--dsk-character-index': index };
        characterStyles.set(index, style);
      }
      return style;
    };
    const hue = ref(333);
    const saturation = ref(100);
    const brightness = ref(100);
    const color = ref('#FF0073');
    const width = ref(160);
    const height = ref(160);
    const x = ref(0);
    const y = ref(120);
    const opacity = ref(100);
    const angle = ref(32);
    const viewport = ref<DskPanZoom>();
    const zoom = ref(1);
    const mobileToolsOpen = ref(false);
    const activeMobileTool = ref<number | null>(null);
    const mobileWidget = ref<HTMLElement>();
    let lastMobileTool: HTMLButtonElement | undefined;
    const closeMobileWidget = () => {
      activeMobileTool.value = null;
      void nextTick(() => lastMobileTool?.focus({ preventScroll: true }));
    };
    const mobileToolsToggle = ref<HTMLButtonElement>();
    const horizontal = ref<DskRuler>();
    const vertical = ref<DskRuler>();
    const closeMobileToolsOutside = (event: PointerEvent) => {
      if (activeMobileTool.value !== null) {
        if (
          mobileWidget.value &&
          !event.composedPath().includes(mobileWidget.value)
        ) {
          activeMobileTool.value = null;
        }
        return;
      }
      if (!mobileToolsOpen.value) return;
      const group = mobileToolsToggle.value?.parentElement;
      if (group && !event.composedPath().includes(group)) {
        mobileToolsOpen.value = false;
      }
    };
    const canvasActive = ref(false);
    const canvasEvents = new AbortController();
    let layoutObserver: ResizeObserver | undefined;
    let cleanup = () => {};
    const syncCamera = (camera: CanvasCamera) => {
      zoom.value = camera.zoom;
      for (const ruler of [horizontal.value, vertical.value]) {
        if (ruler) ruler.camera = camera;
      }
    };
    onMounted(async () => {
      document.addEventListener('pointerdown', closeMobileToolsOutside, true);
      await customElements.whenDefined('dsk-pan-zoom');
      const view = viewport.value;
      if (!view?.isConnected) return;
      const editor = view.closest<HTMLElement>('.dsk-docs-editor');
      const header = document.querySelector<HTMLElement>('.VPNav');
      const credits = editor?.querySelector<HTMLElement>(
        '.dsk-docs-license-strip',
      );
      const updateHeight = () => {
        editor?.style.setProperty(
          '--dsk-docs-header-height',
          `${header?.getBoundingClientRect().height ?? 64}px`,
        );
        editor?.style.setProperty(
          '--dsk-docs-credits-height',
          `${credits?.getBoundingClientRect().height ?? 0}px`,
        );
      };
      layoutObserver = new ResizeObserver(updateHeight);
      if (header) layoutObserver.observe(header);
      if (credits) layoutObserver.observe(credits);
      updateHeight();
      const surface =
        view.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
      const options = { capture: true, signal: canvasEvents.signal };
      const isCanvas = (event: Event) =>
        !event
          .composedPath()
          .some(
            (node) =>
              node instanceof HTMLElement && node.matches('[slot="overlay"]'),
          );
      view.addEventListener(
        'pointerdown',
        (event) => {
          if (!canvasActive.value && isCanvas(event)) event.stopPropagation();
        },
        options,
      );
      view.addEventListener(
        'wheel',
        (event) => {
          if (!canvasActive.value) event.stopPropagation();
        },
        { ...options, passive: true },
      );
      view.addEventListener(
        'click',
        (event) => {
          if (!isCanvas(event)) return;
          canvasActive.value = true;
          surface?.focus({ preventScroll: true });
        },
        { signal: canvasEvents.signal },
      );
      view.addEventListener(
        'focusin',
        (event) => {
          if (isCanvas(event)) canvasActive.value = true;
        },
        { signal: canvasEvents.signal },
      );
      view.addEventListener(
        'focusout',
        () => {
          queueMicrotask(() => {
            if (!view.matches(':focus-within')) canvasActive.value = false;
          });
        },
        { signal: canvasEvents.signal },
      );
      document.addEventListener(
        'pointerdown',
        (event) => {
          if (!event.composedPath().includes(view)) canvasActive.value = false;
        },
        options,
      );
      window.addEventListener(
        'blur',
        () => {
          canvasActive.value = false;
        },
        { signal: canvasEvents.signal },
      );
      for (const ruler of [horizontal.value, vertical.value]) {
        if (ruler) ruler.target = view;
      }
      syncCamera(view.camera);
      const { animateHomepage } = await import('./motion.ts');
      if (view.isConnected)
        cleanup = animateHomepage(view, syncCamera, { x: x.value, y: y.value });
    });
    onBeforeUnmount(() => {
      document.removeEventListener(
        'pointerdown',
        closeMobileToolsOutside,
        true,
      );
      canvasEvents.abort();
      layoutObserver?.disconnect();
      cleanup();
    });
    return () => {
      const ru = lang.value === 'ru';
      const text = (en: string, translated: string) => (ru ? translated : en);
      const base = ru ? '/ru' : '';
      const supportButton = () =>
        h(
          'a',
          {
            class: 'dsk-docs-support',
            href: 'https://github.com/sponsors/Flowscape-UI',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          [
            h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
              h('path', {
                d: 'M12 20.5 3.7 12.4C-1 7.8 5.9.5 12 6.8c6.1-6.3 13 1 8.3 5.6Z',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2',
                'stroke-linejoin': 'round',
              }),
            ]),
            h('span', text('Support', 'Поддержать')),
          ],
        );
      const field = (
        label: string,
        value: typeof width,
        min: number,
        max: number,
      ) =>
        h('label', { class: 'dsk-docs-field' }, [
          h('span', label),
          h('dsk-input', {
            value: String(value.value),
            min: String(min),
            max: String(max),
            'aria-label': label,
            onInput: (event: Event) => {
              const next = Number((event.target as DskInput).value);
              if (Number.isFinite(next)) value.value = next;
            },
          }),
        ]);
      const panelTitle = (number: string, label: string) =>
        h('div', { class: 'dsk-docs-panel-title' }, [
          h('span', number),
          h('strong', label),
        ]);
      const editingPanels = () => [
        h('div', { class: 'dsk-docs-inspector dsk-docs-panel' }, [
          panelTitle('01', text('Position & size', 'Позиция и размер')),
          field('X', x, -600, 600),
          field('Y', y, -400, 400),
          field(text('Width', 'Ширина'), width, 80, 220),
          field(text('Height', 'Высота'), height, 60, 260),
          h('code', '‹dsk-input›'),
        ]),
        h('div', { class: 'dsk-docs-motion dsk-docs-panel' }, [
          panelTitle('02', text('Rotation', 'Поворот')),
          h('dsk-angle', {
            value: String(angle.value),
            size: '144',
            color: '#ff0073',
            'aria-label': text('Rotation', 'Поворот'),
            onInput: (event: Event) => {
              angle.value = Number((event.target as DskAngle).value);
            },
          }),
          h('code', '‹dsk-angle›'),
        ]),
        h('div', { class: 'dsk-docs-paint dsk-docs-panel' }, [
          panelTitle('03', text('Color & opacity', 'Цвет и прозрачность')),
          h('div', { class: 'dsk-docs-color-controls' }, [
            h('dsk-color-area', {
              hue: String(hue.value),
              saturation: String(saturation.value),
              brightness: String(brightness.value),
              width: '156',
              'aria-label': text('Color area', 'Цветовое поле'),
              onInput: (event: Event) => {
                const area = event.target as DskColorArea;
                color.value = area.color;
                saturation.value = area.saturation;
                brightness.value = area.brightness;
              },
            }),
            h('div', { class: 'dsk-docs-color-sliders' }, [
              h('span', text('Hue', 'Тон')),
              h('dsk-color-hue', {
                hue: String(hue.value),
                'aria-label': text('Hue', 'Цветовой тон'),
                onInput: (event: Event) => {
                  hue.value = (event.target as DskColorHue).hue;
                  const area = (event.target as HTMLElement)
                    .closest('.dsk-docs-color-controls')
                    ?.querySelector('dsk-color-area');
                  if (area) {
                    area.hue = hue.value;
                    color.value = area.color;
                  }
                },
              }),
              h('span', text('Opacity', 'Прозрачность')),
              h('dsk-color-alpha', {
                color: color.value,
                alpha: String(opacity.value),
                'aria-label': text('Opacity', 'Прозрачность'),
                onInput: (event: Event) => {
                  opacity.value = (event.target as DskColorAlpha).alpha;
                },
              }),
              h('output', { class: 'dsk-docs-color-output' }, [
                h('span', { style: { background: color.value } }),
                `${color.value} / ${Math.round(opacity.value)}%`,
              ]),
            ]),
          ]),
          h('code', '‹dsk-color-area› + hue + alpha'),
        ]),
      ];
      return h(
        'section',
        {
          class: 'dsk-docs-editor',
          'aria-label': text(
            'Interactive DSK examples',
            'Интерактивные примеры DSK',
          ),
        },
        [
          h('div', { class: 'dsk-docs-scene' }, [
            h('div', { class: 'dsk-docs-ruler-corner' }),
            h('dsk-ruler', {
              ref: horizontal,
              class: 'dsk-docs-ruler-horizontal',
              'aria-label': text('Horizontal ruler', 'Горизонтальная линейка'),
            }),
            h('dsk-ruler', {
              ref: vertical,
              orientation: 'vertical',
              class: 'dsk-docs-ruler-vertical',
              'aria-label': text('Vertical ruler', 'Вертикальная линейка'),
            }),
            h(
              'dsk-pan-zoom',
              {
                class: [
                  'dsk-docs-artboard',
                  {
                    'dsk-docs-tools-open': mobileToolsOpen.value,
                    'dsk-docs-canvas-active': canvasActive.value,
                  },
                ],
                ref: viewport,
                'aria-label': text(
                  'Demo canvas: drag to pan, pinch to zoom',
                  'Демо-холст: тяните для перемещения, щипок для масштаба',
                ),
                onViewportchange: (event: Event) => {
                  const camera = (event as CustomEvent<CanvasCamera>).detail;
                  syncCamera(camera);
                },
              },
              [
                h(
                  'div',
                  {
                    class: [
                      'dsk-docs-mobile-tools',
                      {
                        'dsk-docs-tools-disabled':
                          activeMobileTool.value !== null,
                      },
                    ],
                    inert: activeMobileTool.value !== null,
                    slot: 'overlay',
                    onKeydown: (event: KeyboardEvent) => {
                      if (event.key === 'Escape' && mobileToolsOpen.value) {
                        event.preventDefault();
                        mobileToolsOpen.value = false;
                        mobileToolsToggle.value?.focus();
                      }
                    },
                  },
                  [
                    h(
                      'button',
                      {
                        ref: mobileToolsToggle,
                        disabled: activeMobileTool.value !== null,
                        class: 'dsk-docs-tools-toggle',
                        type: 'button',
                        'aria-label': text(
                          'Editing tools',
                          'Инструменты редактирования',
                        ),
                        'aria-expanded': mobileToolsOpen.value,
                        'aria-controls': 'dsk-docs-mobile-tool-list',
                        onClick: () => {
                          mobileToolsOpen.value = !mobileToolsOpen.value;
                        },
                      },
                      [
                        h(
                          'svg',
                          { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
                          [h('path', { d: 'm6 9 6 6 6-6' })],
                        ),
                      ],
                    ),
                    h(
                      'div',
                      {
                        id: 'dsk-docs-mobile-tool-list',
                        class: 'dsk-docs-mobile-tool-list',
                        inert: !mobileToolsOpen.value,
                        'aria-hidden': !mobileToolsOpen.value,
                      },
                      [
                        {
                          label: text('Position & size', 'Позиция и размер'),
                          path: 'M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 12h8m-4-4v8',
                        },
                        {
                          label: text('Rotation', 'Поворот'),
                          path: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
                        },
                        {
                          label: text('Color & opacity', 'Цвет и прозрачность'),
                          path: 'M12 3s-7 7-7 12a7 7 0 0 0 14 0c0-5-7-12-7-12ZM8 15a4 4 0 0 0 4 4',
                        },
                      ].map((item, index) =>
                        h(
                          'button',
                          {
                            type: 'button',
                            disabled: activeMobileTool.value !== null,
                            onClick: (event: MouseEvent) => {
                              lastMobileTool =
                                event.currentTarget as HTMLButtonElement;
                              activeMobileTool.value = index;
                              void nextTick(() =>
                                mobileWidget.value?.focus({
                                  preventScroll: true,
                                }),
                              );
                            },
                            class: 'dsk-docs-mobile-tool-row',
                            style: { '--dsk-tool-index': index },
                          },
                          [
                            h('span', item.label),
                            h(
                              'span',
                              {
                                class: 'dsk-docs-mobile-tool-icon',
                                'aria-hidden': 'true',
                              },
                              [
                                h(
                                  'svg',
                                  {
                                    viewBox: '0 0 24 24',
                                    'aria-hidden': 'true',
                                  },
                                  [h('path', { d: item.path })],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                activeMobileTool.value !== null
                  ? h(
                      'section',
                      {
                        ref: mobileWidget,
                        class: 'dsk-docs-mobile-widget',
                        slot: 'overlay',
                        tabindex: -1,
                        role: 'region',
                        'aria-label': [
                          text('Position & size', 'Позиция и размер'),
                          text('Rotation', 'Поворот'),
                          text('Color & opacity', 'Цвет и прозрачность'),
                        ][activeMobileTool.value],
                        onKeydown: (event: KeyboardEvent) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            closeMobileWidget();
                          }
                        },
                      },
                      [editingPanels()[activeMobileTool.value]],
                    )
                  : null,
                h('div', { class: 'dsk-docs-hero-copy', slot: 'overlay' }, [
                  h(
                    'p',
                    { class: 'dsk-docs-kicker' },
                    text(
                      'OPEN SOURCE / BUILT FOR BUILDERS',
                      'OPEN SOURCE / ДЛЯ СОЗДАТЕЛЕЙ ИНСТРУМЕНТОВ',
                    ),
                  ),
                  h('h1', [
                    h('span', text('Your ideas.', 'Ваши идеи.')),
                    h('span', text('Your tools.', 'Ваши инструменты.')),
                    h('span', text('Your DSK', 'Ваш DSK')),
                  ]),
                  h(
                    'p',
                    {
                      class: 'dsk-docs-hero-description',
                      'aria-label': text(
                        'The small, precise components behind your next big creative tool. HTML, CSS and your imagination.',
                        'Точные и гибкие компоненты для вашего следующего редактора. HTML, CSS и ваше воображение.',
                      ),
                    },
                    Array.from(
                      text(
                        'The small, precise components behind your next big creative tool. HTML, CSS and your imagination.',
                        'Точные и гибкие компоненты для вашего следующего редактора. HTML, CSS и ваше воображение.',
                      ),
                    ).map((character, index) =>
                      h(
                        'span',
                        {
                          class: 'dsk-docs-typed-character',
                          'aria-hidden': 'true',
                          style: characterStyle(index),
                        },
                        character,
                      ),
                    ),
                  ),
                  h('div', { class: 'dsk-docs-hero-actions' }, [
                    h(
                      'a',
                      {
                        class: 'dsk-docs-primary',
                        href: withBase(`${base}/guide/installation`),
                      },
                      [
                        h(
                          'svg',
                          { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
                          [
                            h('path', {
                              d: 'M13.5 2 4 14h7l-.5 8L20 10h-7z',
                              fill: 'currentColor',
                            }),
                          ],
                        ),
                        h('span', text('Quick start', 'Быстрый старт')),
                      ],
                    ),
                    supportButton(),
                  ]),
                ]),
                h(
                  'div',
                  {
                    class: 'dsk-docs-object',
                    style: { left: `${x.value}px`, top: `${y.value}px` },
                  },
                  [
                    h(
                      'div',
                      {
                        class: 'dsk-docs-shape',
                        style: {
                          '--dsk-docs-shape-color': color.value,
                          background: color.value,
                          width: `${width.value}px`,
                          height: `${height.value}px`,
                          opacity: opacity.value / 100,
                          transform: `rotate(${angle.value}deg)`,
                        },
                      },
                      [h('span', 'dsk')],
                    ),
                  ],
                ),
                h('dsk-canvas-marker', {
                  slot: 'overlay',
                  class: 'dsk-docs-annotation',
                  x: '0',
                  y: '0',
                  label: text(
                    'LIVE HTML · Pan, zoom, create',
                    'ЖИВОЙ HTML · Двигайте и масштабируйте',
                  ),
                  title: text(
                    'LIVE HTML · Pan, zoom, create',
                    'ЖИВОЙ HTML · Двигайте и масштабируйте',
                  ),
                  'follow-pan': 'false',
                  'follow-zoom': 'false',
                }),
                h(
                  'div',
                  { class: 'dsk-docs-viewport-tools', slot: 'overlay' },
                  [
                    h(
                      'button',
                      {
                        type: 'button',
                        'aria-label': text('Zoom out', 'Уменьшить'),
                        onClick: () => viewport.value?.zoomBy(1 / 1.2),
                      },
                      '−',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        'aria-label': text('Reset view', 'Сбросить вид'),
                        onClick: () => viewport.value?.reset(),
                      },
                      `${Math.round(zoom.value * 100)}%`,
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        'aria-label': text('Zoom in', 'Увеличить'),
                        onClick: () => viewport.value?.zoomBy(1.2),
                      },
                      '+',
                    ),
                  ],
                ),
              ],
            ),
          ]),
          h(
            'section',
            { class: 'dsk-docs-build-ideas', 'aria-label': 'Build with DSK' },
            [
              h(
                'p',
                { class: 'dsk-docs-kicker' },
                'SMALL COMPONENTS. BIG POSSIBILITIES.',
              ),
              h('h2', 'What will you build?'),
              h(
                'p',
                { class: 'dsk-docs-build-description' },
                'Bring your canvas. We bring the controls.',
              ),
              ...[
                {
                  kind: 'layout',
                  number: '01',
                  title: 'Your next design editor',
                  description:
                    'Precise dimensions, linked values, and a canvas that feels right.',
                  tag: 'Position · Size · Canvas',
                  href: withBase(`${base}/components/canvas`),
                },
                {
                  kind: 'motion',
                  number: '02',
                  title: 'Make motion feel natural',
                  description:
                    'Shape an easing curve. Dial in an angle. Give every detail its own rhythm.',
                  tag: 'Angle · Curve · Input',
                  href: withBase(`${base}/components/geometry`),
                },
                {
                  kind: 'palette',
                  number: '03',
                  title: 'A playground for color',
                  description:
                    'Explore hues, tune transparency, and pick the perfect pixel.',
                  tag: 'Color · Alpha · Eyedropper',
                  href: withBase(`${base}/components/color`),
                },
              ].map((idea) =>
                h(
                  'a',
                  {
                    class: `dsk-docs-idea dsk-docs-idea-${idea.kind}`,
                    href: withBase(idea.href),
                  },
                  [
                    h(
                      'div',
                      { class: 'dsk-docs-idea-art', 'aria-hidden': 'true' },
                      idea.kind === 'layout'
                        ? [
                            h('div', { class: 'dsk-docs-idea-selection' }, [
                              h('span', 'Aa'),
                              h('i'),
                              h('i'),
                              h('i'),
                              h('i'),
                            ]),
                            h(
                              'span',
                              { class: 'dsk-docs-idea-coordinate' },
                              'W 160   H 160',
                            ),
                          ]
                        : idea.kind === 'motion'
                          ? [
                              h(
                                'svg',
                                { viewBox: '0 0 300 140', fill: 'none' },
                                [
                                  h('path', {
                                    d: 'M30 115 95 115M205 25H270',
                                    stroke: '#8b6589',
                                    'stroke-width': 1,
                                  }),
                                  h('path', {
                                    d: 'M30 115C150 115 150 25 270 25',
                                    stroke: '#ff0073',
                                    'stroke-width': 4,
                                  }),
                                  h('circle', {
                                    cx: 30,
                                    cy: 115,
                                    r: 6,
                                    fill: '#fff',
                                  }),
                                  h('circle', {
                                    cx: 270,
                                    cy: 25,
                                    r: 6,
                                    fill: '#fff',
                                  }),
                                  h('circle', {
                                    class: 'dsk-docs-idea-orbit',
                                    cx: 150,
                                    cy: 70,
                                    r: 9,
                                    fill: '#ffb4dd',
                                  }),
                                ],
                              ),
                            ]
                          : [
                              h(
                                'div',
                                { class: 'dsk-docs-idea-swatches' },
                                [
                                  '#ff0073',
                                  '#b15bff',
                                  '#6565ff',
                                  '#ffa6da',
                                  '#ffe1ee',
                                ].map((color) =>
                                  h('i', { style: { background: color } }),
                                ),
                              ),
                            ],
                    ),
                    h('div', { class: 'dsk-docs-idea-copy' }, [
                      h(
                        'span',
                        { class: 'dsk-docs-idea-number' },
                        `${idea.number} / ${idea.tag}`,
                      ),
                      h('h3', idea.title),
                      h('p', idea.description),
                      h(
                        'span',
                        { class: 'dsk-docs-idea-link' },
                        'Explore the building blocks ↗',
                      ),
                    ]),
                  ],
                ),
              ),
            ],
          ),
          h(InstallCard),
          h('div', { class: 'dsk-docs-controls-wrap' }, [
            h('div', { class: 'dsk-docs-editor-body' }, [...editingPanels()]),
          ]),
          h('div', { class: 'dsk-docs-license-strip' }, [
            h('a', { href: withBase(`${base}/license`) }, [
              h('strong', 'MIT'),
              h('span', text('Open-source license ↗', 'Открытая лицензия ↗')),
            ]),
            h(
              'a',
              {
                class: 'dsk-docs-github',
                href: 'https://github.com/Flowscape-UI/dsk',
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              [
                h('strong', 'GitHub'),
                h('span', text('Source code ↗', 'Исходный код ↗')),
              ],
            ),
            h('div', [
              h('strong', 'HTML / CSS / TS'),
              h(
                'span',
                text('No runtime framework', 'Без зависимости от фреймворка'),
              ),
            ]),
            h('div', { class: 'dsk-docs-license-support' }, [
              h(
                'p',
                text(
                  'DSK is an MIT-licensed, open-source UI kit for creative tools. Support Flowscape Team and help us build and maintain the components behind your next editor.',
                  'DSK — открытый UI kit для творческих инструментов под лицензией MIT. Поддержите Flowscape Team, чтобы помочь нам развивать компоненты для вашего следующего редактора.',
                ),
              ),
              h('div', { class: 'dsk-docs-hero-actions' }, [supportButton()]),
            ]),
          ]),
        ],
      );
    };
  },
});
