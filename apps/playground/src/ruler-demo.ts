import type {
  DskRuler,
  DskCanvasMarker,
  RulerGuideDetail,
} from '@flowscape-ui/dsk';

const horizontal = document.querySelector<DskRuler>('#ruler-x')!;
const vertical = document.querySelector<DskRuler>('#ruler-y')!;
const zoom = document.querySelector<HTMLInputElement>('#ruler-zoom')!;
const offset = document.querySelector<HTMLInputElement>('#ruler-offset')!;
const flip = document.querySelector<HTMLInputElement>('#ruler-flip')!;
const status = document.querySelector('#ruler-events')!;
function sync(): void {
  const scale = Number(zoom.value),
    pan = -Number(offset.value) * scale;
  const camera = { panX: pan, panY: pan, zoom: scale };
  for (const ruler of [horizontal, vertical]) {
    ruler.camera = camera;
  }
  for (const marker of document.querySelectorAll<DskCanvasMarker>(
    '#ruler-canvas dsk-canvas-marker',
  ))
    marker.camera = camera;
  const marker = document.querySelector<DskCanvasMarker>(
    '#canvas-marker-world',
  )!;
  marker.followPan =
    document.querySelector<HTMLInputElement>('#marker-pan')!.checked;
  marker.followZoom =
    document.querySelector<HTMLInputElement>('#marker-zoom')!.checked;
  marker.scaleWithZoom =
    document.querySelector<HTMLInputElement>('#marker-size')!.checked;
  horizontal.orientation = flip.checked ? 'horizontal-reversed' : 'horizontal';
  vertical.orientation = flip.checked ? 'vertical-reversed' : 'vertical';
  const canvas = document.querySelector<HTMLElement>('#ruler-canvas')!;
  canvas.style.backgroundSize = `${25 * horizontal.zoom}px ${25 * horizontal.zoom}px`;
  canvas.style.backgroundPosition = `${-horizontal.offset * horizontal.zoom}px ${-vertical.offset * vertical.zoom}px`;
  const box = document.querySelector<HTMLElement>('#ruler-object')!;
  Object.assign(box.style, {
    left: `${horizontal.toPixel(25)}px`,
    top: `${vertical.toPixel(25)}px`,
    width: `${100 * horizontal.zoom}px`,
    height: `${50 * vertical.zoom}px`,
  });
}
zoom.addEventListener('input', sync);
offset.addEventListener('input', sync);
flip.addEventListener('change', sync);
for (const selector of ['#marker-pan', '#marker-zoom', '#marker-size'])
  document.querySelector(selector)!.addEventListener('change', sync);
for (const ruler of [horizontal, vertical])
  ruler.addEventListener('guidechange', (event) => {
    const detail = (event as CustomEvent<RulerGuideDetail>).detail;
    status.textContent = `${ruler === horizontal ? 'Y' : 'X'} guides: ${JSON.stringify(detail.guides)}`;
  });
sync();
