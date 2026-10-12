import type {
  EyeDropperSampler,
  EyeDropperSampleRequest,
} from '../eyedropper-source.ts';

export interface EyeDropperPreviewDetail {
  /** Highlighted opaque sRGB HEX; not a committed value. */
  color: string;
  /** Viewport coordinates in CSS pixels. */
  x: number;
  y: number;
  /** Current source pixels with the selected pixel at the center. */
  pixels: ImageData;
}

interface Point {
  x: number;
  y: number;
}
interface Gesture extends Point {
  id: number;
  candidate: boolean;
  moved: boolean;
  navigation: boolean;
}

const activeDocuments = new WeakSet<Document>();

function isControl(event: Event, host: HTMLElement): boolean {
  return event
    .composedPath()
    .some(
      (node) =>
        node === host ||
        (node instanceof Element &&
          node.matches(
            'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="button"], [role="slider"]',
          )),
    );
}

function hex(pixels: ImageData): string {
  const middle =
    (Math.floor(pixels.height / 2) * pixels.width +
      Math.floor(pixels.width / 2)) *
    4;
  const alpha = pixels.data[middle + 3]! / 255;
  return (
    '#' +
    [0, 1, 2]
      .map((channel) =>
        Math.round(pixels.data[middle + channel]! * alpha + 255 * (1 - alpha))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

/** Render only a noninteractive magnifier; the document remains live and focusable. */
export function openLiveEyedropper(
  host: HTMLElement,
  signal: AbortSignal,
  size: number,
  sampler: EyeDropperSampler,
  onPreview: (detail: EyeDropperPreviewDetail) => void,
  origin?: Point,
  surface?: HTMLCanvasElement,
): Promise<{ sRGBHex: string }> {
  const document = host.ownerDocument;
  const view = document.defaultView;
  const root = host.shadowRoot;
  if (!view || !root || signal.aborted)
    return Promise.reject(
      new DOMException('Color selection canceled.', 'AbortError'),
    );
  if (activeDocuments.has(document))
    return Promise.reject(
      new DOMException(
        'Another custom eyedropper is active.',
        'InvalidStateError',
      ),
    );
  activeDocuments.add(document);

  return new Promise((resolve, reject) => {
    let settled = false;
    let animation = 0;
    let version = 0;
    let pending = false;
    let selecting = false;
    let space = false;
    let buttons = 0;
    let gesture: Gesture | undefined;
    let detail: EyeDropperPreviewDetail | undefined;
    const start = host.getBoundingClientRect();
    let pointer: Point = origin ?? {
      x: start.left + start.width / 2,
      y: start.top + start.height / 2,
    };
    const listeners = new AbortController();
    const requests = new Set<AbortController>();
    const options = { signal: listeners.signal, capture: true };
    const overlay = document.createElement('div');
    const style = document.createElement('style');
    const cursors = new Map<HTMLElement, { value: string; priority: string }>();
    let cursorTarget: HTMLElement | undefined;

    const restoreCursor = (): void => {
      for (const [target, previous] of cursors) {
        if (target.style.getPropertyValue('cursor') === 'crosshair') {
          if (previous.value)
            target.style.setProperty(
              'cursor',
              previous.value,
              previous.priority,
            );
          else target.style.removeProperty('cursor');
        }
      }
      cursors.clear();
      cursorTarget = undefined;
    };
    const cleanup = (): void => {
      signal.removeEventListener('abort', cancel);
      listeners.abort();
      for (const request of requests) request.abort();
      requests.clear();
      view.cancelAnimationFrame(animation);
      restoreCursor();
      if (overlay.hasAttribute('popover') && overlay.matches(':popover-open'))
        overlay.hidePopover();
      overlay.remove();
      style.remove();
      activeDocuments.delete(document);
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const cancel = (): void =>
      fail(new DOMException('Color selection canceled.', 'AbortError'));
    const consume = (event: Event): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const control = (event: Event): boolean =>
      surface && event.composedPath().includes(surface)
        ? false
        : isControl(event, host);
    const hide = (): void => {
      detail = undefined;
      magnifier.hidden = true;
      restoreCursor();
    };
    const locate = (): Element | null => {
      let hit = document.elementFromPoint(pointer.x, pointer.y);
      for (let depth = 0; hit?.shadowRoot && depth < 20; depth++) {
        const nested = hit.shadowRoot.elementFromPoint(pointer.x, pointer.y);
        if (!nested || nested === hit) break;
        hit = nested;
      }
      return hit;
    };
    const move = (point: Point): void => {
      if (point.x !== pointer.x || point.y !== pointer.y) {
        pointer = { x: point.x, y: point.y };
        version++;
        detail = undefined;
      }
    };

    overlay.setAttribute('part', 'overlay');
    overlay.setAttribute('data-dsk-eyedropper-overlay', '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div part="magnifier" hidden><slot name="magnifier">
        <div part="lens"><canvas part="pixels"></canvas><span part="grid"></span><span part="crosshair"></span></div>
        <div part="readout"><span part="swatch"></span><output part="value"></output></div>
      </slot></div>`;
    const magnifier =
      overlay.querySelector<HTMLDivElement>('[part="magnifier"]')!;
    const canvas = overlay.querySelector('canvas')!;
    const label = overlay.querySelector('output')!;
    const swatch = overlay.querySelector<HTMLSpanElement>('[part="swatch"]')!;
    if (surface) {
      surface.setAttribute('part', 'snapshot');
      surface.tabIndex = -1;
      surface.style.cssText =
        'position:fixed;inset:0;width:100vw;height:100vh;border:0;margin:0;max-width:none;max-height:none;pointer-events:auto;cursor:crosshair;touch-action:none;outline:none;';
      overlay.prepend(surface);
      magnifier.style.zIndex = '1';
    }
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      fail(new Error('Cannot draw pixel magnification.'));
      return;
    }
    style.textContent = `
      [part="overlay"] { position: fixed; inset: 0 auto auto 0; margin: 0; padding: 0; border: 0; width: 0; height: 0; max-width: none; max-height: none; overflow: visible; background: transparent; pointer-events: none !important; z-index: 2147483647; }
      [part="overlay"]::backdrop { background: transparent; pointer-events: none; }
      [part="magnifier"] { position: absolute; pointer-events: none !important; width: var(--dsk-color-eyedropper-magnifier-size, 120px); color: var(--dsk-color-eyedropper-magnifier-color, #fff); font: 12px/1.4 system-ui, sans-serif; filter: drop-shadow(var(--dsk-color-eyedropper-magnifier-shadow, 0 3px 8px #0008)); }
      [part="magnifier"][hidden] { display: none !important; }
      [part="lens"] { position: relative; isolation: isolate; width: 100%; aspect-ratio: 1; box-sizing: border-box; overflow: hidden; border-radius: var(--dsk-color-eyedropper-magnifier-radius, 50%); border: var(--dsk-color-eyedropper-magnifier-border, 3px solid #fff); background: var(--dsk-color-eyedropper-magnifier-background, #252831); }
      [part="pixels"] { display: block; width: 100%; height: 100%; background: #fff; image-rendering: pixelated; }
      [part="grid"] { position: absolute; inset: 0; background-image: linear-gradient(to right, var(--dsk-color-eyedropper-grid-color, #fff) 1px, transparent 1px), linear-gradient(to bottom, var(--dsk-color-eyedropper-grid-color, #fff) 1px, transparent 1px); background-size: ${100 / size}% ${100 / size}%; opacity: var(--dsk-color-eyedropper-grid-opacity, 1); mix-blend-mode: difference; }
      [part="crosshair"] { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: ${100 / size}%; height: ${100 / size}%; box-sizing: border-box; border: var(--dsk-color-eyedropper-crosshair-border, 1px solid #fff); box-shadow: var(--dsk-color-eyedropper-crosshair-shadow, 0 0 0 1px #000); }
      [part="readout"] { display: var(--dsk-color-eyedropper-readout-display, flex); width: max-content; max-width: 100%; margin: 8px auto 0; align-items: center; gap: 6px; padding: 5px 8px; box-sizing: border-box; border-radius: var(--dsk-color-eyedropper-readout-radius, 6px); background: var(--dsk-color-eyedropper-magnifier-background, #252831); }
      [part="swatch"] { display: block; flex: none; width: 12px; height: 12px; border: 1px solid #ffffff80; border-radius: 3px; }
      [part="value"] { font: inherit; }
    `;

    const draw = (pixels: ImageData | null, point: Point): void => {
      if (settled) return;
      if (!pixels) {
        hide();
        return;
      }
      if (
        !(pixels instanceof ImageData) ||
        pixels.width !== size ||
        pixels.height !== size ||
        (pixels.colorSpace !== undefined && pixels.colorSpace !== 'srgb')
      ) {
        throw new TypeError(
          `The eyedropper sampler must return a ${size} by ${size} sRGB ImageData or null.`,
        );
      }
      const color = hex(pixels);
      context.putImageData(pixels, 0, 0);
      label.value = color;
      swatch.style.backgroundColor = color;
      magnifier.style.setProperty(
        '--dsk-color-eyedropper-selected-color',
        color,
      );
      magnifier.dataset.color = color;
      magnifier.hidden = false;
      const offsetValue = Number.parseFloat(
        view
          .getComputedStyle(host)
          .getPropertyValue('--dsk-color-eyedropper-magnifier-offset'),
      );
      const offset = Number.isFinite(offsetValue) ? offsetValue : 20;
      const bounds = magnifier.getBoundingClientRect();
      const left =
        point.x + offset + bounds.width <= view.innerWidth
          ? point.x + offset
          : point.x - offset - bounds.width;
      const top =
        point.y + offset + bounds.height <= view.innerHeight
          ? point.y + offset
          : point.y - offset - bounds.height;
      magnifier.style.left = `${Math.max(0, Math.min(view.innerWidth - bounds.width, left))}px`;
      magnifier.style.top = `${Math.max(0, Math.min(view.innerHeight - bounds.height, top))}px`;
      const hit = locate();
      if (hit !== cursorTarget) {
        restoreCursor();
        if (hit instanceof HTMLElement) {
          cursors.set(hit, {
            value: hit.style.getPropertyValue('cursor'),
            priority: hit.style.getPropertyPriority('cursor'),
          });
          hit.style.setProperty('cursor', 'crosshair', 'important');
          cursorTarget = hit;
        }
      }
      detail = { color, x: point.x, y: point.y, pixels };
      onPreview(detail);
    };
    const request = (
      point: Point,
    ): {
      result: ReturnType<EyeDropperSampler>;
      controller: AbortController;
    } => {
      const controller = new AbortController();
      requests.add(controller);
      const parameters: EyeDropperSampleRequest = {
        ...point,
        size,
        signal: controller.signal,
      };
      try {
        return { result: sampler(parameters), controller };
      } catch (error: unknown) {
        requests.delete(controller);
        throw error;
      }
    };
    const commit = (): void => {
      if (selecting || settled) return;
      selecting = true;
      const point = { ...pointer };
      try {
        const { result, controller } = request(point);
        void Promise.resolve(result)
          .then((pixels) => {
            requests.delete(controller);
            if (settled) return;
            selecting = false;
            draw(pixels, point);
            if (settled || !pixels) return;
            const sRGBHex = hex(pixels);
            settled = true;
            cleanup();
            resolve({ sRGBHex });
          }, fail)
          .catch(fail);
      } catch (error: unknown) {
        fail(error);
      }
    };
    const tick = (): void => {
      if (settled) return;
      animation = view.requestAnimationFrame(tick);
      if (pending || selecting) return;
      if (
        space ||
        buttons !== 0 ||
        pointer.x < 0 ||
        pointer.y < 0 ||
        pointer.x >= view.innerWidth ||
        pointer.y >= view.innerHeight
      ) {
        hide();
        return;
      }
      const point = { ...pointer };
      const requestedVersion = version;
      try {
        const { result, controller } = request(point);
        pending = true;
        void Promise.resolve(result)
          .then((pixels) => {
            requests.delete(controller);
            pending = false;
            if (
              settled ||
              selecting ||
              requestedVersion !== version ||
              space ||
              buttons !== 0
            )
              return;
            draw(pixels, point);
          }, fail)
          .catch(fail);
      } catch (error: unknown) {
        fail(error);
      }
    };

    signal.addEventListener('abort', cancel, { once: true });
    view.addEventListener('blur', cancel, { signal: listeners.signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) cancel();
      },
      options,
    );
    const invalidate = (): void => {
      version++;
      hide();
    };
    view.addEventListener('scroll', surface ? cancel : invalidate, options);
    view.addEventListener('resize', surface ? cancel : invalidate, options);
    view.addEventListener('wheel', surface ? consume : invalidate, {
      ...options,
      passive: !surface,
    });
    view.addEventListener(
      'pointermove',
      (event) => {
        move({ x: event.clientX, y: event.clientY });
        buttons = event.buttons;
        if (
          gesture?.id === event.pointerId &&
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4
        )
          gesture.moved = true;
        if (gesture?.candidate && !gesture.navigation) consume(event);
      },
      options,
    );
    view.addEventListener(
      'pointerout',
      (event) => {
        if (event.relatedTarget === null) {
          move({ x: -1, y: -1 });
          hide();
        }
      },
      options,
    );
    view.addEventListener(
      'pointerdown',
      (event) => {
        if (control(event)) return;
        move({ x: event.clientX, y: event.clientY });
        buttons = event.buttons;
        const navigation =
          !surface &&
          (space ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey);
        if (surface && event.button !== 0) {
          consume(event);
          return;
        }
        gesture = {
          ...pointer,
          id: event.pointerId,
          candidate: false,
          moved: false,
          navigation,
        };
        if (navigation || selecting) {
          hide();
          return;
        }
        try {
          const { result, controller } = request(pointer);
          if (result === null || result instanceof ImageData) {
            requests.delete(controller);
            gesture.candidate = result !== null;
            if (result) draw(result, pointer);
          } else {
            gesture.candidate =
              detail !== undefined &&
              detail.x === pointer.x &&
              detail.y === pointer.y;
            void Promise.resolve(result).then(
              () => requests.delete(controller),
              fail,
            );
          }
          if (gesture.candidate) consume(event);
        } catch (error: unknown) {
          fail(error);
        }
      },
      options,
    );
    view.addEventListener(
      'pointerup',
      (event) => {
        buttons = event.buttons;
        if (
          gesture?.id === event.pointerId &&
          gesture.candidate &&
          !gesture.navigation
        )
          consume(event);
      },
      options,
    );
    view.addEventListener(
      'pointercancel',
      () => {
        gesture = undefined;
        buttons = 0;
        invalidate();
      },
      options,
    );
    for (const type of ['mousedown', 'mouseup'])
      view.addEventListener(
        type,
        (event) => {
          if (gesture?.candidate && !gesture.navigation) consume(event);
        },
        options,
      );
    view.addEventListener(
      'click',
      (event) => {
        const previous = gesture;
        gesture = undefined;
        if (!previous?.candidate || previous.navigation || control(event))
          return;
        consume(event);
        if (
          previous.moved ||
          space ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        move({ x: event.clientX, y: event.clientY });
        commit();
      },
      options,
    );
    view.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          consume(event);
          cancel();
          return;
        }
        if (control(event) && !event.composedPath().includes(host)) return;
        if (
          surface &&
          (event.code === 'Space' || event.key === ' ' || event.key === 'Tab')
        ) {
          consume(event);
          return;
        }
        if (event.code === 'Space' || event.key === ' ') {
          space = true;
          if (gesture) gesture.navigation = true;
          invalidate();
          return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === 'Enter' && detail) {
          consume(event);
          commit();
          return;
        }
        const step = event.shiftKey ? 10 : 1;
        const next = { ...pointer };
        switch (event.key) {
          case 'ArrowLeft':
            next.x -= step;
            break;
          case 'ArrowRight':
            next.x += step;
            break;
          case 'ArrowUp':
            next.y -= step;
            break;
          case 'ArrowDown':
            next.y += step;
            break;
          default:
            return;
        }
        consume(event);
        move({
          x: Math.max(0, Math.min(view.innerWidth - 1, next.x)),
          y: Math.max(0, Math.min(view.innerHeight - 1, next.y)),
        });
      },
      options,
    );
    view.addEventListener(
      'keyup',
      (event) => {
        if (event.code === 'Space' || event.key === ' ') {
          space = false;
          invalidate();
        }
      },
      options,
    );
    if (surface) {
      view.addEventListener(
        'contextmenu',
        (event) => {
          consume(event);
          cancel();
        },
        options,
      );
    }

    try {
      if (typeof overlay.showPopover === 'function')
        overlay.setAttribute('popover', 'manual');
      root.append(style, overlay);
      if (overlay.hasAttribute('popover')) overlay.showPopover();
      surface?.focus({ preventScroll: true });
      animation = view.requestAnimationFrame(tick);
    } catch (error: unknown) {
      fail(error);
    }
  });
}
