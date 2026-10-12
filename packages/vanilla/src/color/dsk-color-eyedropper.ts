import { normalizePageOptions } from './helpers/normalize-page-options.ts';
import {
  type ColorNumber,
  normalizeRgbHex,
  positiveNumber,
} from './helpers/color-model.ts';
import { openLiveEyedropper } from './helpers/live-eyedropper.ts';
import {
  createCanvasSampler,
  type EyeDropperSampler,
} from './eyedropper-source.ts';

import type {
  EyeDropperMode,
  EyeDropperModeAdapter,
  EyeDropperModeContext,
  EyeDropperModeInfo,
  EyeDropperSession,
} from './eyedropper-modes.ts';
import { type EyeDropperPageOptions } from './page-eyedropper-options.ts';

export type { EyeDropperMode } from './eyedropper-modes.ts';

const builtInModes = [
  { id: 'canvas', label: 'Canvas / custom' },
  { id: 'page', label: 'Page / custom' },
  { id: 'native', label: 'Screen / native' },
] as const;

function isBuiltInMode(name: string): boolean {
  return name === 'custom' || builtInModes.some(({ id }) => id === name);
}

interface NativeEyeDropper {
  open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }>;
}

interface EyeDropperWindow extends Window {
  EyeDropper?: new () => NativeEyeDropper;
}

interface Selection {
  controller: AbortController;
  resolve: (color: string | null) => void;
  restoreFocus: boolean;
}

export interface EyeDropperErrorDetail {
  error: Error;
}

function normalizeColor(value: string | null | undefined): string {
  const color = (value ?? '').trim();
  return /^#?(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)
    ? normalizeRgbHex(color)
    : '';
}

/** A color picker with built-in and application-defined pixel sources. */
export class DskColorEyedropper extends HTMLElement {
  static readonly observedAttributes = [
    'color',
    'mode',
    'source',
    'magnifier-pixels',
    'disabled',
    'size',
    'aria-label',
    'title',
    'tabindex',
  ];

  private readonly _button: HTMLButtonElement;
  private readonly _status: HTMLSpanElement;
  private readonly _sizeStyle: HTMLStyleElement;
  private _listeners: AbortController | undefined;
  private _selection: Selection | undefined;
  private _writing = false;
  private _revision = 0;
  private _message = '';
  private _source: HTMLCanvasElement | null = null;
  private _sampler: EyeDropperSampler | null = null;
  private _pageOptions: Readonly<EyeDropperPageOptions> = Object.freeze({});
  private _activationPoint: { x: number; y: number } | undefined;
  private readonly _modes = new Map<string, EyeDropperModeAdapter>();
  private readonly _capabilitySignal = new AbortController().signal;
  private readonly _canvasSamplers = new WeakMap<
    HTMLCanvasElement,
    EyeDropperSampler
  >();

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true }).innerHTML = `
      <style>
        :host { display: inline-block; vertical-align: middle; line-height: 0; }
        :host([hidden]) { display: none !important; }
        [part="button"] {
          display: grid; place-items: center; width: 100%; height: 100%;
          box-sizing: border-box; margin: 0; padding: 0;
          border: 1px solid var(--dsk-color-eyedropper-border-color, #dce2ec);
          border-radius: var(--dsk-color-eyedropper-radius, 7px);
          background: var(--dsk-color-eyedropper-background, #fff);
          color: var(--dsk-color-eyedropper-color, #566174);
          cursor: pointer; touch-action: manipulation;
        }
        [part="button"]:hover:not(:disabled) { background: var(--dsk-color-eyedropper-hover-background, #f1f4f9); }
        [part="button"]:focus-visible { outline: 2px solid var(--dsk-color-eyedropper-focus-color, #557be8); outline-offset: 3px; }
        [part="button"]:disabled { cursor: not-allowed; opacity: .45; }
        [part="button"][aria-pressed="true"] {
          color: var(--dsk-color-eyedropper-active-color, #557be8);
          border-color: currentColor; opacity: 1; cursor: crosshair;
          background: color-mix(in srgb, var(--dsk-color-eyedropper-active-color, #557be8) 10%, var(--dsk-color-eyedropper-background, #fff));
        }
        [part="icon"] { display: block; width: 18px; height: 18px; max-width: 75%; max-height: 75%; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
        [part="status"] { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
      </style>
      <style id="size"></style>
      <button part="button" type="button" aria-label="Pick color from screen" aria-describedby="status" aria-pressed="false">
        <svg part="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m14 5 1.5-1.5a2.8 2.8 0 0 1 4 4L18 9m-6-6 9 9M14 5 4 15v3l-1 3 3-1h3L19 10M7 12l5 5"></path>
        </svg>
      </button>
      <span id="status" part="status" role="status" aria-live="polite"></span>
    `;
    this._button = this._element('[part="button"]', HTMLButtonElement);
    this._status = this._element('[part="status"]', HTMLSpanElement);
    this._sizeStyle = this._element('#size', HTMLStyleElement);
    this._render();
  }

  private _element<T extends Element>(selector: string, type: new () => T): T {
    const element = this.shadowRoot?.querySelector(selector);
    if (!(element instanceof type))
      throw new Error(`Missing eyedropper element: ${selector}`);
    return element;
  }

  connectedCallback(): void {
    for (const property of [
      'color',
      'value',
      'size',
      'disabled',
      'mode',
      'source',
      'sampler',
      'pageOptions',
      'magnifierPixels',
    ]) {
      if (Object.hasOwn(this, property)) {
        const value: unknown = Reflect.get(this, property);
        Reflect.deleteProperty(this, property);
        Reflect.set(this, property, value);
      }
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    this._button.addEventListener('click', this._onClick, {
      signal: this._listeners.signal,
    });
    this._render();
  }

  disconnectedCallback(): void {
    this._revision += 1;
    this._cancel(false);
    this._listeners?.abort();
    this._listeners = undefined;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (this._writing || oldValue === newValue) return;
    if (name === 'source') this._source = null;
    if (
      name === 'color' ||
      name === 'disabled' ||
      name === 'mode' ||
      name === 'source' ||
      name === 'magnifier-pixels'
    ) {
      this._revision += 1;
      this._cancel(false);
      this._message = '';
    }
    this._render();
  }

  get color(): string {
    return normalizeColor(this.getAttribute('color'));
  }
  set color(value: string | null | undefined) {
    this._revision += 1;
    this._cancel(false);
    this._message = '';
    if (value == null) this.removeAttribute('color');
    else this.setAttribute('color', normalizeColor(value));
    this._render();
  }
  get value(): string {
    return this.color;
  }
  set value(value: string | null | undefined) {
    this.color = value;
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
  get size(): number {
    return positiveNumber(this.getAttribute('size'), 32);
  }
  set size(value: ColorNumber) {
    if (value == null) this.removeAttribute('size');
    else this.setAttribute('size', String(value));
  }
  get supported(): boolean {
    return this._modeSupported(this.mode);
  }
  get nativeSupported(): boolean {
    return this._nativeConstructor !== undefined;
  }
  get mode(): EyeDropperMode {
    return (
      this.getAttribute('mode')?.trim() ||
      (this.nativeSupported ? 'native' : 'page')
    );
  }
  set mode(value: EyeDropperMode | null | undefined) {
    if (value == null) this.removeAttribute('mode');
    else this.setAttribute('mode', value);
  }
  get modes(): readonly EyeDropperModeInfo[] {
    return Object.freeze([
      ...builtInModes.map(({ id, label }) =>
        Object.freeze({ id, label, supported: this._modeSupported(id) }),
      ),
      ...Array.from(this._modes, ([id, adapter]) =>
        Object.freeze({
          id,
          label: adapter.label || id,
          supported: this._modeSupported(id),
        }),
      ),
    ]);
  }

  registerMode(
    name: string,
    adapter: EyeDropperModeAdapter | EyeDropperSampler,
  ): void {
    this._validateModeName(name);
    const definition: EyeDropperModeAdapter =
      typeof adapter === 'function'
        ? { createSession: () => ({ sample: adapter }) }
        : adapter;
    if (
      !definition ||
      typeof definition.createSession !== 'function' ||
      (definition.isSupported !== undefined &&
        typeof definition.isSupported !== 'function') ||
      (definition.label !== undefined && typeof definition.label !== 'string')
    )
      throw new TypeError(
        'An eyedropper mode needs a session factory or sampler.',
      );
    if (this.mode === name) {
      this._revision++;
      this._cancel(false);
      this._message = '';
    }
    this._modes.set(
      name,
      Object.freeze({
        createSession: definition.createSession.bind(definition),
        ...(definition.label !== undefined ? { label: definition.label } : {}),
        ...(definition.isSupported
          ? { isSupported: definition.isSupported.bind(definition) }
          : {}),
      }),
    );
    this._render();
  }

  unregisterMode(name: string): boolean {
    this._validateModeName(name);
    if (!this._modes.has(name)) return false;
    if (this.mode === name) {
      this._revision++;
      this._cancel(false);
      this._message = '';
    }
    this._modes.delete(name);
    this._render();
    return true;
  }
  get source(): HTMLCanvasElement | null {
    if (this._source) return this._source;
    const selector = this.getAttribute('source');
    if (!selector) return null;
    const root = this.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) return null;
    try {
      const source = root.querySelector(selector);
      return source instanceof HTMLCanvasElement ? source : null;
    } catch {
      return null;
    }
  }
  set source(value: HTMLCanvasElement | null | undefined) {
    if (value != null && !(value instanceof HTMLCanvasElement))
      throw new TypeError('An eyedropper source must be a canvas element.');
    this._revision++;
    this._cancel(false);
    this.removeAttribute('source');
    this._source = value ?? null;
    this._message = '';
    this._render();
  }
  get sampler(): EyeDropperSampler | null {
    return this._sampler;
  }
  set sampler(value: EyeDropperSampler | null | undefined) {
    if (value != null && typeof value !== 'function')
      throw new TypeError('An eyedropper sampler must be a function.');
    this._revision++;
    this._cancel(false);
    this._sampler = value ?? null;
    this._message = '';
    this._render();
  }
  get pageOptions(): Readonly<EyeDropperPageOptions> {
    return this._pageOptions;
  }
  set pageOptions(value: EyeDropperPageOptions | null | undefined) {
    const options = normalizePageOptions(value);
    this._revision++;
    this._cancel(false);
    this._pageOptions = options;
    this._message = '';
    this._render();
  }
  get magnifierPixels(): number {
    const count = Math.min(
      31,
      Math.max(
        3,
        Math.round(positiveNumber(this.getAttribute('magnifier-pixels'), 9)),
      ),
    );
    return count % 2 === 0 ? count + 1 : count;
  }
  set magnifierPixels(value: ColorNumber) {
    if (value == null) this.removeAttribute('magnifier-pixels');
    else this.setAttribute('magnifier-pixels', String(value));
  }
  get picking(): boolean {
    return this._selection !== undefined;
  }

  override focus(options?: FocusOptions): void {
    this._button.focus(options);
  }
  override blur(): void {
    this._button.blur();
    super.blur();
  }
  override click(): void {
    this._button.click();
  }

  /** Invoke directly from a user gesture; native activation must not cross an await. */
  open(): Promise<string | null> {
    if (this.disabled || !this.isConnected || this.picking)
      return Promise.resolve(null);
    const Constructor = this._nativeConstructor;
    if (!this.supported) {
      this._reportError(
        new DOMException(this._unavailableMessage(), 'NotSupportedError'),
      );
      return Promise.resolve(null);
    }
    this._revision += 1;
    return new Promise((resolve) => {
      const selection: Selection = {
        controller: new AbortController(),
        resolve,
        restoreFocus: this.shadowRoot?.activeElement === this._button,
      };
      this._selection = selection;
      this._message =
        this.mode === 'native'
          ? 'Choose a pixel from the screen. Press Escape to cancel.'
          : this.mode === 'page'
            ? 'Preparing the page for selection. Press Escape to cancel.'
            : 'Move over the source to choose a color. Navigate normally; Escape cancels.';
      this._render();
      try {
        // Start the native picker before dispatching events or yielding activation.
        const result =
          this.mode === 'native' && Constructor
            ? new Constructor().open({ signal: selection.controller.signal })
            : this._openCustomSession(selection, (detail) => {
                if (this._selection !== selection) return;
                const message = `Highlighted ${detail.color}. Click or press Enter to select. Escape cancels.`;
                if (this._status.textContent !== message)
                  this._status.textContent = message;
                this.dispatchEvent(
                  new CustomEvent('colorpreview', {
                    detail,
                    bubbles: true,
                    composed: true,
                  }),
                );
              });
        void result.then(
          (value) => this._accept(selection, value.sRGBHex),
          (error: unknown) => this._reject(selection, error),
        );
        if (this._selection === selection) this._emit('pickstart');
      } catch (error: unknown) {
        this._reject(selection, error);
      }
    });
  }

  cancel(): void {
    this._cancel(true);
  }

  private get _nativeConstructor(): (new () => NativeEyeDropper) | undefined {
    const view: EyeDropperWindow | null = this.ownerDocument.defaultView;
    return view?.isSecureContext && typeof view.EyeDropper === 'function'
      ? view.EyeDropper
      : undefined;
  }

  private _validateModeName(name: string): void {
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name))
      throw new TypeError(
        'Mode names must use lowercase letters, digits, and hyphens.',
      );
    if (isBuiltInMode(name))
      throw new TypeError(
        `The built-in eyedropper mode "${name}" is reserved.`,
      );
  }

  private _modeContext(signal: AbortSignal): EyeDropperModeContext {
    return {
      host: this,
      document: this.ownerDocument,
      signal,
      source: this.source,
    };
  }

  private _modeSupported(mode: string): boolean {
    if (mode === 'native') return this.nativeSupported;
    if (
      !this.ownerDocument.defaultView ||
      typeof HTMLCanvasElement === 'undefined' ||
      typeof HTMLCanvasElement.prototype.getContext !== 'function'
    )
      return false;
    if (mode === 'canvas' || mode === 'custom' || mode === 'page') return true;
    const adapter = this._modes.get(mode);
    if (!adapter) return false;
    try {
      return (
        adapter.isSupported?.(this._modeContext(this._capabilitySignal)) ?? true
      );
    } catch {
      return false;
    }
  }

  private _unavailableMessage(): string {
    return this.mode === 'native'
      ? 'Screen color picking is unavailable in this browser or context.'
      : `The eyedropper mode "${this.mode}" is unavailable or has not been registered.`;
  }

  private async _openCustomSession(
    selection: Selection,
    onPreview: Parameters<typeof openLiveEyedropper>[4],
  ): Promise<{ sRGBHex: string }> {
    const mode = this.mode;
    const origin = this._activationPoint ?? this._sourceCenter();
    const controller = new AbortController();
    const preparation = new AbortController();
    const abort = (): void => {
      preparation.abort();
      controller.abort();
    };
    selection.controller.signal.addEventListener('abort', abort, {
      once: true,
    });
    if (selection.controller.signal.aborted) abort();
    const context = this._modeContext(controller.signal);
    const view = this.ownerDocument.defaultView;
    view?.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.cancel();
      },
      { capture: true, signal: preparation.signal },
    );
    view?.addEventListener('blur', () => this.cancel(), {
      signal: preparation.signal,
    });
    this.ownerDocument.addEventListener(
      'visibilitychange',
      () => {
        if (this.ownerDocument.hidden) this.cancel();
      },
      { signal: preparation.signal },
    );
    let session: EyeDropperSession | undefined;
    try {
      controller.signal.throwIfAborted();
      if (mode === 'canvas' || mode === 'custom') {
        session = { sample: this._liveSampler() };
      } else if (mode === 'page') {
        const { createPageEyedropperSession } =
          await import('./helpers/page-eyedropper.ts');
        controller.signal.throwIfAborted();
        session = await createPageEyedropperSession(context, this._pageOptions);
      } else {
        const adapter = this._modes.get(mode);
        if (!adapter)
          throw new DOMException(
            this._unavailableMessage(),
            'NotSupportedError',
          );
        session = await adapter.createSession(context);
      }
      controller.signal.throwIfAborted();
      if (
        !session ||
        typeof session.sample !== 'function' ||
        (session.dispose !== undefined &&
          typeof session.dispose !== 'function') ||
        (session.surface !== undefined &&
          !(session.surface instanceof HTMLCanvasElement))
      )
        throw new TypeError(
          'An eyedropper session must provide a sampler and optional canvas surface/disposer.',
        );
      preparation.abort();
      return await openLiveEyedropper(
        this,
        controller.signal,
        this.magnifierPixels,
        session.sample.bind(session),
        onPreview,
        origin,
        session.surface,
      );
    } finally {
      preparation.abort();
      selection.controller.signal.removeEventListener('abort', abort);
      controller.abort();
      if (typeof session?.dispose === 'function') session.dispose();
    }
  }

  private _sourceCenter(): { x: number; y: number } | undefined {
    const source = this.source;
    const view = this.ownerDocument.defaultView;
    if (!source || !view) return undefined;
    const bounds = source.getBoundingClientRect();
    const left = Math.max(0, bounds.left);
    const top = Math.max(0, bounds.top);
    const right = Math.min(view.innerWidth, bounds.right);
    const bottom = Math.min(view.innerHeight, bounds.bottom);
    return right > left && bottom > top
      ? { x: (left + right) / 2, y: (top + bottom) / 2 }
      : undefined;
  }

  private _liveSampler(): EyeDropperSampler {
    if (this._sampler) return this._sampler;
    if (this.hasAttribute('source') && !this.source)
      throw new DOMException(
        'The eyedropper source selector must match a canvas in its document or shadow root.',
        'NotFoundError',
      );
    return (request) => {
      let hit = this.ownerDocument.elementFromPoint(request.x, request.y);
      for (let depth = 0; hit?.shadowRoot && depth < 20; depth++) {
        const nested = hit.shadowRoot.elementFromPoint(request.x, request.y);
        if (!nested || nested === hit) break;
        hit = nested;
      }
      const source = this.source;
      const canvas = source ?? (this.hasAttribute('source') ? null : hit);
      if (!(canvas instanceof HTMLCanvasElement) || hit !== canvas) return null;
      let sample = this._canvasSamplers.get(canvas);
      if (!sample) {
        sample = createCanvasSampler(canvas);
        this._canvasSamplers.set(canvas, sample);
      }
      return sample(request);
    };
  }

  private _accept(selection: Selection, result: string): void {
    if (this._selection !== selection) return;
    if (typeof result !== 'string' || !/^#[\da-f]{6}$/i.test(result)) {
      this._reject(
        selection,
        new DOMException(
          'The browser returned an invalid screen color.',
          'OperationError',
        ),
      );
      return;
    }
    const color = normalizeColor(result);
    this._selection = undefined;
    this._writing = true;
    try {
      this.setAttribute('color', color);
    } finally {
      this._writing = false;
    }
    this._message = `Selected ${color}.`;
    this._render();
    const revision = this._revision;
    selection.resolve(color);
    this._emit('input');
    if (
      this.isConnected &&
      !this.disabled &&
      this._revision === revision &&
      this.color === color
    )
      this._emit('change');
    this._restoreFocus(selection);
  }

  private _reject(selection: Selection, cause: unknown): void {
    if (this._selection !== selection) return;
    this._selection = undefined;
    selection.resolve(null);
    const canceled =
      selection.controller.signal.aborted ||
      (typeof cause === 'object' &&
        cause !== null &&
        'name' in cause &&
        cause.name === 'AbortError');
    if (canceled) {
      this._message = 'Color selection canceled.';
      this._render();
      this._emit('cancel');
    } else {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this._reportError(error);
    }
    this._restoreFocus(selection);
  }

  private _cancel(emit: boolean): void {
    const selection = this._selection;
    if (!selection) return;
    this._selection = undefined;
    this._revision += 1;
    selection.controller.abort();
    selection.resolve(null);
    this._message = emit ? 'Color selection canceled.' : '';
    this._render();
    if (emit) {
      this._emit('cancel');
      this._restoreFocus(selection);
    }
  }

  private _restoreFocus(selection: Selection): void {
    const active = this.ownerDocument.activeElement;
    if (
      selection.restoreFocus &&
      this.isConnected &&
      !this.disabled &&
      !this.picking &&
      (active === this || active === this.ownerDocument.body)
    )
      this._button.focus({ preventScroll: true });
  }

  private _reportError(error: Error): void {
    this._message = this.supported
      ? 'Color selection failed. Try again.'
      : this._unavailableMessage();
    this._render();
    this.dispatchEvent(
      new CustomEvent<EyeDropperErrorDetail>('pickerror', {
        detail: { error },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _emit(type: 'input' | 'change' | 'pickstart' | 'cancel'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private _render(): void {
    this._sizeStyle.textContent = `:host { width: var(--dsk-color-eyedropper-size, ${this.size}px); height: var(--dsk-color-eyedropper-size, ${this.size}px); }`;
    const supported = this.supported;
    const defaultLabel =
      this.mode === 'native'
        ? 'Pick color from screen'
        : this.mode === 'page'
          ? 'Pick color from page'
          : this.mode === 'canvas' || this.mode === 'custom'
            ? 'Pick color from canvas'
            : `Pick color using ${this._modes.get(this.mode)?.label || this.mode}`;
    this._button.disabled = this.disabled || !supported || this.picking;
    this._button.setAttribute('aria-pressed', String(this.picking));
    this._button.setAttribute('aria-busy', String(this.picking));
    this._button.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') || defaultLabel,
    );
    this._button.tabIndex = this.hasAttribute('tabindex') ? this.tabIndex : 0;
    this._button.title = !supported
      ? this._unavailableMessage()
      : this.getAttribute('title') ||
        (this.picking ? 'Press Escape to cancel' : defaultLabel);
    this._status.textContent = !supported
      ? this._unavailableMessage()
      : this._message ||
        (this.color ? `Selected ${this.color}.` : 'No color selected.');
  }

  private readonly _onClick = (event: MouseEvent): void => {
    this._activationPoint =
      event.detail > 0 ? { x: event.clientX, y: event.clientY } : undefined;
    void this.open();
    this._activationPoint = undefined;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-color-eyedropper': DskColorEyedropper;
  }
}
