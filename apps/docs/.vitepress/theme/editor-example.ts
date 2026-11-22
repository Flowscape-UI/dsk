import { defineComponent, h, onMounted, onBeforeUnmount, ref } from 'vue';
import { useData } from 'vitepress';
import type {
  DskTimeline,
  TimelineEasing,
  DockDetail,
} from '@flowscape-ui/dsk';
import { ExamplePanel } from './example-panel.ts';
import './editor-example.css';

export const EditorExample = defineComponent({
  props: {
    kind: { type: String, default: 'transform' },
    variant: { type: String, default: 'basic' },
    styled: Boolean,
  },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const host = ref<HTMLElement>();
    const status = ref('');
    let active = true;
    let dispose: (() => void) | undefined;
    const listeners = new AbortController();
    onBeforeUnmount(() => {
      active = false;
      listeners.abort();
      dispose?.();
    });
    onMounted(async () => {
      await import('@flowscape-ui/dsk');
      if (!active || !host.value) return;
      const root = host.value;
      const on = (el: EventTarget, name: string, fn: (event: Event) => void) =>
        el.addEventListener(name, fn, { signal: listeners.signal });
      if (props.kind === 'transform') {
        const header = props.variant !== 'basic';
        const handles = props.variant === 'handles';
        root.innerHTML = `<div class="dsk-editor-transform-stage"><dsk-transform-box width="200" height="130" x="12" y="30" aria-label="${t('Transform object', 'Трансформировать объект')}">
          ${header ? `<dsk-transform-header>${t('Drag this header', 'Тяните заголовок')}</dsk-transform-header><dsk-transform-content><label>${t('Name', 'Название')} <input value="DSK" /></label></dsk-transform-content>` : `<strong>DSK</strong><p>${t('Drag the free surface. Text remains selectable.', 'Тяните свободную область. Текст можно выделить.')}</p>`}
          ${handles ? `<dsk-transform-box-handle-rotate aria-label="${t('Rotate object', 'Повернуть объект')}"></dsk-transform-box-handle-rotate><dsk-transform-box-handle-resize direction="br" aria-label="${t('Resize bottom right', 'Изменить размер справа снизу')}"></dsk-transform-box-handle-resize>` : ''}
        </dsk-transform-box></div>`;
        const box = root.querySelector('dsk-transform-box')!;
        on(box, 'input', (event) => {
          if (event.target === box) status.value = JSON.stringify(box.value);
        });
      } else if (props.kind === 'timeline') {
        const { connectTimeline } =
          await import('../../snippets/connect-timeline');
        if (!active) return;
        root.innerHTML = `<div class="dsk-editor-motion-stage"><div class="dsk-editor-motion-object">DSK</div></div><dsk-timeline duration="4" aria-label="${t('Animation timeline', 'Временная шкала анимации')}"></dsk-timeline>`;
        const timeline = root.querySelector<DskTimeline>('dsk-timeline')!;
        dispose = connectTimeline(
          timeline,
          root.querySelector<HTMLElement>('.dsk-editor-motion-object')!,
        );
        const localized = timeline.tracks;
        localized.forEach(
          (track, i) =>
            (track.label = [
              t('Position X', 'Позиция X'),
              t('Rotation', 'Вращение'),
              t('Opacity', 'Прозрачность'),
            ][i]!),
        );
        if (localized[1]?.clips[0])
          localized[1].clips[0].label = t('Turn', 'Поворот');
        timeline.tracks = localized;
        if (props.variant === 'advanced') {
          const controls = document.createElement('div');
          controls.className = 'dsk-editor-controls';
          controls.innerHTML = `<label><input type="checkbox" data-lock /> ${t('Lock selected track', 'Заблокировать выбранную дорожку')}</label><label><input type="checkbox" data-mute /> ${t('Mute selected track', 'Отключить выбранную дорожку')}</label><label><input type="checkbox" data-loop /> ${t('Loop', 'Цикл')}</label><button type="button" data-add>${t('Add key at cursor', 'Добавить ключ у курсора')}</button><button type="button" data-delete>${t('Delete selection', 'Удалить выделенное')}</button><label>${t('Key value', 'Значение ключа')} <input data-value type="number" value="45" /></label><label>${t('Interpolation', 'Интерполяция')} <select data-easing><option value="linear">Linear</option><option value="ease">Ease</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option><option value="ease-in-out">Ease in out</option><option value="step">Step</option><option value="custom">${t('Custom Bezier', 'Своя кривая Bezier')}</option></select></label><div class="dsk-editor-bezier" hidden>${['X1', 'Y1', 'X2', 'Y2'].map((label) => `<label>${label} <input data-coordinate type="number" min="0" max="1" step="0.05" /></label>`).join('')}</div>`;
          root.prepend(controls);
          const easingSelect =
            controls.querySelector<HTMLSelectElement>('[data-easing]')!;
          const coordinates = Array.from(
            controls.querySelectorAll<HTMLInputElement>('[data-coordinate]'),
          );
          const bezier =
            controls.querySelector<HTMLElement>('.dsk-editor-bezier')!;
          const sync = () => {
            const s = timeline.selection,
              track = timeline.tracks.find((tr) => tr.id === s?.trackId);
            controls.querySelector<HTMLInputElement>('[data-lock]')!.checked =
              !!track?.locked;
            controls.querySelector<HTMLInputElement>('[data-mute]')!.checked =
              !!track?.muted;
            const frame = (
              s?.clipId
                ? track?.clips.find((c) => c.id === s.clipId)?.keyframes
                : track?.keyframes
            )?.find((f) => f.id === s?.keyframeId);
            easingSelect.disabled = !frame || !!track?.locked;
            const easing = frame?.easing ?? 'linear';
            easingSelect.value = typeof easing === 'string' ? easing : 'custom';
            bezier.hidden = typeof easing === 'string';
            coordinates.forEach((input, index) => {
              input.disabled = easingSelect.disabled;
              input.value = String(
                typeof easing === 'string' ? 0 : easing[index],
              );
            });
            status.value = s
              ? `${track?.label}: ${s.keyframeId ?? s.clipId ?? t('track', 'дорожка')}`
              : t(
                  'Select a track, clip, or key.',
                  'Выберите дорожку, клип или ключ.',
                );
          };
          for (const [selector, flag] of [
            ['[data-lock]', 'locked'],
            ['[data-mute]', 'muted'],
          ] as const)
            on(controls.querySelector(selector)!, 'change', (event) => {
              if (timeline.selection)
                timeline.setTrackState(timeline.selection.trackId, {
                  [flag]: (event.target as HTMLInputElement).checked,
                });
            });
          on(
            controls.querySelector('[data-loop]')!,
            'change',
            (event) =>
              (timeline.loop = (event.target as HTMLInputElement).checked),
          );
          let serial = 0;
          on(controls.querySelector('[data-add]')!, 'click', () => {
            const s = timeline.selection;
            if (!s) return;
            const clip = timeline.tracks
              .find((tr) => tr.id === s.trackId)
              ?.clips.find((c) => c.id === s.clipId);
            timeline.addKeyframe(s.trackId, s.clipId, {
              id: `added-${++serial}`,
              time: Math.max(
                0,
                Math.min(
                  clip?.duration ?? timeline.duration,
                  timeline.currentTime - (clip?.start ?? 0),
                ),
              ),
              value: Number(
                controls.querySelector<HTMLInputElement>('[data-value]')!.value,
              ),
            });
          });
          on(controls.querySelector('[data-delete]')!, 'click', () =>
            timeline.deleteSelection(),
          );
          const setEasing = (easing: TimelineEasing) => {
            const selection = timeline.selection;
            if (selection?.keyframeId)
              timeline.updateKeyframe(
                selection.trackId,
                selection.clipId,
                selection.keyframeId,
                { easing },
              );
          };
          on(easingSelect, 'change', () =>
            setEasing(
              easingSelect.value === 'custom'
                ? [0.25, 0.1, 0.25, 1]
                : (easingSelect.value as TimelineEasing),
            ),
          );
          for (const input of coordinates)
            on(input, 'change', () => {
              const values = coordinates.map((field) => field.valueAsNumber);
              if (
                values.every(
                  (value) => Number.isFinite(value) && value >= 0 && value <= 1,
                )
              )
                setEasing([values[0]!, values[1]!, values[2]!, values[3]!]);
              else sync();
            });
          on(timeline, 'selectionchange', sync);
          on(timeline, 'change', sync);
          sync();
        }
      } else if (props.kind === 'dock') {
        root.innerHTML = `<dsk-dock class="dsk-editor-dock ${props.variant === 'overlay' ? 'dsk-editor-dock-overlay' : ''}">
          <dsk-dock-zone aria-label="${t('Left', 'Слева')}"><span class="dsk-editor-zone-label">${t('Left', 'Слева')}</span><dsk-dock-item aria-label="${t('Inspector', 'Инспектор')}"><button type="button" data-dsk-dock-handle>${t('Move inspector', 'Перенести инспектор')}</button><label>${t('Name', 'Название')} <input value="DSK" /></label></dsk-dock-item></dsk-dock-zone>
          <dsk-dock-zone aria-label="${t('Right', 'Справа')}"><span class="dsk-editor-zone-label">${t('Right', 'Справа')}</span></dsk-dock-zone>
          <dsk-dock-zone aria-label="${t('Bottom', 'Снизу')}"><span class="dsk-editor-zone-label">${t('Bottom', 'Снизу')}</span></dsk-dock-zone></dsk-dock>`;
        const dock = root.querySelector('dsk-dock')!;
        on(dock, 'change', (event) => {
          if (event.target === dock)
            status.value =
              (event as CustomEvent<DockDetail>).detail.to?.getAttribute(
                'aria-label',
              ) ?? '';
        });
      }
    });
    return () =>
      h(
        ExamplePanel,
        { title: t('Interactive example', 'Интерактивный пример') },
        {
          default: () => [
            h('div', {
              ref: host,
              class: [
                'dsk-editor-example',
                { 'dsk-editor-example-styled': props.styled },
              ],
              'data-kind': props.kind,
            }),
            h(
              'output',
              { class: 'dsk-editor-output', 'aria-live': 'polite' },
              status.value,
            ),
          ],
        },
      );
  },
});
