import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { createExampleShell } from '../shared/example-shell.ts';
import { EngineErrorBoundary } from '../shared/engine-error-boundary.ts';
import { bindDsk } from './bind-dsk.ts';
import { createElements, rectangleId } from './scene.ts';
import './style.css';

export function mountExample(root: HTMLElement, ru = false): () => void {
  const shell = createExampleShell(root, ru);
  root.classList.add('dsk-excalidraw-example');
  const reactRoot = createRoot(shell.surface);
  let disposeBinding: (() => void) | undefined;
  let disposed = false;

  const editor = createElement(Excalidraw, {
    theme: 'dark',
    langCode: ru ? 'ru-RU' : 'en',
    autoFocus: false,
    handleKeyboardGlobally: false,
    zenModeEnabled: true,
    initialData: {
      elements: createElements(),
      appState: {
        // Excalidraw applies its dark-mode filter to this scene color.
        viewBackgroundColor: '#ffffff',
        selectedElementIds: { [rectangleId]: true },
      },
      scrollToContent: true,
    },
    UIOptions: {
      canvasActions: {
        changeViewBackgroundColor: false,
        clearCanvas: false,
        export: false,
        loadScene: false,
        saveAsImage: false,
        saveToActiveFile: false,
        toggleTheme: false,
      },
    },
    excalidrawAPI(api: ExcalidrawImperativeAPI) {
      if (disposed) return;
      disposeBinding?.();
      disposeBinding = bindDsk(api, shell, () => {
        if (!disposed) root.dataset.ready = 'true';
      });
    },
  });
  reactRoot.render(createElement(EngineErrorBoundary, { host: root }, editor));

  return () => {
    disposed = true;
    disposeBinding?.();
    reactRoot.unmount();
    shell.destroy();
    root.classList.remove('dsk-excalidraw-example');
    delete root.dataset.ready;
    delete root.dataset.error;
  };
}
