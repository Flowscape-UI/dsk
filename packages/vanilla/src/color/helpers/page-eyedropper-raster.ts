/** Decode the SVG before painting, including Firefox's additional frame wait. */
function loadPageImage(
  image: HTMLImageElement,
  source: string,
  view: Window,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let frame: number | undefined;
    const cleanup = (): void => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      if (frame !== undefined) view.cancelAnimationFrame(frame);
    };
    const finish = (error?: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error !== undefined) reject(error);
      else resolve();
    };
    const aborted = (): void =>
      finish(
        signal.reason ??
          new DOMException('Page capture canceled.', 'AbortError'),
      );
    const failed = (): void =>
      finish(
        new DOMException('Cannot decode the page image.', 'EncodingError'),
      );
    const loaded = (): void => {
      // Some engines reject decode() for a detached SVG despite a successful
      // load. The extra frame remains necessary before Firefox pixel readback.
      void image
        .decode()
        .catch(() => {})
        .then(() => {
          if (settled) return;
          frame = view.requestAnimationFrame(() => finish());
        });
    };
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
    else image.src = source;
  });
}

/**
 * Paint into an opaque surface from the start so Chromium can retain LCD text
 * antialiasing. Filling a transparent canvas after painting cannot restore it.
 */
export async function rasterizePageSvg(
  document: Document,
  source: string,
  width: number,
  height: number,
  pixelRatio: number,
  signal: AbortSignal,
): Promise<HTMLCanvasElement> {
  signal.throwIfAborted();
  const view = document.defaultView;
  if (!view)
    throw new DOMException(
      'The page has no active window.',
      'InvalidStateError',
    );
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new RangeError(
      'The page image must have positive finite dimensions.',
    );

  // Retain the renderer's conservative dimension and area limits.
  const maximumDimension = 16384;
  const requestedScale =
    Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.min(
    requestedScale,
    maximumDimension / width,
    maximumDimension / height,
    Math.sqrt((maximumDimension * maximumDimension) / (width * height)),
  );
  const image = document.createElement('img');
  let canvas: HTMLCanvasElement | undefined;
  try {
    await loadPageImage(image, source, view, signal);
    signal.throwIfAborted();
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const pixels = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    });
    if (!pixels)
      throw new DOMException(
        'Cannot draw the page image.',
        'NotSupportedError',
      );
    pixels.fillStyle = '#ffffff';
    pixels.fillRect(0, 0, canvas.width, canvas.height);
    pixels.imageSmoothingEnabled = false;
    pixels.scale(scale, scale);
    // Explicit dimensions avoid Firefox's foreignObject intrinsic-size crop.
    pixels.drawImage(image, 0, 0, width, height);
    return canvas;
  } catch (error: unknown) {
    if (canvas) canvas.width = canvas.height = 0;
    throw error;
  } finally {
    image.removeAttribute('src');
  }
}
