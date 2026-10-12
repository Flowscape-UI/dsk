/** Coordinates in viewport CSS pixels and an odd-sized square of source pixels. */
export interface EyeDropperSampleRequest {
  x: number;
  y: number;
  size: number;
  signal: AbortSignal;
}

/** Return null when the requested point is outside the available pixel source. */
export type EyeDropperSampler = (
  request: EyeDropperSampleRequest,
) => ImageData | null | Promise<ImageData | null>;

function cssPixels(value: string): number {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Sample the current canvas bitmap without changing its rendering context.
 * Supports the default object-fit: fill and positive, axis-aligned CSS scaling.
 * The bitmap-to-content ratio accounts for high-density backing stores; callers
 * must not multiply viewport coordinates by devicePixelRatio themselves.
 *
 * Transparent pixels and the portion of a patch beyond the bitmap use a white
 * matte. CSS filters, DOM overlays, rotation and skew are not part of the bitmap.
 * Tainted canvases throw SecurityError. WebGL/WebGPU renderers should provide
 * their own sampler when their drawing buffer is unavailable between frames.
 */
export function createCanvasSampler(
  canvas: HTMLCanvasElement,
): EyeDropperSampler {
  let patch: HTMLCanvasElement | undefined;
  let context: CanvasRenderingContext2D | null | undefined;

  return ({ x, y, size, signal }) => {
    const view = canvas.ownerDocument.defaultView;
    if (
      signal.aborted ||
      !canvas.isConnected ||
      !view ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      canvas.width === 0 ||
      canvas.height === 0
    )
      return null;
    if (!Number.isInteger(size) || size < 1 || size % 2 !== 1)
      throw new RangeError(
        'The sampled pixel square must have a positive odd size.',
      );

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const style = view.getComputedStyle(canvas);
    if (style.visibility === 'hidden' || style.visibility === 'collapse')
      return null;
    const insetLeft =
      cssPixels(style.borderLeftWidth) + cssPixels(style.paddingLeft);
    const insetRight =
      cssPixels(style.borderRightWidth) + cssPixels(style.paddingRight);
    const insetTop =
      cssPixels(style.borderTopWidth) + cssPixels(style.paddingTop);
    const insetBottom =
      cssPixels(style.borderBottomWidth) + cssPixels(style.paddingBottom);
    const borderBoxWidth =
      cssPixels(style.width) +
      (style.boxSizing === 'border-box' ? 0 : insetLeft + insetRight);
    const borderBoxHeight =
      cssPixels(style.height) +
      (style.boxSizing === 'border-box' ? 0 : insetTop + insetBottom);
    if (borderBoxWidth <= 0 || borderBoxHeight <= 0) return null;
    const scaleX = bounds.width / borderBoxWidth;
    const scaleY = bounds.height / borderBoxHeight;
    const left = bounds.left + insetLeft * scaleX;
    const top = bounds.top + insetTop * scaleY;
    const width = (borderBoxWidth - insetLeft - insetRight) * scaleX;
    const height = (borderBoxHeight - insetTop - insetBottom) * scaleY;
    if (
      width <= 0 ||
      height <= 0 ||
      x < left ||
      y < top ||
      x >= left + width ||
      y >= top + height
    )
      return null;

    const centerX = Math.floor(((x - left) / width) * canvas.width);
    const centerY = Math.floor(((y - top) / height) * canvas.height);
    const half = (size - 1) / 2;
    const requestedLeft = centerX - half;
    const requestedTop = centerY - half;
    const sourceLeft = Math.max(0, requestedLeft);
    const sourceTop = Math.max(0, requestedTop);
    const sourceWidth =
      Math.min(canvas.width, requestedLeft + size) - sourceLeft;
    const sourceHeight =
      Math.min(canvas.height, requestedTop + size) - sourceTop;

    patch ??= canvas.ownerDocument.createElement('canvas');
    if (patch.width !== size) patch.width = size;
    if (patch.height !== size) patch.height = size;
    context ??= patch.getContext('2d', { willReadFrequently: true });
    if (!context)
      throw new DOMException(
        'Canvas pixel sampling is unavailable.',
        'NotSupportedError',
      );
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(
      canvas,
      sourceLeft,
      sourceTop,
      sourceWidth,
      sourceHeight,
      sourceLeft - requestedLeft,
      sourceTop - requestedTop,
      sourceWidth,
      sourceHeight,
    );
    try {
      return context.getImageData(0, 0, size, size);
    } catch (error: unknown) {
      // Reset origin cleanliness so a later clean source can be sampled again.
      patch.width = size;
      throw error;
    }
  };
}
