import {
  type CurveNumber,
  type CurvePoints,
  type CurvePreset,
  type CurveValue,
  type CurvePath,
  type CurveSegment,
  type CurvePoint,
  CURVE_PRESETS,
  cleanCoordinate,
  curveNumber,
  curvePreset,
  parseCurvePath,
  normalizeCurvePath,
  formatCurvePath,
  curvePathPoints,
  hasDefaultEndpoints,
  closestCurvePoint,
  splitCurvePath,
  moveCurvePoint,
  removeCurvePoint,
  sampleCurvePath,
  curvePathCss,
  snapCoordinate,
} from './helpers/curve-model.ts';

type Coordinate = number;

interface CurveDrag {
  pointerId: number;
  index: number;
  start: CurvePath;
  offsetX: number;
  offsetY: number;
}

interface CurveDraft {
  index: Coordinate;
  start: CurvePath;
}

const presetLabels: Record<CurvePreset | 'custom', string> = {
  linear: 'Linear',
  ease: 'Ease',
  'ease-in': 'Ease in',
  'ease-out': 'Ease out',
  'ease-in-out': 'Ease in out',
  custom: 'Custom',
};

/** A bounded cubic Bezier editor with precise coordinates and motion preview. */
export class DskCurve extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'step',
    'duration',
    'width',
    'color',
    'grid',
    'disabled',
    'readonly',
    'aria-label',
  ];

  private readonly _container: HTMLDivElement;
  private readonly _graphContainer: HTMLDivElement;
  private readonly _graph: SVGSVGElement;
  private readonly _grid: SVGPathElement;
  private readonly _curve: SVGPathElement;
  private readonly _guides: SVGPathElement;
  private readonly _diagonal: SVGPathElement;
  private readonly _axes: SVGTextElement[];
  private readonly _handles: HTMLButtonElement[];
  private readonly _coordinates: HTMLInputElement[];
  private readonly _pointFields: HTMLDivElement;
  private readonly _addButton: HTMLButtonElement;
  private readonly _removeButton: HTMLButtonElement;
  private _activePoint = 0;
  private readonly _presets: HTMLButtonElement[];
  private readonly _name: HTMLSpanElement;
  private readonly _output: HTMLElement;
  private readonly _preview: HTMLDivElement;
  private readonly _dot: HTMLDivElement;
  private readonly _playButton: HTMLButtonElement;
  private readonly _durationLabel: HTMLSpanElement;
  private readonly _sizeStyle: HTMLStyleElement;
  private readonly _internals: ElementInternals;
  private _listeners: AbortController | undefined;
  private _observer: ResizeObserver | undefined;
  private _drag: CurveDrag | undefined;
  private _draft: CurveDraft | undefined;
  private _writing = false;
  private _revision = 0;
  private _frame = 0;
  private _size = 0;
  private _inset = 28;
  private _span = 1;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.role = 'group';
    this._internals.ariaLabel = 'Motion curve';
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: inline-block; max-width: 100%; vertical-align: top; }
        :host([hidden]) { display: none !important; }
        [part="container"] {
          --active: var(--dsk-curve-color, #557be8);
          --surface: var(--dsk-curve-background, #fff);
          --text: var(--dsk-curve-text-color, #263247);
          --muted: var(--dsk-curve-muted-color, #758197);
          --border: var(--dsk-curve-border-color, #e1e6ee);
          box-sizing: border-box; width: 100%; padding: 18px;
          color: var(--text); background: var(--surface);
          border: 1px solid var(--border); border-radius: 14px;
          font: 12px/1.45 system-ui, sans-serif; container-type: inline-size;
        }
        button, input { box-sizing: border-box; font: inherit; }
        button { color: inherit; cursor: pointer; }
        button:disabled { cursor: not-allowed; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid var(--active); outline-offset: 3px;
        }
        [part="heading"] { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
        [part="heading"] strong { font-size: 13px; font-weight: 600; }
        [part="heading"] span { color: var(--muted); font-size: 11px; }
        [part="presets"] { display: flex; gap: 5px; flex-wrap: wrap; }
        [part="preset"] { flex: 1; min-width: 40px; white-space: nowrap; padding: 6px 5px; border: 1px solid var(--border); border-radius: 6px; background: transparent; font-size: 11px; }
        [part="preset"][aria-pressed="true"] { color: var(--active); border-color: color-mix(in srgb, var(--active) 38%, transparent); background: color-mix(in srgb, var(--active) 9%, transparent); }
        [part="graph-container"] { position: relative; width: 100%; aspect-ratio: 1; margin: 12px 0; touch-action: none; }
        [part="graph"] { position: absolute; inset: 0; display: block; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
        [part="grid"] { fill: none; stroke: var(--dsk-curve-grid-color, #edf0f5); stroke-width: 1; }
        [part="diagonal"] { fill: none; stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 4; }
        [part="guide"] { fill: none; stroke: var(--active); stroke-width: 1; opacity: .4; }
        [part="curve"] { fill: none; stroke: var(--active); stroke-width: 2.5; stroke-linecap: round; }
        [part="axis"] { fill: var(--muted); font: 10px system-ui, sans-serif; text-anchor: middle; }
        [part~="handle"] {
          position: absolute; width: 32px; height: 32px; padding: 0; margin: 0;
          border: 0; border-radius: 50%; background: transparent;
          transform: translate(-50%, -50%); cursor: grab; touch-action: none;
        }
        [part~="handle"]::after {
          content: ''; position: absolute; left: 50%; top: 50%; width: 13px; height: 13px;
          transform: translate(-50%, -50%); box-sizing: border-box;
          border: 2px solid var(--surface); border-radius: 50%; background: var(--active);
          box-shadow: 0 0 0 1px var(--active);
        }
        [data-handle="1"]::after { background: var(--surface); border-color: var(--active); box-shadow: none; }
        [part~="handle"]:active { cursor: grabbing; }
        [part~="handle"][aria-disabled="true"] { cursor: default; }
        [part~="handle"]:disabled { cursor: not-allowed; }
        [part~="handle"][data-kind="node"]::after { border-radius: 3px; background: var(--surface); border-color: var(--active); }
        [part~="handle"][part~="endpoint"]::after { border-radius: 3px; }
        [part~="handle"][aria-pressed="true"]::after { box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--active); }
        .dsk-curve-tools { display: flex; gap: 8px; margin-bottom: 12px; }
        .dsk-curve-tools button { padding: 5px 8px; background: transparent; border: 1px solid var(--border); border-radius: 6px; font-size: 11px; }
        .dsk-curve-hint { color: var(--muted); font-size: 11px; margin: 8px 0; }
        .dsk-curve-points[data-multiple] { grid-template-columns: 1fr; }
        .dsk-curve-points { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dsk-curve-point-name { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; font-weight: 500; }
        .dsk-curve-point-name::before { content: ''; width: 6px; height: 6px; border: 1.5px solid var(--active); border-radius: 50%; background: var(--active); }
        .dsk-curve-point:nth-child(2) .dsk-curve-point-name::before { background: transparent; }
        .dsk-curve-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        label { display: flex; align-items: center; gap: 5px; padding: 6px 8px; min-width: 0; border: 1px solid var(--border); border-radius: 6px; }
        label span { color: var(--muted); font-size: 10px; }
        [part="coordinate"] { width: 100%; min-width: 0; padding: 0; color: var(--text); border: 0; background: transparent; font-variant-numeric: tabular-nums; appearance: textfield; }
        [part="coordinate"]::-webkit-inner-spin-button, [part="coordinate"]::-webkit-outer-spin-button { appearance: none; margin: 0; }
        [part="preview"] { position: relative; height: 28px; margin-top: 20px; }
        [part="preview"]::before { content: ''; position: absolute; top: 13px; left: 10px; right: 10px; height: 1px; background: var(--border); }
        [part="motion-dot"] { position: absolute; left: 0; top: 4px; width: 20px; height: 20px; border-radius: 5px; background: var(--active); }
        .dsk-curve-preview-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 7px; color: var(--muted); font-size: 11px; }
        [part="play"] { padding: 4px 0; border: 0; background: transparent; color: var(--muted); }
        [part="play"]:hover { color: var(--active); }
        [part="value"] { display: block; margin-top: 13px; padding-top: 13px; border-top: 1px solid var(--border); color: var(--muted); font: 10px/1.5 ui-monospace, monospace; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
        :host([disabled]) [part="container"] { opacity: .55; }
        @container (max-width: 260px) { .dsk-curve-points { grid-template-columns: 1fr; gap: 12px; } }
      </style>
      <style id="size"></style>
      <div part="container">
        <div part="heading"><strong>Motion curve</strong><span id="name"></span></div>
        <div part="presets" role="group" aria-label="Curve presets">
          <button type="button" part="preset" data-preset="linear">Linear</button>
          <button type="button" part="preset" data-preset="ease">Ease</button>
          <button type="button" part="preset" data-preset="ease-in" aria-label="Ease in">In</button>
          <button type="button" part="preset" data-preset="ease-out" aria-label="Ease out">Out</button>
          <button type="button" part="preset" data-preset="ease-in-out" aria-label="Ease in out">In out</button>
        </div>
        <div part="graph-container">
          <svg part="graph" aria-hidden="true">
            <path part="grid"></path><path part="diagonal"></path><path part="guide"></path><path part="curve"></path>

            <text part="axis">0</text><text part="axis">1</text><text part="axis">1</text>
            <text part="axis">Time</text><text part="axis">Progress</text>
          </svg>
          <button type="button" part="handle handle-one" data-handle="0" aria-label="Point 1" aria-describedby="keyboard-help"></button>
          <button type="button" part="handle handle-two" data-handle="1" aria-label="Point 2" aria-describedby="keyboard-help"></button>
        </div>
        <span id="keyboard-help" hidden>Use arrow keys to move the point. Hold Shift for larger steps. Home and End set X to its limits; Shift with Home or End sets Y. Delete removes an added node. Escape cancels dragging.</span>
        <p class="dsk-curve-hint">Click the curve to add a point. Select and drag a point to edit.</p>
        <div class="dsk-curve-tools"><button type="button" part="add">Add point</button><button type="button" part="remove">Remove point</button></div>
        <div class="dsk-curve-points">
          ${[0, 1].map((point) => `<div class="dsk-curve-point"><div class="dsk-curve-point-name">Point ${point + 1}</div><div class="dsk-curve-fields">${['X', 'Y'].map((axis, index) => `<label><span>${axis}</span><input part="coordinate" data-coordinate="${point * 2 + index}" aria-label="Point ${point + 1} ${axis}" type="number" min="0" max="1" inputmode="decimal"></label>`).join('')}</div></div>`).join('')}
        </div>
        <div part="preview" aria-hidden="true"><div part="motion-dot"></div></div>
        <div class="dsk-curve-preview-controls"><button type="button" part="play" aria-pressed="false">Play preview</button><span id="duration"></span></div>
        <code part="value"></code>
      </div>
    `;
    this._container = this._element('[part="container"]', HTMLDivElement);
    this._graphContainer = this._element(
      '[part="graph-container"]',
      HTMLDivElement,
    );
    this._graph = this._element('[part="graph"]', SVGSVGElement);
    this._grid = this._element('[part="grid"]', SVGPathElement);
    this._curve = this._element('[part="curve"]', SVGPathElement);
    this._guides = this._element('[part="guide"]', SVGPathElement);
    this._diagonal = this._element('[part="diagonal"]', SVGPathElement);
    this._axes = Array.from(root.querySelectorAll('text'));
    this._handles = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-handle]'),
    );
    this._coordinates = Array.from(root.querySelectorAll('input'));
    this._pointFields = this._element('.dsk-curve-points', HTMLDivElement);
    this._addButton = this._element('[part="add"]', HTMLButtonElement);
    this._removeButton = this._element('[part="remove"]', HTMLButtonElement);
    this._presets = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-preset]'),
    );
    this._name = this._element('#name', HTMLSpanElement);
    this._output = this._element('[part="value"]', HTMLElement);
    this._preview = this._element('[part="preview"]', HTMLDivElement);
    this._dot = this._element('[part="motion-dot"]', HTMLDivElement);
    this._playButton = this._element('[part="play"]', HTMLButtonElement);
    this._durationLabel = this._element('#duration', HTMLSpanElement);
    this._sizeStyle = this._element('#size', HTMLStyleElement);
    this._render();
  }

  private _element<T extends Element>(selector: string, type: new () => T): T {
    const element = this.shadowRoot?.querySelector(selector);
    if (!(element instanceof type))
      throw new Error(`Missing curve element: ${selector}`);
    return element;
  }

  connectedCallback(): void {
    for (const property of [
      'value',
      'points',
      'segments',
      'start',
      'end',
      'activePoint',
      'step',
      'duration',
      'width',
      'color',
      'grid',
      'disabled',
      'readOnly',
    ]) {
      if (Object.hasOwn(this, property)) {
        const value: unknown = Reflect.get(this, property);
        Reflect.deleteProperty(this, property);
        Reflect.set(this, property, value);
      }
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._graphContainer.addEventListener(
      'pointerdown',
      this._onPointerDown,
      options,
    );
    this._graphContainer.addEventListener(
      'pointermove',
      this._onPointerMove,
      options,
    );
    this._graphContainer.addEventListener(
      'pointerup',
      this._onPointerUp,
      options,
    );
    this._graphContainer.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      options,
    );
    this._graphContainer.addEventListener(
      'lostpointercapture',
      this._onPointerCancel,
      options,
    );
    this._container.addEventListener('keydown', this._onKeyDown, options);
    this._container.addEventListener('focusout', this._onFocusOut, options);
    this._pointFields.addEventListener(
      'input',
      this._onCoordinateInput,
      options,
    );
    this._pointFields.addEventListener(
      'change',
      this._onCoordinateChange,
      options,
    );
    this._graphContainer.addEventListener(
      'focusin',
      this._onPointFocus,
      options,
    );
    this._addButton.addEventListener('click', this._onAddPoint, options);
    this._removeButton.addEventListener('click', this._onRemovePoint, options);
    for (const button of this._presets)
      button.addEventListener('click', this._onPreset, options);
    this._playButton.addEventListener('click', this._onPlay, options);
    window.addEventListener('blur', this._onWindowBlur, options);
    document.addEventListener(
      'visibilitychange',
      this._onVisibilityChange,
      options,
    );
    this._observer?.disconnect();
    this._observer = new ResizeObserver(this._layout);
    this._observer.observe(this._graphContainer);
    this._render();
  }

  disconnectedCallback(): void {
    this._revision += 1;
    this._cancelDrag(false);
    this._cancelDraft(false);
    this.stop();
    this._listeners?.abort();
    this._listeners = undefined;
    this._observer?.disconnect();
    this._observer = undefined;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (this._writing || oldValue === newValue) return;
    if (name === 'value') {
      this._revision += 1;
      this._releaseDrag();
      this._draft = undefined;
    } else if (name === 'disabled' || name === 'readonly') {
      this._revision += 1;
      this._cancelDrag(false);
      this._cancelDraft(false);
    }
    this.stop();
    this._render();
  }

  get value(): string {
    return formatCurvePath(this.segments);
  }
  set value(value: CurveValue) {
    if (value == null) this.removeAttribute('value');
    else this.setAttribute('value', formatCurvePath(parseCurvePath(value)));
  }
  get points(): CurvePoints {
    const path = this.segments;
    const first = path[0]!;
    const last = path.at(-1)!;
    return [first[0], first[1], last[2], last[3]];
  }
  set points(value: readonly [number, number, number, number]) {
    this.value = value;
  }
  get preset(): CurvePreset | 'custom' {
    return this.segments.length === 1 && hasDefaultEndpoints(this.segments)
      ? curvePreset(this.points)
      : 'custom';
  }
  get cssValue(): string {
    return curvePathCss(this.segments);
  }
  get segments(): CurvePath {
    return parseCurvePath(this.getAttribute('value'));
  }
  set segments(
    value: readonly Readonly<CurveSegment>[] & {
      readonly start?: readonly [number, number];
    },
  ) {
    this.value = formatCurvePath(normalizeCurvePath(value));
  }
  get start(): [number, number] {
    return [...(this.segments.start ?? [0, 0])];
  }
  set start(value: readonly [number, number]) {
    const path = this.segments;
    this.value = formatCurvePath(
      moveCurvePoint(path, path.length * 3 - 1, value[0], value[1]),
    );
  }
  get end(): [number, number] {
    const last = this.segments.at(-1)!;
    return [last[4], last[5]];
  }
  set end(value: readonly [number, number]) {
    const path = this.segments;
    this.value = formatCurvePath(
      moveCurvePoint(path, path.length * 3, value[0], value[1]),
    );
  }
  get nodes(): CurvePoint[] {
    return curvePathPoints(this.segments).filter(
      (point) => point.kind === 'node',
    );
  }
  get activePoint(): number {
    return this._activePoint;
  }
  set activePoint(value: number) {
    this._activePoint = Math.max(
      0,
      Math.min(
        this._handles.length - 1,
        Math.trunc(Number.isFinite(value) ? value : 0),
      ),
    );
    this._render();
  }
  get step(): number {
    return this._positiveNumber('step', 0.01);
  }
  set step(value: CurveNumber) {
    this._setNumber('step', value);
  }
  get duration(): number {
    return this._positiveNumber('duration', 1200);
  }
  set duration(value: CurveNumber) {
    this._setNumber('duration', value);
  }
  get width(): number {
    return this._positiveNumber('width', 370);
  }
  set width(value: CurveNumber) {
    this._setNumber('width', value);
  }
  get color(): string {
    const value = this.getAttribute('color')?.trim();
    return value && CSS.supports('color', value) ? value : '#557be8';
  }
  set color(value: string | null | undefined) {
    if (value == null) this.removeAttribute('color');
    else this.setAttribute('color', value);
  }
  get grid(): boolean {
    return this.getAttribute('grid') !== 'false';
  }
  set grid(value: boolean) {
    if (value) this.removeAttribute('grid');
    else this.setAttribute('grid', 'false');
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('readonly', value);
  }

  override focus(options?: FocusOptions): void {
    this._handles[this._activePoint]?.focus(options);
  }
  override blur(): void {
    const active = this.shadowRoot?.activeElement;
    if (active instanceof HTMLElement) active.blur();
    super.blur();
  }

  play(): void {
    this.stop();
    if (this.disabled || !this.isConnected) return;
    const travel = Math.max(
      0,
      this._preview.clientWidth - this._dot.offsetWidth,
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._dot.style.transform = `translateX(${this.end[1] * travel}px)`;
      this._playButton.textContent = 'Replay preview';
      return;
    }
    const path = this.segments;
    const duration = this.duration;
    const start = performance.now();
    this._playButton.setAttribute('aria-pressed', 'true');
    this._playButton.textContent = 'Stop preview';
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      this._dot.style.transform = `translateX(${sampleCurvePath(path, progress) * travel}px)`;
      if (progress < 1) this._frame = requestAnimationFrame(tick);
      else {
        this._frame = 0;
        this._playButton.setAttribute('aria-pressed', 'false');
        this._playButton.textContent = 'Replay preview';
      }
    };
    this._frame = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    const travel = Math.max(
      0,
      this._preview.clientWidth - this._dot.offsetWidth,
    );
    this._dot.style.transform = `translateX(${this.start[1] * travel}px)`;
    this._playButton.setAttribute('aria-pressed', 'false');
    this._playButton.textContent = 'Play preview';
  }

  private _positiveNumber(name: string, fallback: number): number {
    const value = curveNumber(this.getAttribute(name), fallback);
    return value > 0 ? value : fallback;
  }

  private _setNumber(name: string, value: CurveNumber): void {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }

  private get _editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  private _syncPointEditors(points: CurvePoint[]): void {
    this._activePoint = Math.min(this._activePoint, points.length - 1);
    if (this._handles.length !== points.length) {
      for (const handle of this._handles) handle.remove();
      this._handles.length = 0;
      this._coordinates.length = 0;
      this._pointFields.replaceChildren();
      for (const [index, point] of points.entries()) {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.setAttribute(
          'part',
          index === 0
            ? 'handle handle-one'
            : index === points.length - 3
              ? 'handle handle-two'
              : point.kind === 'start' || point.kind === 'end'
                ? 'handle endpoint'
                : 'handle',
        );
        handle.dataset.handle = String(index);
        handle.dataset.kind = point.kind;
        handle.setAttribute('aria-describedby', 'keyboard-help');
        this._graphContainer.append(handle);
        this._handles.push(handle);
        const row = document.createElement('div');
        row.className = 'dsk-curve-point';
        const name = document.createElement('div');
        name.className = 'dsk-curve-point-name';
        name.textContent = this._pointLabel(index, points);
        const fields = document.createElement('div');
        fields.className = 'dsk-curve-fields';
        for (const [axisIndex, axis] of ['X', 'Y'].entries()) {
          const label = document.createElement('label');
          const caption = document.createElement('span');
          caption.textContent = axis;
          const field = document.createElement('input');
          field.type = 'number';
          field.min = '0';
          field.max = '1';
          field.inputMode = 'decimal';
          field.setAttribute('part', 'coordinate');
          field.dataset.coordinate = String(index * 2 + axisIndex);
          field.setAttribute(
            'aria-label',
            `${this._pointLabel(index, points)} ${axis}`,
          );
          this._coordinates.push(field);
          label.append(caption, field);
          fields.append(label);
        }
        row.append(name, fields);
        this._pointFields.append(row);
      }
    }
    this._pointFields.toggleAttribute(
      'data-multiple',
      points.length > 4 || this._activePoint >= points.length - 2,
    );
    for (const [index, row] of Array.from(
      this._pointFields.children,
    ).entries()) {
      if (row instanceof HTMLElement)
        row.hidden =
          points.length > 4 || this._activePoint >= points.length - 2
            ? index !== this._activePoint
            : index >= points.length - 2;
    }
  }

  private _pointLabel(index: number, points: CurvePoint[]): string {
    if (points[index]?.kind === 'start') return 'Start point';
    if (points[index]?.kind === 'end') return 'End point';
    if (points.length === 4) return `Point ${index + 1}`;
    return points[index]?.kind === 'node'
      ? `Node ${Math.floor(index / 3) + 1}`
      : `Control ${Math.floor(index / 3) * 2 + (index % 3) + 1}`;
  }

  private _render(): void {
    this._sizeStyle.textContent = `:host { width: var(--dsk-curve-width, ${this.width}px); }`;
    if (this.hasAttribute('color'))
      this._container.style.setProperty('--active', this.color);
    else this._container.style.removeProperty('--active');
    this._internals.ariaLabel =
      this.getAttribute('aria-label') || 'Motion curve';
    this._internals.ariaDisabled = String(this.disabled);
    this._internals.ariaReadOnly = String(this.readOnly);
    const points = curvePathPoints(this.segments);
    this._syncPointEditors(points);
    const preset = this.preset;
    this._name.textContent = presetLabels[preset];
    this._output.textContent = this.value;
    this._durationLabel.textContent = `${Number((this.duration / 1000).toFixed(3))} s`;
    this._playButton.disabled = this.disabled;
    this._addButton.disabled = !this._editable || this.segments.length >= 512;
    this._removeButton.disabled =
      !this._editable || points[this._activePoint]?.kind !== 'node';
    for (const button of this._presets) {
      button.disabled = !this._editable;
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.preset === preset),
      );
    }
    for (const [index, field] of this._coordinates.entries()) {
      if (this._draft?.index !== index)
        field.value = String(
          index % 2 === 0
            ? points[Math.floor(index / 2)]?.x
            : points[Math.floor(index / 2)]?.y,
        );
      field.step = String(this.step);
      field.disabled = this.disabled;
      field.readOnly = this.readOnly;
    }
    for (const [index, button] of this._handles.entries()) {
      button.disabled = this.disabled;
      button.setAttribute('aria-disabled', String(!this._editable));
      button.setAttribute('aria-pressed', String(index === this._activePoint));
      button.dataset.kind = points[index]?.kind ?? 'control';
      button.setAttribute(
        'aria-label',
        `${this._pointLabel(index, points)}, X ${points[index]?.x}, Y ${points[index]?.y}`,
      );
    }
    this._grid.style.display = this.grid ? '' : 'none';
    this._layout();
  }

  private readonly _layout = (): void => {
    const size = this._graphContainer.clientWidth;
    if (!size) return;
    if (size !== this._size) this.stop();
    this._size = size;
    this._inset = Math.min(28, size / 4);
    this._span = size - 2 * this._inset;
    const inset = this._inset;
    const end = size - inset;
    const center = size / 2;
    this._graph.setAttribute('viewBox', `0 0 ${size} ${size}`);
    let grid = '';
    for (let index = 0; index <= 4; index += 1) {
      const position = inset + (this._span * index) / 4;
      grid += `M ${position} ${inset} V ${end} M ${inset} ${position} H ${end} `;
    }
    this._grid.setAttribute('d', grid);
    const path = this.segments;
    const position = (x: number, y: number): string =>
      `${inset + x * this._span} ${end - y * this._span}`;
    this._curve.setAttribute(
      'd',
      `M ${position(path.start?.[0] ?? 0, path.start?.[1] ?? 0)} ` +
        path
          .map(
            (segment) =>
              `C ${position(segment[0], segment[1])} ${position(segment[2], segment[3])} ${position(segment[4], segment[5])}`,
          )
          .join(' '),
    );
    this._guides.setAttribute(
      'd',
      path
        .map(
          (segment, index) =>
            `M ${position(path[index - 1]?.[4] ?? path.start?.[0] ?? 0, path[index - 1]?.[5] ?? path.start?.[1] ?? 0)} L ${position(segment[0], segment[1])} M ${position(segment[4], segment[5])} L ${position(segment[2], segment[3])}`,
        )
        .join(' '),
    );
    this._diagonal.setAttribute('d', `M ${inset} ${end} L ${end} ${inset}`);
    for (const [index, point] of curvePathPoints(path).entries()) {
      const button = this._handles[index];
      if (button) {
        button.style.left = `${inset + point.x * this._span}px`;
        button.style.top = `${end - point.y * this._span}px`;
      }
    }
    for (const [index, point] of [
      [inset - 11, end + 15],
      [end, end + 15],
      [inset - 11, inset + 3],
      [center, end + 23],
      [10, center],
    ].entries()) {
      const label = this._axes[index];
      label?.setAttribute('x', String(point[0]));
      label?.setAttribute('y', String(point[1]));
      if (index === 4)
        label?.setAttribute('transform', `rotate(-90 10 ${center})`);
    }
  };

  private _setUserPath(path: CurvePath): boolean {
    const value = formatCurvePath(path);
    if (value === this.value) return false;
    this._writing = true;
    try {
      this.setAttribute('value', value);
    } finally {
      this._writing = false;
    }
    this.stop();
    this._render();
    return true;
  }

  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private _canCommit(revision: number, value: string): boolean {
    return (
      this.isConnected &&
      this._editable &&
      this._revision === revision &&
      this.value === value
    );
  }

  private _commitPoints(points: CurvePoints): void {
    this._commitPath([[...points, 1, 1]]);
  }

  private _commitPath(path: CurvePath): void {
    if (!this._setUserPath(path)) return;
    const revision = this._revision;
    const value = this.value;
    this._emit('input');
    if (this._canCommit(revision, value)) this._emit('change');
  }

  private _pointer(event: PointerEvent): { x: number; y: number } {
    const rect = this._graphContainer.getBoundingClientRect();
    return {
      x:
        (((event.clientX - rect.left) * this._size) / rect.width -
          this._inset) /
        this._span,
      y:
        1 -
        (((event.clientY - rect.top) * this._size) / rect.height -
          this._inset) /
          this._span,
    };
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (!this._editable || this._drag || !event.isPrimary || event.button !== 0)
      return;
    let target =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-handle]')
        : null;
    this._commitDraft();
    if (!this._editable || !this.isConnected) return;
    const start = this.segments;
    let inserted = false;
    if (!target) {
      const pointer = this._pointer(event);
      const closest = closestCurvePoint(start, pointer.x, pointer.y);
      const scale =
        this._graphContainer.getBoundingClientRect().width / this._size;
      if (closest.distance * this._span * scale > 8) return;
      const path = splitCurvePath(start, closest.segment, closest.time);
      if (path.length === start.length) return;
      this._activePoint = closest.segment * 3 + 2;
      this._setUserPath(path);
      target = this._handles[this._activePoint] ?? null;
      inserted = true;
    }
    if (!target || !target.isConnected) return;
    event.preventDefault();
    this.activePoint = Number(target.dataset.handle);
    target.focus({ preventScroll: true });
    if (
      !this._editable ||
      !this.isConnected ||
      this.shadowRoot?.activeElement !== target
    )
      return;
    const index = Number(target.dataset.handle);
    const point = curvePathPoints(this.segments)[index];
    if (!point) return;
    const pointer = this._pointer(event);
    this._drag = {
      pointerId: event.pointerId,
      index,
      start,
      offsetX: pointer.x - point.x,
      offsetY: pointer.y - point.y,
    };
    this._graphContainer.setPointerCapture(event.pointerId);
    if (inserted) this._emit('input');
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const pointer = this._pointer(event);
    const path = this.segments;
    const point = curvePathPoints(path)[drag.index];
    if (!point) return;
    const x = pointer.x - drag.offsetX;
    const y = pointer.y - drag.offsetY;
    if (Math.abs(x - point.x) < 1e-9 && Math.abs(y - point.y) < 1e-9) return;
    if (
      this._setUserPath(
        moveCurvePoint(
          path,
          drag.index,
          snapCoordinate(x, this.step),
          snapCoordinate(y, this.step),
        ),
      )
    )
      this._emit('input');
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (!this._drag || event.pointerId !== this._drag.pointerId) return;
    this._onPointerMove(event);
    const drag = this._releaseDrag();
    if (drag && formatCurvePath(drag.start) !== this.value)
      this._emit('change');
  };

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this._drag?.pointerId) this._cancelDrag(true);
  };

  private _releaseDrag(): CurveDrag | undefined {
    const drag = this._drag;
    this._drag = undefined;
    if (drag && this._graphContainer.hasPointerCapture(drag.pointerId))
      this._graphContainer.releasePointerCapture(drag.pointerId);
    return drag;
  }

  private _cancelDrag(emit: boolean): void {
    const drag = this._releaseDrag();
    if (drag && this._setUserPath(drag.start) && emit) this._emit('input');
  }

  private _coordinateIndex(target: EventTarget | null): Coordinate | undefined {
    if (!(target instanceof HTMLInputElement)) return undefined;
    const index = this._coordinates.indexOf(target);
    return index >= 0 ? index : undefined;
  }

  private readonly _onCoordinateInput = (event: Event): void => {
    event.stopPropagation();
    const index = this._coordinateIndex(event.target);
    if (index === undefined || !this._editable) return;
    if (this._draft?.index !== index) {
      this._commitDraft();
      this._draft = { index, start: this.segments };
    }
    const value = this._coordinates[index]?.valueAsNumber;
    if (value === undefined || !Number.isFinite(value)) return;
    if (this._setUserPath(this._withCoordinate(index, value)))
      this._emit('input');
  };

  private readonly _onCoordinateChange = (event: Event): void => {
    event.stopPropagation();
    this._commitDraft();
  };

  private _commitDraft(): void {
    const draft = this._draft;
    if (!draft) return;
    const value = this._coordinates[draft.index]?.valueAsNumber;
    if (value === undefined || !Number.isFinite(value)) {
      this._cancelDraft(true);
      return;
    }
    this._draft = undefined;
    const changed = this._setUserPath(this._withCoordinate(draft.index, value));
    this._render();
    const revision = this._revision;
    const committed = this.value;
    if (changed) this._emit('input');
    if (
      formatCurvePath(draft.start) !== committed &&
      this._canCommit(revision, committed)
    )
      this._emit('change');
  }

  private _cancelDraft(emit: boolean): void {
    const draft = this._draft;
    this._draft = undefined;
    if (draft && this._setUserPath(draft.start) && emit) this._emit('input');
    this._render();
  }

  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && (this._drag || this._draft)) {
      event.preventDefault();
      this._cancelDrag(true);
      this._cancelDraft(true);
      return;
    }
    if (this._coordinateIndex(event.target) !== undefined) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this._commitDraft();
      }
      return;
    }
    const target = event.target;
    if (
      !(target instanceof HTMLButtonElement) ||
      !target.hasAttribute('data-handle') ||
      !this._editable ||
      this._drag ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const index = Number(target.dataset.handle);
    const path = this.segments;
    const point = curvePathPoints(path)[index];
    if (!point) return;
    let { x, y } = point;
    const step = this.step * (event.shiftKey ? 10 : 1);
    switch (event.key) {
      case 'ArrowLeft':
        x -= step;
        break;
      case 'ArrowRight':
        x += step;
        break;
      case 'ArrowDown':
        y -= step;
        break;
      case 'ArrowUp':
        y += step;
        break;
      case 'Home':
        if (event.shiftKey) y = 0;
        else x = 0;
        break;
      case 'End':
        if (event.shiftKey) y = 1;
        else x = 1;
        break;
      case 'Delete':
      case 'Backspace':
        if (point.kind !== 'node') return;
        event.preventDefault();
        this._onRemovePoint();
        return;
      default:
        return;
    }
    event.preventDefault();
    this._commitPath(moveCurvePoint(path, index, x, y));
  };

  private _withCoordinate(index: number, value: number): CurvePath {
    const path = this.segments;
    const pointIndex = Math.floor(index / 2);
    const point = curvePathPoints(path)[pointIndex];
    return point
      ? moveCurvePoint(
          path,
          pointIndex,
          index % 2 === 0 ? cleanCoordinate(value) : point.x,
          index % 2 === 1 ? cleanCoordinate(value) : point.y,
        )
      : path;
  }

  private readonly _onPointFocus = (event: FocusEvent): void => {
    if (
      event.target instanceof HTMLButtonElement &&
      event.target.hasAttribute('data-handle')
    )
      this.activePoint = Number(event.target.dataset.handle);
  };

  private readonly _onAddPoint = (): void => {
    this._commitDraft();
    if (!this._editable || !this.isConnected) return;
    const path = this.segments;
    let index = 0;
    for (let i = 1; i < path.length; i++)
      if (
        path[i]![4] - path[i - 1]![4] >
        path[index]![4] - (path[index - 1]?.[4] ?? path.start?.[0] ?? 0)
      )
        index = i;
    const next = splitCurvePath(path, index, 0.5);
    if (next.length === path.length) return;
    this._activePoint = index * 3 + 2;
    this._commitPath(next);
    if (this._editable) this.focus({ preventScroll: true });
  };

  private readonly _onRemovePoint = (): void => {
    this._commitDraft();
    if (!this._editable || !this.isConnected) return;
    const next = removeCurvePoint(this.segments, this._activePoint);
    this._commitPath(next);
    if (this._editable) this.focus({ preventScroll: true });
  };

  private readonly _onPreset = (event: Event): void => {
    if (!this._editable || !(event.currentTarget instanceof HTMLButtonElement))
      return;
    const preset = event.currentTarget.dataset.preset;
    if (!preset || !Object.hasOwn(CURVE_PRESETS, preset)) return;
    this._commitDraft();
    if (!this._editable || !this.isConnected) return;
    this._commitPoints(CURVE_PRESETS[preset as CurvePreset]);
  };

  private readonly _onFocusOut = (event: FocusEvent): void => {
    if (this._coordinateIndex(event.target) !== undefined) this._commitDraft();
    if (
      (event.target instanceof HTMLButtonElement &&
        event.target.hasAttribute('data-handle')) ||
      !(event.relatedTarget instanceof Node) ||
      !this._container.contains(event.relatedTarget)
    )
      this._cancelDrag(true);
  };

  private readonly _onWindowBlur = (): void => {
    this._cancelDrag(true);
    this._commitDraft();
    this.stop();
  };
  private readonly _onVisibilityChange = (): void => {
    if (document.hidden) this._onWindowBlur();
  };
  private readonly _onPlay = (): void => {
    if (this._frame) this.stop();
    else this.play();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-curve': DskCurve;
  }
}
