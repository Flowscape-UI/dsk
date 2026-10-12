import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import { useData } from 'vitepress';
import { ExamplePanel } from './example-panel.ts';
import type { DskColorEyedropper } from '@flowscape-ui/dsk';
import './color-example.css';

type ColorExampleKind = 'area' | 'hue' | 'alpha' | 'eyedropper' | 'combined';

export const ColorExample = defineComponent({
  name: 'ColorExample',
  props: {
    kind: { type: String as PropType<ColorExampleKind>, required: true },
    styled: Boolean,
  },
  setup(props) {
    const { lang } = useData();
    const controls = ref<HTMLElement>();
    const shape = ref<HTMLElement>();
    const readout = ref('#FF0073');
    const status = ref('');
    const mode = ref('canvas');
    const nativeSupported = ref(false);
    const ready = ref(false);
    let unregisterMode: (() => void) | undefined;
    const listeners = new AbortController();
    let active = true;
    let picker: DskColorEyedropper | null = null;
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const modeDescription = () => {
      const descriptions: Record<string, [string, string]> = {
        canvas: [
          'Live canvas pixels. DSK magnifier; choose one of the three samples.',
          'Живые пиксели canvas. Лупа DSK; выберите один из трёх образцов.',
        ],
        page: [
          'Page snapshot. DSK magnifier; you can pick page content, but the captured view is frozen and approximate.',
          'Снимок страницы. Лупа DSK; можно выбрать цвет содержимого страницы, но снимок статичен и приблизителен.',
        ],
        native: nativeSupported.value
          ? [
              'Screen picker provided by your browser. Its system magnifier ignores DSK styles.',
              'Пипетка экрана от браузера. Системная лупа не использует стили DSK.',
            ]
          : [
              'Native screen picking is unavailable in this browser/context. The button is disabled; try canvas or page.',
              'Системная пипетка недоступна в этом браузере или контексте. Кнопка отключена; попробуйте canvas или page.',
            ],
        grayscale: [
          'Custom application mode: reads the same canvas but turns sampled pixels gray. Both the magnifier and selected color change; the source stays colored.',
          'Пользовательский режим: читает тот же canvas, но делает выбранные пиксели серыми. Меняются лупа и итоговый цвет; источник остаётся цветным.',
        ],
        auto: nativeSupported.value
          ? [
              'Automatic selection resolves to native in this browser.',
              'Автоматически выбран native: браузер поддерживает системную пипетку.',
            ]
          : [
              'Automatic selection resolves to page in this browser.',
              'Автоматически выбран page: системная пипетка не поддерживается.',
            ],
      };
      const description = descriptions[mode.value]!;
      return t(description[0], description[1]);
    };
    const changeMode = (event: Event) => {
      if (!(event.target instanceof HTMLSelectElement) || !picker) return;
      mode.value = event.target.value;
      picker.mode = mode.value === 'auto' ? null : mode.value;
      status.value = '';
    };
    onMounted(async () => {
      try {
        await import('@flowscape-ui/dsk');
        const { registerGrayscaleMode } =
          await import('../../snippets/eyedropper-grayscale.ts');
        if (!active || !controls.value) return;
        const root = controls.value;
        const areaMarkup =
          '<dsk-color-area hue="333" saturation="100" brightness="100" width="180" aria-label="Saturation and brightness"></dsk-color-area>';
        const hueMarkup =
          '<dsk-color-hue hue="333" width="180" aria-label="Hue"></dsk-color-hue>';
        const alphaMarkup =
          '<dsk-color-alpha color="#FF0073" alpha="60" width="180" aria-label="Opacity"></dsk-color-alpha>';
        const markup: Record<ColorExampleKind, string> = {
          area: areaMarkup,
          hue: hueMarkup,
          alpha: alphaMarkup,
          eyedropper:
            '<dsk-color-eyedropper mode="canvas" color="#FF0073" aria-label="Pick a sample color"></dsk-color-eyedropper><canvas class="dsk-color-example-samples" width="180" height="96" aria-label="Three sample colors"></canvas>',
          combined: areaMarkup + hueMarkup + alphaMarkup,
        };
        root.innerHTML = markup[props.kind];
        const area = root.querySelector('dsk-color-area');
        const hue = root.querySelector('dsk-color-hue');
        const alpha = root.querySelector('dsk-color-alpha');
        picker = root.querySelector('dsk-color-eyedropper');
        const render = () => {
          if (area && hue && alpha) {
            area.hue = hue.hue;
            alpha.color = area.color;
          }
          readout.value =
            alpha?.rgba ??
            area?.color ??
            hue?.color ??
            picker?.color ??
            '#FF0073';
          if (shape.value) shape.value.style.backgroundColor = readout.value;
        };
        const options = { signal: listeners.signal };
        root.addEventListener('input', render, options);
        root.addEventListener('change', render, options);
        const canvas = root.querySelector('canvas');
        if (picker && canvas) {
          const context = canvas.getContext('2d');
          if (context)
            ['#FF0073', '#7755FF', '#FFC857'].forEach((color, index) => {
              context.fillStyle = color;
              context.fillRect(index * 60, 0, 60, 96);
            });
          picker.source = canvas;
          unregisterMode = registerGrayscaleMode(picker);
          nativeSupported.value = picker.nativeSupported;
          ready.value = true;
          picker.addEventListener(
            'pickstart',
            () => {
              status.value = t(
                'Selection started. Choose a pixel; Esc cancels.',
                'Выбор запущен. Выберите пиксель; Esc отменяет выбор.',
              );
            },
            options,
          );
          picker.addEventListener(
            'cancel',
            () => {
              status.value = t(
                'Canceled. Previous color preserved.',
                'Выбор отменён. Предыдущий цвет сохранён.',
              );
            },
            options,
          );
          picker.addEventListener(
            'change',
            () => {
              status.value = t('Color selected.', 'Цвет выбран.');
            },
            options,
          );
          picker.addEventListener(
            'pickerror',
            () => {
              status.value = t(
                'Could not read the sample. Try again.',
                'Не удалось прочитать образец. Попробуйте снова.',
              );
            },
            options,
          );
        }
        render();
      } catch {
        status.value = t(
          'Could not load the example.',
          'Не удалось загрузить пример.',
        );
      }
    });
    onBeforeUnmount(() => {
      active = false;
      listeners.abort();
      picker?.cancel();
      unregisterMode?.();
    });
    return () =>
      h(
        ExamplePanel,
        {
          class: [
            'dsk-color-example',
            { 'dsk-color-example-custom': props.styled },
          ],
          'data-kind': props.kind,
        },
        {
          controls: () => [
            props.kind === 'eyedropper'
              ? h('label', { class: 'dsk-color-example-mode' }, [
                  h('span', t('Mode', 'Режим')),
                  h(
                    'select',
                    {
                      value: mode.value,
                      disabled: !ready.value,
                      onChange: changeMode,
                      'data-mode': '',
                      'aria-label': t('Eyedropper mode', 'Режим пипетки'),
                    },
                    [
                      h('option', { value: 'canvas' }, 'Canvas'),
                      h('option', { value: 'page' }, 'Page'),
                      h('option', { value: 'native' }, 'Native'),
                      h(
                        'option',
                        { value: 'grayscale' },
                        t('Custom: grayscale', 'Свой: оттенки серого'),
                      ),
                      h('option', { value: 'auto' }, 'Auto'),
                    ],
                  ),
                ])
              : null,
            h('div', { ref: controls, class: 'dsk-color-example-controls' }),
            h(
              'output',
              { class: 'dsk-color-example-value', 'aria-live': 'polite' },
              readout.value,
            ),
            props.kind === 'eyedropper'
              ? h('p', { class: 'dsk-color-example-hint' }, modeDescription())
              : null,
            h(
              'span',
              { role: 'status', class: 'dsk-color-example-status' },
              status.value,
            ),
          ],
          preview: () =>
            h(
              'dsk-pan-zoom',
              {
                'aria-label': t(
                  'Color preview canvas',
                  'Холст с выбранным цветом',
                ),
              },
              [
                h(
                  'div',
                  { ref: shape, class: 'dsk-color-example-object' },
                  'dsk',
                ),
              ],
            ),
        },
      );
  },
});
