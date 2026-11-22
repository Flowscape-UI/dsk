import { defineComponent, h, ref } from 'vue';
import { useData } from 'vitepress';
import type { PanelDragEnd, PanelResizeDetail } from '@flowscape-ui/dsk';
import { ExamplePanel } from './example-panel.ts';
import './panel-example.css';

export const PanelExample = defineComponent({
  props: { styled: Boolean },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const side = ref<PanelDragEnd>('right');
    const size = ref('240 × 180 px');
    const minimum = ref(140),
      maximum = ref(320),
      offset = ref(0),
      inset = ref(0);
    return () =>
      h(
        ExamplePanel,
        { title: t('Resizable panel', 'Изменяемая панель') },
        {
          controls: () => [
            ...(
              [
                [t('Minimum size', 'Минимальный размер'), minimum],
                [t('Maximum size', 'Максимальный размер'), maximum],
                ['Offset', offset],
                ['Inset', inset],
              ] as const
            ).map(([label, value]) =>
              h('label', [
                label,
                h('input', {
                  type: 'number',
                  value: value.value,
                  onInput: (event: Event) => {
                    value.value = Number(
                      (event.target as HTMLInputElement).value,
                    );
                  },
                }),
              ]),
            ),
            h('label', [
              t('Resize edge ', 'Край изменения размера '),
              h(
                'select',
                {
                  value: side.value,
                  onChange: (event: Event) => {
                    side.value = (event.target as HTMLSelectElement)
                      .value as PanelDragEnd;
                  },
                },
                ['right', 'left', 'top', 'bottom'].map((value) =>
                  h('option', { value }, value),
                ),
              ),
            ]),
            h(
              'p',
              t(
                'Drag the edge, or focus it and use arrows. Escape cancels a drag; Ctrl/Cmd+Z undoes a resize.',
                'Тяните край или сфокусируйте его и используйте стрелки. Escape отменяет перетаскивание, Ctrl/Cmd+Z отменяет изменение размера.',
              ),
            ),
            h('output', { 'aria-live': 'polite' }, size.value),
          ],
          preview: () =>
            h('div', { class: 'dsk-panel-example-stage' }, [
              h(
                'dsk-panel',
                {
                  class: [
                    'dsk-panel-example',
                    { 'dsk-panel-example-styled': props.styled },
                  ],
                  'drag-end': side.value,
                  'min-size': minimum.value,
                  'max-size': maximum.value,
                  offset: offset.value,
                  inset: inset.value,
                  'handle-label': t(
                    'Resize inspector',
                    'Изменить размер инспектора',
                  ),
                  onInput: (event: Event) => {
                    if (
                      !(event instanceof CustomEvent) ||
                      event.target !== event.currentTarget
                    )
                      return;
                    const detail = (event as CustomEvent<PanelResizeDetail>)
                      .detail;
                    size.value = `${Math.round(detail.width)} × ${Math.round(detail.height)} px`;
                  },
                },
                [
                  h('strong', t('Inspector', 'Инспектор')),
                  h(
                    'p',
                    t(
                      'Ordinary HTML goes inside. Style this panel like a div.',
                      'Внутри обычный HTML. Стилизуйте панель как div.',
                    ),
                  ),
                  h('label', [
                    t('Name ', 'Название '),
                    h('input', {
                      value: 'Rectangle',
                      'aria-label': t('Name', 'Название'),
                    }),
                  ]),
                ],
              ),
            ]),
        },
      );
  },
});
