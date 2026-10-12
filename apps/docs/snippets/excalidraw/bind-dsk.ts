import {
  CaptureUpdateAction,
  getCommonBounds,
  newElementWith,
} from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { createExampleShell } from '../shared/example-shell.ts';
import { createElements, rectangleId } from './scene.ts';

type Shell = ReturnType<typeof createExampleShell>;

export function bindDsk(
  api: ExcalidrawImperativeAPI,
  shell: Shell,
  onReady: () => void,
): () => void {
  const selected = () => {
    const state = api.getAppState();
    const elements = api
      .getSceneElements()
      .filter((element) => state.selectedElementIds[element.id]);
    const element = elements.length === 1 ? elements[0] : undefined;
    // This inspector deliberately edits independent primitive shapes.
    return element &&
      !element.locked &&
      !element.frameId &&
      element.groupIds.length === 0 &&
      (element.type === 'rectangle' || element.type === 'ellipse')
      ? element
      : undefined;
  };

  const sync = () => {
    const state = api.getAppState();
    const zoom = state.zoom.value;
    shell.setCamera({
      panX: state.scrollX * zoom,
      panY: state.scrollY * zoom,
      zoom,
    });
    const element = selected();
    shell.setSelection(
      element
        ? {
            x: element.x,
            y: element.y,
            rotation: (element.angle * 180) / Math.PI,
            name: `${element.type} · ${element.id}`,
          }
        : null,
    );
    const rectangle = api
      .getSceneElements()
      .find((item) => item.id === rectangleId);
    if (rectangle) {
      const [, , maxX, maxY] = getCommonBounds([rectangle]);
      shell.setMarker(maxX, maxY);
      if (!state.isLoading) onReady();
    } else {
      shell.setMarker(0, 0, false);
    }
  };

  shell.onTransform((field, value) => {
    const element = selected();
    if (!element) return;
    const changes =
      field === 'rotation'
        ? { angle: ((value * Math.PI) / 180) as ExcalidrawElement['angle'] }
        : { [field]: value };
    // The public helper makes a versioned copy and invalidates cached geometry.
    api.updateScene({
      elements: api
        .getSceneElements()
        .map((item) =>
          item.id === element.id ? newElementWith(item, changes) : item,
        ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  });
  shell.onAction((action) => {
    if (action === 'fit') {
      api.scrollToContent(undefined, {
        fitToViewport: true,
        viewportZoomFactor: 0.7,
        animate: false,
      });
      return;
    }
    api.updateScene({
      ...(action === 'reset' ? { elements: createElements() } : {}),
      appState: { selectedElementIds: { [rectangleId]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    api.setActiveTool({ type: 'selection' });
  });

  const unsubscribe = api.onChange(sync);
  sync();
  return unsubscribe;
}
