import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue';
import { useData } from 'vitepress';
import type {
  CanvasWidgetBinding,
  DskPanZoom,
  DskCanvasMarker,
  RulerGuideDetail,
} from '@flowscape-ui/dsk';
import { connectCanvasWidgets } from '../../snippets/connect-canvas-widgets.ts';
import { ExamplePanel } from './example-panel.ts';
import './canvas-example.css';

export const CanvasExample = defineComponent({
  props: { kind: { type: String, default: 'pan' }, styled: Boolean },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const scene = ref<HTMLElement>();
    const camera = ref('100%');
    const guides = ref('');
    const ready = ref(false);
    const followPan = ref(true);
    const followZoom = ref(true);
    const scale = ref(false);
    let viewport: DskPanZoom | null = null;
    let marker: DskCanvasMarker | null = null;
    let binding: CanvasWidgetBinding | undefined;
    let dispose: (() => void) | undefined;
    const listeners = new AbortController();
    let active = true;
    const sync = () => {
      if (!viewport) return;
      const value = viewport.camera;
      camera.value = `pan (${Math.round(value.panX)}, ${Math.round(value.panY)}) · ${Math.round(value.zoom * 100)}%`;
      if (marker) {
        marker.followPan = followPan.value;
        marker.followZoom = followZoom.value;
        marker.scaleWithZoom = scale.value;
      }
      binding?.update({
        camera: value,
        followPan: followPan.value,
        followZoom: followZoom.value,
        scaleWithZoom: scale.value,
      });
    };
    onMounted(async () => {
      const { bindCanvasWidget } = await import('@flowscape-ui/dsk');
      if (!active || !scene.value) return;
      const ruler = props.kind === 'ruler';
      scene.value.innerHTML = `${ruler ? '<span class="dsk-canvas-corner"></span><dsk-ruler class="dsk-canvas-x" aria-label="X ruler" snap="10" highlights="[[-60,60]]"></dsk-ruler><dsk-ruler class="dsk-canvas-y" orientation="vertical" aria-label="Y ruler" snap="10" highlights="[[-60,60]]"></dsk-ruler>' : ''}
        <dsk-pan-zoom aria-label="${t('Interactive canvas', 'Интерактивный холст')}">
          <div class="dsk-canvas-object">dsk</div>
          ${props.kind === 'marker' ? `<dsk-canvas-marker slot="overlay" x="60" y="60" label="${t('Marker', 'Метка')}"></dsk-canvas-marker><dsk-canvas-marker slot="overlay" x="12" y="12" follow-pan="false" follow-zoom="false" label="${t('Screen UI', 'Экранный UI')}"></dsk-canvas-marker>` : ''}
          ${props.kind === 'html' ? `<button slot="overlay" class="dsk-canvas-note" type="button">${t('HTML button', 'HTML-кнопка')}</button>` : ''}
        </dsk-pan-zoom>`;
      viewport = scene.value.querySelector('dsk-pan-zoom');
      marker = scene.value.querySelector('dsk-canvas-marker');
      dispose = connectCanvasWidgets(scene.value);
      if (props.kind === 'html') {
        const button =
          scene.value.querySelector<HTMLButtonElement>('.dsk-canvas-note')!;
        binding = bindCanvasWidget(button, {
          position: { x: 60, y: 60 },
          camera: viewport!.camera,
        });
        button.addEventListener(
          'click',
          () => {
            guides.value = t(
              'The button keeps its own click handler.',
              'Обработчик клика кнопки работает.',
            );
          },
          { signal: listeners.signal },
        );
      }
      viewport!.addEventListener('viewportchange', sync, {
        signal: listeners.signal,
      });
      for (const eventName of ['guideinput', 'guidechange']) {
        scene.value.addEventListener(
          eventName,
          (event) => {
            const { guides: values } = (event as CustomEvent<RulerGuideDetail>)
              .detail;
            guides.value = `${eventName}: [${values.map((value) => Math.round(value)).join(', ')}]`;
          },
          { signal: listeners.signal },
        );
      }
      sync();
      ready.value = true;
    });
    onBeforeUnmount(() => {
      active = false;
      listeners.abort();
      binding?.dispose();
      dispose?.();
    });
    return () =>
      h(
        ExamplePanel,
        {
          class: [
            'dsk-canvas-example',
            props.styled && 'dsk-canvas-example-styled',
          ],
          'data-kind': props.kind,
        },
        {
          default: () => [
            h('div', { class: 'dsk-canvas-toolbar' }, [
              h(
                'button',
                {
                  disabled: !ready.value,
                  'aria-label': t('Zoom out', 'Уменьшить'),
                  onClick: () => viewport?.zoomBy(0.8),
                },
                '−',
              ),
              h(
                'button',
                {
                  disabled: !ready.value,
                  'aria-label': t('Zoom in', 'Увеличить'),
                  onClick: () => viewport?.zoomBy(1.25),
                },
                '+',
              ),
              h(
                'button',
                { disabled: !ready.value, onClick: () => viewport?.reset() },
                t('Reset', 'Сбросить'),
              ),
              h('output', { class: 'dsk-canvas-camera' }, camera.value),
            ]),
            props.kind === 'marker' || props.kind === 'html'
              ? h(
                  'div',
                  { class: 'dsk-canvas-tracking' },
                  [
                    [followPan, 'followPan'],
                    [followZoom, 'followZoom'],
                    [scale, 'scaleWithZoom'],
                  ].map(([state, name]) => {
                    // Keep the UI controls independent from the widgets' camera source.
                    const flag = state as typeof followPan;
                    return h('label', [
                      h('input', {
                        type: 'checkbox',
                        checked: flag.value,
                        disabled: !ready.value,
                        onChange: (event: Event) => {
                          if (event.target instanceof HTMLInputElement) {
                            flag.value = event.target.checked;
                            sync();
                          }
                        },
                      }),
                      String(name),
                    ]);
                  }),
                )
              : null,
            h('div', {
              ref: scene,
              class: [
                'dsk-canvas-scene',
                props.kind === 'ruler' && 'dsk-canvas-with-rulers',
              ],
            }),
            h(
              'p',
              props.kind === 'ruler'
                ? t(
                    'Drag from either ruler to create a guide. Focus a guide, then press Delete to remove it. Snap: 10 units.',
                    'Потяните от любой линейки для создания направляющей. Выберите линию и нажмите Delete для удаления. Шаг: 10 единиц.',
                  )
                : t(
                    'Drag to pan. Pinch or Ctrl/Meta + wheel to zoom. Use the buttons on touch devices; scroll the page outside this demo.',
                    'Перетаскивайте для pan. Pinch или Ctrl/Meta + колесо меняют zoom. На телефоне также доступны кнопки; прокручивайте страницу за пределами демо.',
                  ),
            ),
            h(
              'output',
              { class: 'dsk-canvas-events', 'aria-live': 'polite' },
              guides.value,
            ),
          ],
        },
      );
  },
});
