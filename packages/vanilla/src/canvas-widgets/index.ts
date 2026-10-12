import { DskPanZoom } from './dsk-pan-zoom.ts';
import { DskCanvasMarker } from './dsk-canvas-marker.ts';
import { DskRuler } from './dsk-ruler.ts';

export { DskPanZoom } from './dsk-pan-zoom.ts';
export { DskCanvasMarker } from './dsk-canvas-marker.ts';
export { DskRuler } from './dsk-ruler.ts';
export type {
  RulerOrientation,
  RulerRange,
  RulerGuideDetail,
} from './helpers/index.ts';
export {
  bindCanvasWidget,
  projectCanvasPoint,
  unprojectCanvasPoint,
  resolveCanvasCamera,
} from './coordinates.ts';
export type {
  CanvasCamera,
  CanvasPoint,
  CanvasTracking,
  CanvasWidgetOptions,
  CanvasWidgetBinding,
} from './coordinates.ts';

if (!customElements.get('dsk-pan-zoom'))
  customElements.define('dsk-pan-zoom', DskPanZoom);
if (!customElements.get('dsk-canvas-marker'))
  customElements.define('dsk-canvas-marker', DskCanvasMarker);
if (!customElements.get('dsk-ruler'))
  customElements.define('dsk-ruler', DskRuler);
