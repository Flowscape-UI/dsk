import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue';
import { useData } from 'vitepress';
import type { DskAngle, DskCurve, AngleUnit } from '@flowscape-ui/dsk';
import {
  animateWithCurve,
  type MotionExample,
} from '../../snippets/curve-motion.ts';
import { ExamplePanel } from './example-panel.ts';
import './geometry-example.css';

export const GeometryExample = defineComponent({
  props: { kind: { type: String, default: 'angle' }, styled: Boolean },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const controls = ref<HTMLElement>();
    const shape = ref<HTMLElement>();
    const reference = ref<HTMLElement>();
    const readout = ref('');
    const scenario = ref<MotionExample>('travel');
    const ready = ref(false);
    let angle: DskAngle | null = null;
    let curve: DskCurve | null = null;
    let animations: Animation[] = [];
    let observer: IntersectionObserver | undefined;
    let active = true;
    const listeners = new AbortController();
    const stop = () => {
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    const play = () => {
      stop();
      if (!curve || !shape.value || !reference.value) return;
      animations = [
        animateWithCurve(curve, shape.value, scenario.value),
        animateWithCurve(curve, reference.value, scenario.value, 'linear'),
      ];
    };
    const update = () => {
      if (angle && shape.value) {
        shape.value.style.transform = `rotate(${angle.degrees}deg)`;
        readout.value = angle.formattedValue;
      }
      if (curve) {
        stop();
        readout.value = curve.cssValue;
      }
    };
    onMounted(async () => {
      await import('@flowscape-ui/dsk');
      if (!active || !controls.value) return;
      controls.value.innerHTML =
        props.kind === 'angle'
          ? '<dsk-angle value="45" size="208" aria-label="Rotation"></dsk-angle>'
          : '<dsk-curve value="ease-in-out" width="370" duration="1600" aria-label="Motion easing"></dsk-curve>';
      angle = controls.value.querySelector('dsk-angle');
      curve = controls.value.querySelector('dsk-curve');
      controls.value.addEventListener('input', update, {
        signal: listeners.signal,
      });
      controls.value.addEventListener(
        'change',
        () => {
          if (curve) play();
        },
        { signal: listeners.signal },
      );
      window.addEventListener('blur', stop, { signal: listeners.signal });
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) stop();
        },
        { signal: listeners.signal },
      );
      update();
      ready.value = true;
      if (curve) {
        let shown = false;
        observer = new IntersectionObserver(
          (entries) => {
            if (!entries[0]?.isIntersecting) stop();
            else if (!shown) {
              shown = true;
              play();
            }
          },
          { threshold: 0.2 },
        );
        observer.observe(controls.value);
      }
    });
    onBeforeUnmount(() => {
      active = false;
      stop();
      observer?.disconnect();
      listeners.abort();
    });
    return () =>
      h(
        ExamplePanel,
        {
          class: [
            'dsk-geometry-example',
            props.styled && 'dsk-geometry-example-styled',
          ],
          'data-kind': props.kind,
        },
        {
          controls: () => [
            h('div', { ref: controls, class: 'dsk-geometry-controls' }),
            props.kind === 'angle'
              ? h('label', [
                  t('Unit ', 'Единицы '),
                  h(
                    'select',
                    {
                      disabled: !ready.value,
                      onChange: (event: Event) => {
                        if (
                          angle &&
                          event.target instanceof HTMLSelectElement
                        ) {
                          angle.unit = event.target.value as AngleUnit;
                          update();
                        }
                      },
                    },
                    ['deg', 'rad', 'pi', 'turn', 'grad'].map((unit) =>
                      h('option', { value: unit }, unit),
                    ),
                  ),
                ])
              : null,
            h('output', { class: 'dsk-geometry-value' }, readout.value),
          ],
          preview: () =>
            props.kind === 'angle'
              ? h(
                  'dsk-pan-zoom',
                  {
                    grid: '',
                    'aria-label': t(
                      'Rotation preview',
                      'Предпросмотр поворота',
                    ),
                  },
                  [
                    h('div', { class: 'dsk-geometry-stage' }, [
                      h(
                        'div',
                        { ref: shape, class: 'dsk-geometry-shape' },
                        'dsk',
                      ),
                    ]),
                  ],
                )
              : h('div', { class: 'dsk-geometry-motion' }, [
                  h('label', [
                    t('Try it as ', 'Применение '),
                    h(
                      'select',
                      {
                        value: scenario.value,
                        onChange: (event: Event) => {
                          if (event.target instanceof HTMLSelectElement) {
                            scenario.value = event.target
                              .value as MotionExample;
                            play();
                          }
                        },
                      },
                      [
                        ['travel', t('Movement', 'Движение')],
                        ['reveal', t('Card entrance', 'Появление карточки')],
                        ['rotate', t('Rotation', 'Поворот')],
                      ].map(([value, label]) => h('option', { value }, label)),
                    ),
                  ]),
                  h('p', t('Your curve', 'Ваша кривая')),
                  h('div', { class: 'dsk-geometry-stage' }, [
                    h(
                      'div',
                      { ref: shape, class: 'dsk-geometry-shape' },
                      'dsk',
                    ),
                  ]),
                  h(
                    'p',
                    t(
                      'Linear reference · same duration',
                      'Линейно · та же длительность',
                    ),
                  ),
                  h('div', { class: 'dsk-geometry-stage' }, [
                    h(
                      'div',
                      {
                        ref: reference,
                        class: 'dsk-geometry-shape dsk-geometry-reference',
                      },
                      'dsk',
                    ),
                  ]),
                  h('div', { class: 'dsk-geometry-actions' }, [
                    h(
                      'button',
                      { disabled: !ready.value, onClick: play },
                      t('Replay', 'Повторить'),
                    ),
                    h('button', { onClick: stop }, t('Reset', 'Сбросить')),
                  ]),
                  h(
                    'p',
                    t(
                      'Edit the curve, then compare how the same action feels. Playback follows each committed edit.',
                      'Измените кривую и сравните характер одного и того же движения. После завершения правки анимация повторится.',
                    ),
                  ),
                ]),
        },
      );
  },
});
