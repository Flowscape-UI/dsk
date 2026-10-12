import '@flowscape-ui/dsk';
import type { CanvasCamera, DskInput } from '@flowscape-ui/dsk';
import './example-shell.css';

export type TransformField = 'x' | 'y' | 'rotation';
export type ExampleAction = 'select' | 'fit' | 'reset';
export interface ExampleSelection {
  x: number;
  y: number;
  rotation: number;
  name: string;
}

/** The native DSK inspector and overlay stay separate from the rendering engine. */
export function createExampleShell(root: HTMLElement, ru = false) {
  const t = (en: string, russian: string) => (ru ? russian : en);
  const listeners = new AbortController();
  root.classList.add('dsk-engine-example');
  root.innerHTML = `
    <div class="dsk-engine-toolbar">
      <button type="button" data-action="select">${t('Select rectangle', 'Выбрать прямоугольник')}</button>
      <button type="button" data-action="fit">${t('Fit', 'Уместить')}</button>
      <button type="button" data-action="reset">${t('Reset', 'Сбросить')}</button>
    </div>
    <div class="dsk-engine-inspector">
      <label>X <dsk-input data-field="x" step="1" disabled aria-label="X"></dsk-input></label>
      <label>Y <dsk-input data-field="y" step="1" disabled aria-label="Y"></dsk-input></label>
      <label>${t('Rotation', 'Поворот')} <dsk-input data-field="rotation" step="1" tag="°" disabled aria-label="${t('Rotation', 'Поворот')}"></dsk-input></label>
    </div>
    <output class="dsk-engine-selection" aria-live="polite"></output>
    <div class="dsk-engine-layout">
      <span class="dsk-engine-corner"></span>
      <dsk-ruler class="dsk-engine-x" snap="10" aria-label="X ruler"></dsk-ruler>
      <dsk-ruler class="dsk-engine-y" snap="10" orientation="vertical" aria-label="Y ruler"></dsk-ruler>
      <div class="dsk-engine-viewport">
        <div class="dsk-engine-surface"></div>
        <div class="dsk-engine-overlay"><dsk-canvas-marker label="${t('Comment: check spacing', 'Комментарий: проверить отступ')}" hidden></dsk-canvas-marker></div>
      </div>
    </div>`;
  const surface = root.querySelector<HTMLElement>('.dsk-engine-surface')!;
  const viewport = root.querySelector<HTMLElement>('.dsk-engine-viewport')!;
  const rulers = Array.from(root.querySelectorAll('dsk-ruler'));
  const marker = root.querySelector('dsk-canvas-marker')!;
  const status = root.querySelector<HTMLOutputElement>('output')!;
  const inputs: Record<TransformField, DskInput> = {
    x: root.querySelector('dsk-input[data-field="x"]')!,
    y: root.querySelector('dsk-input[data-field="y"]')!,
    rotation: root.querySelector('dsk-input[data-field="rotation"]')!,
  };
  for (const ruler of rulers) ruler.target = viewport;
  let current: ExampleSelection | null = null;
  let editing: TransformField | undefined;
  let transform: ((field: TransformField, value: number) => void) | undefined;
  let action: ((value: ExampleAction) => void) | undefined;
  const sync = () => {
    status.textContent =
      current?.name ?? t('Select one object.', 'Выберите один объект.');
    for (const key of ['x', 'y', 'rotation'] as const) {
      inputs[key].disabled = !current;
      if (current && editing !== key)
        inputs[key].value = Math.round(current[key] * 100) / 100;
    }
  };
  for (const key of ['x', 'y', 'rotation'] as const) {
    const input = inputs[key];
    input.addEventListener(
      'input',
      () => {
        if (!current || !Number.isFinite(input.valueAsNumber)) return;
        editing = key;
        transform?.(key, input.valueAsNumber);
      },
      { signal: listeners.signal },
    );
    const finish = () => {
      editing = undefined;
      sync();
    };
    input.addEventListener('change', finish, { signal: listeners.signal });
    input.addEventListener('focusout', finish, { signal: listeners.signal });
  }
  for (const name of ['select', 'fit', 'reset'] as const) {
    root
      .querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!
      .addEventListener('click', () => action?.(name), {
        signal: listeners.signal,
      });
  }
  sync();
  return {
    surface,
    viewport,
    inputs,
    setSelection(value: ExampleSelection | null) {
      if (current?.name !== value?.name) editing = undefined;
      current = value;
      sync();
    },
    setCamera(camera: CanvasCamera) {
      for (const ruler of rulers) ruler.camera = camera;
      marker.camera = camera;
    },
    setMarker(x: number, y: number, visible = true) {
      marker.x = x;
      marker.y = y;
      marker.hidden = !visible;
    },
    onTransform(callback: (field: TransformField, value: number) => void) {
      transform = callback;
    },
    onAction(callback: (value: ExampleAction) => void) {
      action = callback;
    },
    destroy() {
      listeners.abort();
      for (const ruler of rulers) ruler.target = null;
      root.replaceChildren();
      delete root.dataset.ready;
    },
  };
}
