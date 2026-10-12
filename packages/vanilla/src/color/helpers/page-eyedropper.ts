import type {
  EyeDropperModeContext,
  EyeDropperSession,
} from '../eyedropper-modes.ts';
import type { EyeDropperSampler } from '../eyedropper-source.ts';
import { snapshotFontCss } from './page-eyedropper-fonts.ts';
import { rasterizePageSvg } from './page-eyedropper-raster.ts';
import type { EyeDropperPageOptions } from '../page-eyedropper-options.ts';
import { PageSnapshotStyles } from './page-eyedropper-styles.ts';
import { PageViewportTree } from './page-eyedropper-viewport.ts';

interface ViewportCapture {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

let captureQueue: Promise<void> = Promise.resolve();

/** Measure viewport geometry and the pixel grid used by CSS layout separately. */
function viewportGeometry(
  document: Document,
  pixelRatio: number,
  rootZoom: number,
): { width: number; height: number; layoutScale: number } {
  const probe = document.createElement('div');
  probe.setAttribute('data-dsk-eyedropper-overlay', '');
  probe.style.cssText =
    'all:initial!important;position:fixed!important;inset:0 auto auto 0!important;width:100vw!important;height:100vh!important;border-left:0.0001px solid transparent!important;visibility:hidden!important;pointer-events:none!important;';
  document.documentElement.append(probe);
  try {
    const style = document.defaultView!.getComputedStyle(probe);
    // Engines that snap a positive hairline to one layout pixel expose their
    // layout grid here. Canvas DPR can be emulated independently of this grid.
    const border = Number.parseFloat(style.borderLeftWidth) * rootZoom;
    // Engines that round it to zero retain CSS layout without extra scaling.
    const measuredScale = border > 0 ? 1 / border : 1;
    // Computed CSS lengths serialize with limited decimal precision.
    const layoutScale =
      Math.abs(measuredScale - pixelRatio) < 0.001
        ? pixelRatio
        : Math.abs(measuredScale - 1) < 0.001
          ? 1
          : measuredScale;
    return {
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height),
      layoutScale,
    };
  } finally {
    probe.remove();
  }
}

/** Runtime control properties must survive the snapshot's HTML serialization. */
function copyControlState(original: HTMLElement, clone: HTMLElement): void {
  if (
    original instanceof HTMLInputElement &&
    clone instanceof HTMLInputElement
  ) {
    clone.setAttribute('value', original.value);
    if (original.type !== 'file') clone.value = original.value;
    clone.checked = original.checked;
    clone.toggleAttribute('checked', original.checked);
  } else if (
    original instanceof HTMLTextAreaElement &&
    clone instanceof HTMLTextAreaElement
  ) {
    // The renderer uses innerHTML, which changes literal markup in user input.
    clone.textContent = original.value;
    clone.value = original.value;
  } else if (
    original instanceof HTMLSelectElement &&
    clone instanceof HTMLSelectElement
  ) {
    for (const [index, option] of Array.from(original.options).entries()) {
      const copied = clone.options[index];
      if (!copied) continue;
      copied.selected = option.selected;
      copied.toggleAttribute('selected', option.selected);
    }
    if (!original.multiple && original.selectedIndex === -1) {
      // A serialized single select otherwise selects its first option again.
      const empty = clone.ownerDocument.createElement('option');
      empty.hidden = true;
      empty.disabled = true;
      empty.setAttribute('selected', '');
      clone.append(empty);
    }
  } else if (
    original instanceof HTMLProgressElement &&
    clone instanceof HTMLProgressElement
  ) {
    clone.max = original.max;
    if (original.hasAttribute('value')) clone.value = original.value;
    else clone.removeAttribute('value');
  } else if (
    original instanceof HTMLMeterElement &&
    clone instanceof HTMLMeterElement
  ) {
    clone.min = original.min;
    clone.max = original.max;
    clone.low = original.low;
    clone.high = original.high;
    clone.optimum = original.optimum;
    clone.value = original.value;
  } else if (
    original instanceof HTMLOutputElement &&
    clone instanceof HTMLOutputElement
  ) {
    clone.textContent = original.value;
  } else if (
    original instanceof HTMLDetailsElement &&
    clone instanceof HTMLDetailsElement
  ) {
    clone.open = original.open;
  }
}

/** The renderer shares per-call configuration, so captures must not overlap. */
function captureViewport(
  document: Document,
  signal: AbortSignal,
  options: Readonly<EyeDropperPageOptions>,
): Promise<ViewportCapture> {
  const task = captureQueue.then(async () => {
    signal.throwIfAborted();
    const view = document.defaultView;
    if (!view)
      throw new DOMException(
        'The page has no active window.',
        'InvalidStateError',
      );
    const { default: renderer } = await import('dom-to-image-more');
    // A style/layout flush starts font loads caused by recent class/style edits.
    document.documentElement.getBoundingClientRect();
    await document.fonts.ready;
    signal.throwIfAborted();

    for (let attempt = 0; attempt < 3; attempt++) {
      const pixelRatio = view.devicePixelRatio;
      const rootStyle = view.getComputedStyle(document.documentElement);
      const rootZoom = Number.parseFloat(rootStyle.zoom) || 1;
      const viewport = viewportGeometry(document, pixelRatio, rootZoom);
      const width = Math.round(viewport.width * pixelRatio) / pixelRatio;
      const height = Math.round(viewport.height * pixelRatio) / pixelRatio;
      const innerWidth = view.innerWidth;
      const innerHeight = view.innerHeight;
      const scrollX = view.scrollX;
      const scrollY = view.scrollY;
      const layoutWidth = rootStyle.width;
      const layoutHeight = rootStyle.height;
      const fixed: Array<{ clone: HTMLElement; bounds: DOMRect }> = [];
      const controls: Array<{ original: HTMLElement; clone: HTMLElement }> = [];
      const styles = new PageSnapshotStyles(document, options, signal);
      const tree = new PageViewportTree(document);
      const source = await renderer.toSvg(document.documentElement, {
        width: width * viewport.layoutScale,
        height: height * viewport.layoutScale,
        preserveScroll: options.preserveScroll !== false,
        // This flag controls default-style elimination, not fidelity. Keep that
        // optimization off; our pass copies the complete computed declaration.
        copyDefaultStyles: false,
        // Use one capture policy for normal and pseudo styles. The renderer's
        // filter does not govern existing inline declarations or pseudo rules.
        filterStyles: () => false,
        adjustPseudoElement: () => false,
        // Inline every CSS URL and content image through our shared parser;
        // the renderer's CSS URL regex cannot handle quoted parentheses.
        disableInlineImages: true,
        // The built-in collector misses @import, grouping and shadow-root sheets.
        // Embed their used font faces together in the final detached clone.
        disableEmbedFonts: true,
        httpTimeout: 10000,
        filter: (node) =>
          !(
            node instanceof Element &&
            (['HEAD', 'SCRIPT', 'STYLE', 'LINK'].includes(node.tagName) ||
              node.hasAttribute('data-dsk-eyedropper-overlay'))
          ) &&
          (options.filter?.(node) ?? true) &&
          tree.includes(node),
        adjustClonedNode: (node, clone, after) => {
          if (after) tree.capture(node, clone);
          if (after && node instanceof Element && clone instanceof Element) {
            const { generatedContent } = styles.capture(node, clone);
            if (
              !generatedContent &&
              node instanceof HTMLElement &&
              clone instanceof HTMLElement &&
              node.childElementCount === 0 &&
              node.textContent?.trim() &&
              view.getComputedStyle(node).whiteSpace === 'normal' &&
              view.getComputedStyle(node).display === 'block' &&
              !['flex', 'inline-flex', 'grid', 'inline-grid'].includes(
                node.parentElement
                  ? view.getComputedStyle(node.parentElement).display
                  : '',
              )
            ) {
              const range = document.createRange();
              range.selectNodeContents(node);
              // Freeze an existing single line: SVG font metrics can differ by
              // a fraction of a pixel at browser zoom and wrap its last word.
              if (range.getClientRects().length === 1)
                clone.style.whiteSpace = 'nowrap';
            }
          }
          if (
            after &&
            node instanceof HTMLElement &&
            clone instanceof HTMLElement &&
            node.matches(
              'input, textarea, select, progress, meter, output, details',
            )
          )
            controls.push({ original: node, clone });
          if (
            after &&
            node instanceof HTMLElement &&
            clone instanceof HTMLElement &&
            view.getComputedStyle(node).position === 'fixed'
          )
            fixed.push({ clone, bounds: node.getBoundingClientRect() });
        },
        onclone: async (clone) => {
          if (!(clone instanceof HTMLElement)) return;
          styles.finish();
          // Apply after renderer processing, which can overwrite form state.
          for (const entry of controls)
            copyControlState(entry.original, entry.clone);
          // Output includes the viewport; layout must retain its original width,
          // including the space occupied by a visible browser scrollbar.
          clone.style.width = layoutWidth;
          clone.style.height = layoutHeight;
          // Match the live layout's pixel scale before Chromium rounds borders
          // and text advances, rather than enlarging a layout computed at 1x.
          clone.style.zoom = String(rootZoom * viewport.layoutScale);
          // Scroll-preserving transforms create containing blocks for fixed UI.
          // Relocate only clones so their viewport positions stay unchanged.
          for (const { clone: element, bounds } of fixed) {
            Object.assign(element.style, {
              position: 'absolute',
              margin: '0',
              left: `${bounds.left}px`,
              top: `${bounds.top}px`,
              right: 'auto',
              bottom: 'auto',
              width: `${bounds.width}px`,
              height: `${bounds.height}px`,
              boxSizing: 'border-box',
              transform: 'none',
            });
            clone.append(element);
          }
          const fontCss =
            options.embedFonts === false
              ? ''
              : await snapshotFontCss(
                  document,
                  styles.families,
                  signal,
                  styles.shadowRoots,
                );
          const pseudoCss = await styles.css();
          await styles.embedImages(clone);
          signal.throwIfAborted();
          if (fontCss || pseudoCss) {
            const style = document.createElement('style');
            style.textContent = `${fontCss}\n${pseudoCss}`;
            clone.prepend(style);
          }
        },
      });
      const canvas = await rasterizePageSvg(
        document,
        source,
        width,
        height,
        pixelRatio,
        signal,
      );
      if (signal.aborted) {
        canvas.width = canvas.height = 0;
        signal.throwIfAborted();
      }
      if (
        view.scrollX !== scrollX ||
        view.scrollY !== scrollY ||
        view.innerWidth !== innerWidth ||
        view.innerHeight !== innerHeight ||
        view.devicePixelRatio !== pixelRatio
      ) {
        canvas.width = canvas.height = 0;
        continue;
      }
      return { canvas, width, height };
    }
    throw new DOMException('The page moved during capture.', 'AbortError');
  });
  captureQueue = task.then(
    () => {},
    () => {},
  );
  return task;
}

/**
 * Reconstruct a frozen page image without modifying the live document's styles.
 * The session surface must cover the viewport; consumers cancel on viewport
 * movement because the snapshot does not follow later page changes.
 */
export function createPageEyedropperSession(
  { document, signal }: EyeDropperModeContext,
  options: Readonly<EyeDropperPageOptions> = {},
): Promise<EyeDropperSession> {
  const view = document.defaultView;
  if (!view || signal.aborted)
    return Promise.reject(
      new DOMException('Page capture canceled.', 'AbortError'),
    );

  return new Promise((resolve, reject) => {
    const operation = new AbortController();
    let disposed = false;
    let surface: HTMLCanvasElement | undefined;
    const dispose = (): void => {
      if (disposed) return;
      disposed = true;
      operation.abort();
      signal.removeEventListener('abort', cancel);
      view.clearTimeout(timeout);
      if (surface) {
        surface.remove();
        surface.width = surface.height = 0;
      }
    };
    const fail = (error: unknown): void => {
      dispose();
      reject(error);
    };
    const cancel = (): void =>
      fail(new DOMException('Page capture canceled.', 'AbortError'));
    const timeout = view.setTimeout(
      () =>
        fail(new DOMException('The page capture timed out.', 'TimeoutError')),
      20000,
    );
    signal.addEventListener('abort', cancel, { once: true });

    void captureViewport(document, operation.signal, options)
      .then(({ canvas, width, height }) => {
        if (disposed || signal.aborted) {
          canvas.width = canvas.height = 0;
          cancel();
          return;
        }
        surface = canvas;
        view.clearTimeout(timeout);
        const pixels = canvas.getContext('2d');
        if (!pixels)
          throw new DOMException(
            'Cannot read page pixels.',
            'NotSupportedError',
          );
        canvas.setAttribute('part', 'snapshot');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('data-dsk-eyedropper-overlay', '');
        Object.assign(canvas.style, {
          position: 'fixed',
          inset: '0 auto auto 0',
          display: 'block',
          margin: '0',
          padding: '0',
          border: '0',
          width: '100vw',
          height: '100vh',
          maxWidth: 'none',
          maxHeight: 'none',
          boxSizing: 'border-box',
          cursor: 'crosshair',
          pointerEvents: 'auto',
          touchAction: 'none',
        });
        const sample: EyeDropperSampler = (request) => {
          if (
            disposed ||
            signal.aborted ||
            request.signal.aborted ||
            !Number.isFinite(request.x) ||
            !Number.isFinite(request.y) ||
            request.x < 0 ||
            request.y < 0 ||
            request.x >= width ||
            request.y >= height
          )
            return null;
          if (
            !Number.isInteger(request.size) ||
            request.size < 1 ||
            request.size % 2 !== 1
          )
            throw new RangeError(
              'The sampled pixel square must have a positive odd size.',
            );
          const x = Math.floor((request.x / width) * canvas.width);
          const y = Math.floor((request.y / height) * canvas.height);
          const half = (request.size - 1) / 2;
          const patch = pixels.getImageData(
            x - half,
            y - half,
            request.size,
            request.size,
          );
          // getImageData pads outside the bitmap with transparent black.
          // Preserve the center location and use the same white matte at edges.
          for (let offset = 0; offset < patch.data.length; offset += 4) {
            const alpha = patch.data[offset + 3]! / 255;
            if (alpha === 1) continue;
            for (let channel = 0; channel < 3; channel++)
              patch.data[offset + channel] = Math.round(
                patch.data[offset + channel]! * alpha + 255 * (1 - alpha),
              );
            patch.data[offset + 3] = 255;
          }
          return patch;
        };
        resolve({ sample, surface: canvas, dispose });
      }, fail)
      .catch(fail);
  });
}
