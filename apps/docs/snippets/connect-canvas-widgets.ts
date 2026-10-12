import type { DskPanZoom } from '@flowscape-ui/dsk';

/** Rulers and overlay markers share the viewport's untransformed origin. */
export function connectCanvasWidgets(root: HTMLElement): () => void {
  const viewport = root.querySelector<DskPanZoom>('dsk-pan-zoom');
  if (!viewport) throw new Error('Missing viewport');
  const rulers = root.querySelectorAll('dsk-ruler');
  const markers = root.querySelectorAll('dsk-canvas-marker');
  for (const ruler of rulers) ruler.target = viewport;
  const update = () => {
    const camera = viewport.camera;
    for (const ruler of rulers) ruler.camera = camera;
    for (const marker of markers) marker.camera = camera;
  };
  viewport.addEventListener('viewportchange', update);
  update();
  return () => {
    viewport.removeEventListener('viewportchange', update);
    for (const ruler of rulers) ruler.target = null;
  };
}
