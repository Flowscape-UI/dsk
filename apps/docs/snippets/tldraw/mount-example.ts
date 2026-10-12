import { Component, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createShapeId, Tldraw } from 'tldraw';
import '@flowscape-ui/dsk';
import 'tldraw/tldraw.css';
import { bindDsk } from './bind-dsk.ts';
import './style.css';

/** Notify the page loader when React fails after the mounting function returns. */
class TldrawErrorBoundary extends Component<
  { host: HTMLElement; children?: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.host.dataset.error = 'true';
    console.error('The tldraw example could not render', error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export function mountExample(root: HTMLElement, ru = false): () => void {
  delete root.dataset.error;
  const t = (en: string, russian: string) => (ru ? russian : en);
  root.classList.add('dsk-tldraw-example');
  root.dataset.emptySelection = t(
    'Select one unlocked, top-level shape.',
    'Выберите один незаблокированный объект верхнего уровня.',
  );
  root.innerHTML = `
    <div class="dsk-tldraw-toolbar">
      <button type="button" data-action="select">${t('Select rectangle', 'Выбрать прямоугольник')}</button>
      <button type="button" data-action="fit">${t('Fit', 'Уместить')}</button>
      <button type="button" data-action="undo">${t('Undo', 'Отменить')}</button>
      <button type="button" data-action="redo">${t('Redo', 'Повторить')}</button>
    </div>
    <div class="dsk-tldraw-inspector">
      <label>X <dsk-input data-field="x" step="1" disabled aria-label="X"></dsk-input></label>
      <label>Y <dsk-input data-field="y" step="1" disabled aria-label="Y"></dsk-input></label>
      <label>${t('Rotation', 'Поворот')} <dsk-input data-field="rotation" step="1" tag="°" disabled aria-label="${t('Rotation', 'Поворот')}"></dsk-input></label>
    </div>
    <output class="dsk-tldraw-selection" aria-live="polite"></output>
    <div class="dsk-tldraw-layout">
      <span class="dsk-tldraw-corner"></span>
      <dsk-ruler class="dsk-tldraw-x" aria-label="X ruler" snap="10"></dsk-ruler>
      <dsk-ruler class="dsk-tldraw-y" orientation="vertical" aria-label="Y ruler" snap="10"></dsk-ruler>
      <div class="dsk-tldraw-viewport">
        <div class="dsk-tldraw-react"></div>
        <div class="dsk-tldraw-overlay">
          <dsk-canvas-marker label="${t('Comment: check spacing', 'Комментарий: проверить отступ')}" hidden></dsk-canvas-marker>
        </div>
      </div>
    </div>`;
  // React owns only the editor surface. DSK controls remain native DOM elements.
  const reactRoot = createRoot(
    root.querySelector<HTMLElement>('.dsk-tldraw-react')!,
  );
  let dispose: (() => void) | undefined;
  reactRoot.render(
    createElement(
      TldrawErrorBoundary,
      { host: root },
      createElement(Tldraw, {
        hideUi: true,
        autoFocus: false,
        licenseKey: import.meta.env.VITE_TLDRAW_LICENSE_KEY,
        onMount(editor) {
          editor.user.updateUserPreferences({ colorScheme: 'dark' });
          // Keep this stable ID so the comment follows the rectangle, not selection.
          const id = createShapeId('dsk-example');
          editor.createShapes([
            {
              id,
              type: 'geo',
              x: 80,
              y: 80,
              props: {
                geo: 'rectangle',
                w: 180,
                h: 130,
                color: 'violet',
                fill: 'solid',
              },
            },
            {
              id: createShapeId('dsk-second'),
              type: 'geo',
              x: 330,
              y: 180,
              props: {
                geo: 'ellipse',
                w: 100,
                h: 100,
                color: 'orange',
                fill: 'solid',
              },
            },
          ]);
          editor.select(id);
          editor.zoomToFit({ animation: { duration: 0 } });
          // The adapter converts the camera and synchronizes all external controls.
          dispose = bindDsk(editor, root, id);
          root.dataset.ready = 'true';
          return () => {
            dispose?.();
            dispose = undefined;
          };
        },
      }),
    ),
  );
  return () => {
    dispose?.();
    dispose = undefined;
    reactRoot.unmount();
    root.replaceChildren();
    delete root.dataset.ready;
  };
}
