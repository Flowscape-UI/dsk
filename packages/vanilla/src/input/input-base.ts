import { DskHistory } from '../helpers/history.ts';
import inputHandleSvg from '../../assets/icons/input-handle.svg?raw';
import horizontalResizeSvg from '../../assets/cursor/horizontal-resize.svg?raw';
import {
  clampNumber,
  dragSteps,
  getOptions,
  parseNumber,
  stepValue,
} from './helpers/numbers.ts';
import type {
  NumericOptions,
  NumericValue,
  Progression,
} from './helpers/numbers.ts';

export type InputPositioning = 'left' | 'center' | 'right';
export type InputTagPosition = 'left' | 'right';

interface DragState {
  pointerId: number;
  pointerType: string;
  lastX: number;
  distance: number;
  previousCount: number;
  previousDistance: number;
  locked: boolean;
  cursorX: number;
  cursorY: number;
  startValue: number;
  initialText: string;
  anchorText: string;
}

interface PendingPointerLock {
  drag: DragState;
}

const upgradableProperties = [
  'min',
  'max',
  'step',
  'selectOnFocus',
  'loopAfterMin',
  'loopAfter',
  'loopAfterMax',
  'keyHorizontalStep',
  'keyVerticalStep',
  'progression',
  'positioning',
  'tag',
  'tagPosition',
  'tagGap',
  'placeholder',
  'src',
  'disabled',
  'readOnly',
  'name',
  'value',
  'valueAsNumber',
] as const;

type ReflectedStringProperty =
  | 'min'
  | 'max'
  | 'step'
  | 'key-horizontal-step'
  | 'key-vertical-step'
  | 'progression'
  | 'positioning'
  | 'tag'
  | 'tag-position'
  | 'tag-gap'
  | 'placeholder'
  | 'src'
  | 'name';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      width: var(--dsk-input-width, 214px);
      height: var(--dsk-input-height, 30px);
      font: inherit;
      vertical-align: middle;
      color: var(--dsk-input-color, #151922);
    }
    :host([hidden]) { display: none; }
    .dsk-input-container {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border: var(--dsk-input-border, 1px solid #a6afbf);
      border-radius: var(--dsk-input-border-radius, 8px);
      background: var(--dsk-input-background, #f5f6f8);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .dsk-input-container:focus-within {
      border-color: var(--dsk-input-focus-color, #557be8);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsk-input-focus-color, #557be8) 18%, transparent);
    }
    .dsk-input-handle {
      box-sizing: border-box;
      display: flex;
      flex: 0 0 var(--dsk-input-handle-width, 30px);
      align-items: center;
      justify-content: center;
      cursor: ew-resize;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .dsk-input-handle:hover { background: color-mix(in srgb, currentColor 6%, transparent); }
    .dsk-input-icon-wrapper { display: flex; width: 15px; height: 15px; pointer-events: none; }
    .dsk-input-image, .dsk-input-icon { width: 15px; height: 15px; pointer-events: none; }
    .dsk-input-image { object-fit: contain; }
    [hidden] { display: none !important; }
    .dsk-input-field {
      box-sizing: border-box;
      width: 0;
      min-width: 0;
      flex: 1;
      border: 0;
      outline: 0;
      padding: 0 8px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    :host([positioning="left"]) .dsk-input-field { text-align: left; }
    :host([positioning="right"]) .dsk-input-field { text-align: right; }
    .dsk-input-field::placeholder { color: #8b93a1; opacity: 1; }
    .dsk-input-text, .dsk-input-value { display: contents; }
    .dsk-input-mirror, .dsk-input-tag { display: none; }
    .dsk-input-container[data-tag] .dsk-input-text {
      position: relative; display: flex; flex: 1; min-width: 0; padding: 0 8px;
      align-items: stretch; justify-content: center; overflow: hidden;
    }
    :host([positioning="left"]) .dsk-input-container[data-tag] .dsk-input-text { justify-content: flex-start; }
    :host([positioning="right"]) .dsk-input-container[data-tag] .dsk-input-text { justify-content: flex-end; }
    .dsk-input-container[data-tag] .dsk-input-value {
      display: grid; width: max-content; max-width: 100%; min-width: 0;
      grid-template-columns: minmax(1ch, 1fr) minmax(0, auto);
      align-items: center; font-variant-numeric: tabular-nums;
    }
    .dsk-input-container[data-tag] .dsk-input-field {
      position: absolute; inset: 0; width: 100%; min-width: 0; height: 100%; padding: 0;
    }
    .dsk-input-container[data-tag] .dsk-input-mirror {
      display: block; grid-area: 1 / 1; visibility: hidden;
      white-space: pre; min-width: 1ch; overflow: hidden;
    }
    .dsk-input-container[data-tag] .dsk-input-tag {
      position: relative;
      display: block; grid-area: 1 / 2; min-width: 0;
      white-space: pre; overflow: hidden; text-overflow: ellipsis;
      pointer-events: none; user-select: none; -webkit-user-select: none;
    }
    :host([tag-position="left"]) .dsk-input-container[data-tag] .dsk-input-value {
      grid-template-columns: minmax(0, auto) minmax(1ch, 1fr);
    }
    :host([tag-position="left"]) .dsk-input-container[data-tag] .dsk-input-mirror { grid-column: 2; }
    :host([tag-position="left"]) .dsk-input-container[data-tag] .dsk-input-tag { grid-column: 1; }
    .dsk-input-container[data-disabled] { opacity: 0.5; }
    .dsk-input-container[data-disabled] .dsk-input-handle { cursor: not-allowed; }
    .dsk-input-container[data-readonly] .dsk-input-handle { cursor: default; }
    .dsk-input-container[data-dragging] .dsk-input-handle {
      background: color-mix(in srgb, var(--dsk-input-focus-color, #557be8) 12%, transparent);
    }
    @media (prefers-reduced-motion: reduce) { .dsk-input-container { transition: none; } }
  </style>
  <div class="dsk-input-container" part="container">
    <span class="dsk-input-handle" part="handle" aria-hidden="true" title="Drag to adjust">
      <span class="dsk-input-icon-wrapper">${inputHandleSvg}</span>
      <img class="dsk-input-image" alt="" draggable="false" hidden>
    </span>
    <span class="dsk-input-text">
      <span class="dsk-input-value">
        <span class="dsk-input-mirror" aria-hidden="true"></span>
        <input class="dsk-input-field" part="input" type="text" inputmode="text" role="spinbutton" autocomplete="off" spellcheck="false">
        <span class="dsk-input-tag" part="tag" id="dsk-input-tag"></span>
      </span>
    </span>
  </div>
`;

/** Shared interaction model for inputs whose values have a numeric stepping coordinate. */
export abstract class DskInputBase extends HTMLElement {
  static readonly formAssociated = true;

  static readonly observedAttributes = [
    'min',
    'max',
    'value',
    'placeholder',
    'src',
    'step',
    'select-on-focus',
    'loopafter-min',
    'loopafter',
    'loopafter-max',
    'key-horizontal-step',
    'key-vertical-step',
    'progression',
    'positioning',
    'tag',
    'tag-position',
    'tag-gap',
    'disabled',
    'readonly',
    'name',
    'aria-label',
  ];

  private readonly _input: HTMLInputElement;
  private readonly _text: HTMLSpanElement;
  private readonly _valueGroup: HTMLSpanElement;
  private readonly _mirror: HTMLSpanElement;
  private readonly _tag: HTMLSpanElement;
  private readonly _handle: HTMLSpanElement;
  private readonly _container: HTMLDivElement;
  private readonly _image: HTMLImageElement;
  private readonly _icon: HTMLSpanElement;
  private _iconMarkup: string | undefined;
  private readonly _internals: ElementInternals | undefined;
  private _value = '';
  private _committedValue = '';
  private readonly _history = new DskHistory('');
  private _redoDraft: string | null = null;
  private _selectAfterClick = false;
  private _initialValue: string | undefined;
  private _reflecting = false;
  private _formDisabled = false;
  private _drag: DragState | null = null;
  private _listeners: AbortController | null = null;
  private _tagLayoutObserver: ResizeObserver | null = null;
  private _pendingLock: PendingPointerLock | null = null;
  private _cursor: HTMLDivElement | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    shadow.append(template.content.cloneNode(true));
    this._input = shadow.querySelector('input')!;
    this._text = shadow.querySelector<HTMLSpanElement>('.dsk-input-text')!;
    this._valueGroup =
      shadow.querySelector<HTMLSpanElement>('.dsk-input-value')!;
    this._mirror = shadow.querySelector<HTMLSpanElement>('.dsk-input-mirror')!;
    this._tag = shadow.querySelector<HTMLSpanElement>('.dsk-input-tag')!;
    this._handle = shadow.querySelector<HTMLSpanElement>('.dsk-input-handle')!;
    this._container = shadow.querySelector<HTMLDivElement>(
      '.dsk-input-container',
    )!;
    this._image = shadow.querySelector('img')!;
    this._icon = shadow.querySelector<HTMLSpanElement>(
      '.dsk-input-icon-wrapper',
    )!;
    this._internals = this.attachInternals?.();
  }

  connectedCallback(): void {
    for (const property of this.upgradeProperties)
      this._upgradeProperty(property);
    if (this._initialValue === undefined) this._initialValue = this.value;
    this._listeners?.abort();
    this._listeners = new AbortController();
    this._tagLayoutObserver?.disconnect();
    this._tagLayoutObserver = new ResizeObserver(() => this._syncTagLayout());
    for (const element of [this._text, this._mirror, this._tag]) {
      this._tagLayoutObserver.observe(element);
    }
    const options = { signal: this._listeners.signal };
    this._text.addEventListener('click', this._onTextClick, options);
    this._input.addEventListener('input', this._onInput, options);
    this._input.addEventListener('focus', this._onFocus, options);
    this._input.addEventListener(
      'pointerdown',
      this._onInputPointerDown,
      options,
    );
    this._input.addEventListener('click', this._onInputClick, options);
    this._input.addEventListener('beforeinput', this._onBeforeInput, options);
    this._input.addEventListener('change', this._onNativeChange, options);
    this._input.addEventListener('blur', this._onBlur, options);
    this._input.addEventListener('keydown', this._onKeyDown, options);
    this._handle.addEventListener('pointerdown', this._onPointerDown, options);
    this._handle.addEventListener('pointermove', this._onPointerMove, options);
    this._handle.addEventListener('pointerup', this._onPointerUp, options);
    this._handle.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      options,
    );
    this._handle.addEventListener(
      'lostpointercapture',
      this._onLostPointerCapture,
      options,
    );
    // Canceling pointerdown can suppress compatibility mousemove/mouseup in
    // Firefox. Keep locked gestures entirely on the Pointer Events stream.
    const pointerOptions = { ...options, capture: true };
    this.ownerDocument.addEventListener(
      'pointerup',
      this._onPointerUp,
      pointerOptions,
    );
    this.ownerDocument.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      pointerOptions,
    );
    this.ownerDocument.addEventListener(
      'pointermove',
      this._onLockedMove,
      pointerOptions,
    );
    this.ownerDocument.addEventListener(
      'pointerlockchange',
      this._onLockChange,
      options,
    );
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._onWindowBlur,
      options,
    );
    this._handle.addEventListener('dragstart', this._onDragStart, options);
    this._image.addEventListener('error', this._onImageError, options);
    this._image.addEventListener('load', this._onImageLoad, options);
    this._syncState();
    this._syncImage();
  }

  disconnectedCallback(): void {
    this._tagLayoutObserver?.disconnect();
    this._tagLayoutObserver = null;
    this._cancelDrag(false);
    this._listeners?.abort();
    this._listeners = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || this._reflecting) return;
    if (name === 'value') {
      this._cancelDrag(false);
      this._setValue(newValue);
    } else if (name === 'min' || name === 'max' || name === 'step') {
      this._cancelDrag(false);
      this._setValue(this.getAttribute('value') ?? this.value);
    } else if (name === 'src') {
      this._syncImage();
    } else if (
      name === 'disabled' ||
      name === 'readonly' ||
      name === 'loopafter' ||
      name === 'loopafter-min' ||
      name === 'loopafter-max'
    ) {
      this._cancelDrag(false);
    }
    if (!DskInputBase.observedAttributes.includes(name)) {
      this.onConfigurationChanged(name, oldValue, newValue);
    }
    this._syncState();
  }

  get value(): string {
    return this._value;
  }

  set value(value: NumericValue) {
    // Controlled views may echo input events back through the property.
    // Preserve the active gesture and its commit boundary for that echo.
    if (this._drag && this.normalizeValue(value) === this.value) return;
    this._cancelDrag(false);
    this._setValue(value);
  }

  get valueAsNumber(): number {
    return this.parseValue(this.value);
  }

  set valueAsNumber(value: number) {
    this.value = value;
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }

  get selectOnFocus(): boolean {
    return (
      this.hasAttribute('select-on-focus') &&
      this.getAttribute('select-on-focus') !== 'false'
    );
  }

  set selectOnFocus(value: boolean) {
    if (value) this.setAttribute('select-on-focus', 'true');
    else this.removeAttribute('select-on-focus');
  }

  get loopAfter(): boolean {
    return (
      this.hasAttribute('loopafter') &&
      this.getAttribute('loopafter') !== 'false'
    );
  }

  set loopAfter(value: boolean) {
    if (value) this.setAttribute('loopafter', 'true');
    else this.removeAttribute('loopafter');
  }

  get loopAfterMin(): boolean {
    return (
      this.hasAttribute('loopafter-min') &&
      this.getAttribute('loopafter-min') !== 'false'
    );
  }

  set loopAfterMin(value: boolean) {
    if (value) this.setAttribute('loopafter-min', 'true');
    else this.removeAttribute('loopafter-min');
  }

  get loopAfterMax(): boolean {
    return (
      this.hasAttribute('loopafter-max') &&
      this.getAttribute('loopafter-max') !== 'false'
    );
  }

  set loopAfterMax(value: boolean) {
    if (value) this.setAttribute('loopafter-max', 'true');
    else this.removeAttribute('loopafter-max');
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }

  set readOnly(value: boolean) {
    this.toggleAttribute('readonly', Boolean(value));
  }

  get min(): string {
    return this.getAttribute('min') ?? '';
  }

  set min(value: NumericValue) {
    this._reflectAttribute('min', value);
  }

  get max(): string {
    return this.getAttribute('max') ?? '';
  }

  set max(value: NumericValue) {
    this._reflectAttribute('max', value);
  }

  get step(): string {
    return this.getAttribute('step') ?? '';
  }

  set step(value: NumericValue) {
    this._reflectAttribute('step', value);
  }

  get keyHorizontalStep(): string {
    return this.getAttribute('key-horizontal-step') ?? '';
  }

  set keyHorizontalStep(value: NumericValue) {
    this._reflectAttribute('key-horizontal-step', value);
  }

  get keyVerticalStep(): string {
    return this.getAttribute('key-vertical-step') ?? '';
  }

  set keyVerticalStep(value: NumericValue) {
    this._reflectAttribute('key-vertical-step', value);
  }

  get progression(): string {
    return this.getAttribute('progression') ?? 'linear';
  }

  set progression(value: Progression | null | undefined) {
    this._reflectAttribute('progression', value);
  }

  get positioning(): InputPositioning {
    const value = this.getAttribute('positioning');
    return value === 'left' || value === 'right' ? value : 'center';
  }

  set positioning(value: InputPositioning | null | undefined) {
    this._reflectAttribute('positioning', value);
  }

  get tag(): string {
    return this.getAttribute('tag') ?? '';
  }

  set tag(value: string | null | undefined) {
    this._reflectAttribute('tag', value);
  }

  get tagPosition(): InputTagPosition {
    return this.getAttribute('tag-position') === 'left' ? 'left' : 'right';
  }

  set tagPosition(value: InputTagPosition | null | undefined) {
    this._reflectAttribute('tag-position', value);
  }

  get tagGap(): string {
    return this.getAttribute('tag-gap') || '4px';
  }

  set tagGap(value: NumericValue) {
    this._reflectAttribute('tag-gap', value);
  }

  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }

  set placeholder(value: string | null | undefined) {
    this._reflectAttribute('placeholder', value);
  }

  get src(): string {
    return this.getAttribute('src') ?? '';
  }

  set src(value: string | null | undefined) {
    this._reflectAttribute('src', value);
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string | null | undefined) {
    this._reflectAttribute('name', value);
  }

  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }

  override blur(): void {
    this._input.blur();
  }

  select(): void {
    this._input.select();
  }

  formResetCallback(): void {
    this.value = this.initialValue;
  }

  formDisabledCallback(disabled: boolean): void {
    this._formDisabled = disabled;
    this._cancelDrag(false);
    this._syncState();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    this.value = typeof state === 'string' ? state : '';
  }

  protected abstract parseValue(value: NumericValue): number;

  protected abstract formatValue(value: number): string;

  protected abstract evaluateValue(text: string): number;

  protected editorText(value: string): string {
    return value;
  }

  protected editorValue(text: string): string {
    return text;
  }

  protected updateUserValue(value: string): void {
    this._history.discardRedo();
    this._redoDraft = null;
    this._writeValue(value);
    this._emit('input');
  }

  protected commitUserValue(): void {
    this._commit();
  }

  protected cancelUserValue(): void {
    this._redoDraft = null;
    this._writeValue(this._committedValue);
  }

  protected restoreUserHistory(redo: boolean): void {
    this._restoreHistory(redo);
  }

  protected getAdjustmentOptions(): NumericOptions {
    return this.getValueOptions();
  }

  protected get initialValue(): string {
    return this._initialValue ?? '';
  }

  protected getValueOptions(): NumericOptions {
    return getOptions(this);
  }

  protected normalizeValue(value: NumericValue): string {
    const parsed = this.parseValue(value);
    return Number.isFinite(parsed)
      ? this.formatValue(clampNumber(parsed, this.getValueOptions()))
      : '';
  }

  protected adjustValue(
    start: number,
    count: number,
    options: NumericOptions,
  ): number {
    return stepValue(start, count, options);
  }

  protected getKeyboardStep(value: NumericValue, fallback: number): number {
    const step = parseNumber(value);
    return step > 0 ? step : fallback;
  }

  protected get defaultHandleSvg(): string {
    return inputHandleSvg;
  }

  protected renderDefaultHandle(element: HTMLElement): void {
    // Subclasses can update their default handle without replacing drag listeners.
    void element;
  }

  protected get valueInputMode(): string {
    return 'text';
  }

  protected get accessibleLabel(): string {
    return 'Value';
  }

  protected get invalidMessage(): string {
    return 'Enter a valid value.';
  }

  protected get upgradeProperties(): readonly string[] {
    return upgradableProperties;
  }

  protected refreshValue(value: NumericValue = this.value): void {
    this._cancelDrag(false);
    this._setValue(value);
  }

  protected onConfigurationChanged(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    // Subclasses can refresh their value when additional observed attributes change.
    void name;
    void oldValue;
    void newValue;
  }

  private _upgradeProperty(property: string): void {
    if (!Object.hasOwn(this, property)) return;
    const value: unknown = Reflect.get(this, property);
    Reflect.deleteProperty(this, property);
    Reflect.set(this, property, value);
  }

  private _reflectAttribute(
    property: ReflectedStringProperty,
    value: NumericValue,
  ): void {
    if (value === null || value === undefined) this.removeAttribute(property);
    else this.setAttribute(property, String(value));
  }

  private get _options(): NumericOptions {
    return this.getValueOptions();
  }

  private get _editable(): boolean {
    return !this.disabled && !this._formDisabled && !this.readOnly;
  }

  private _setValue(value: NumericValue): void {
    this._writeValue(this.normalizeValue(value));
    this._committedValue = this.value;
    this._history.reset(this.value);
    this._redoDraft = null;
  }

  private _writeValue(value: string): void {
    this._value = String(value);
    this._reflecting = true;
    this.setAttribute('value', this._value);
    this._reflecting = false;
    this._syncState();
  }

  private _syncState(): void {
    const text = this.editorText(this.value);
    if (this._input.value !== text) this._input.value = text;
    const disabled = this.disabled || this._formDisabled;
    const options = this._options;
    this._input.disabled = disabled;
    this._input.readOnly = this.readOnly;
    this._input.placeholder = this.placeholder;
    this._input.inputMode = this.valueInputMode;
    const hasTag = this.tag !== '';
    this._container.toggleAttribute('data-tag', hasTag);
    this._tag.textContent = this.tag;
    this._mirror.textContent = text || this.placeholder || ' ';
    const gap = this.tagGap.trim();
    this._valueGroup.style.columnGap = '4px';
    this._valueGroup.style.columnGap = /^\d+(?:\.\d+)?$/.test(gap)
      ? `${gap}px`
      : gap;
    if (hasTag) this._input.setAttribute('aria-describedby', 'dsk-input-tag');
    else this._input.removeAttribute('aria-describedby');
    this._syncTagLayout();
    this._input.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') || this.accessibleLabel,
    );
    this._input.setAttribute('aria-readonly', String(this.readOnly));
    this._input.setAttribute('aria-valuetext', this.value);
    this._container.toggleAttribute('data-disabled', disabled);
    this._container.toggleAttribute('data-readonly', this.readOnly);
    for (const [attribute, value] of [
      ['aria-valuemin', options.min],
      ['aria-valuemax', options.max],
      ['aria-valuenow', this.valueAsNumber],
    ] as const) {
      if (Number.isFinite(value))
        this._input.setAttribute(attribute, String(value));
      else this._input.removeAttribute(attribute);
    }
    const number = this.valueAsNumber;
    const invalid =
      this.value !== '' &&
      Number.isNaN(number) &&
      !Number.isFinite(this.evaluateValue(this.value));
    this._input.setAttribute('aria-invalid', String(invalid));
    this._internals?.setFormValue(disabled ? null : this.value);
    this._internals?.setValidity(
      invalid ? { badInput: true } : {},
      invalid ? this.invalidMessage : '',
      this._input,
    );
    this.renderDefaultHandle(this._icon);
  }

  private _syncImage(): void {
    const markup = this.defaultHandleSvg;
    if (this._iconMarkup !== markup) {
      this._icon.innerHTML = markup;
      this._iconMarkup = markup;
    }
    this.renderDefaultHandle(this._icon);
    if (this.src) {
      if (this._image.getAttribute('src') !== this.src) {
        this._image.hidden = true;
        this._icon.removeAttribute('hidden');
        this._image.setAttribute('src', this.src);
      }
      if (this._image.complete && this._image.naturalWidth > 0)
        this._onImageLoad();
    } else {
      this._image.removeAttribute('src');
      this._image.hidden = true;
      this._icon.removeAttribute('hidden');
    }
  }

  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private _commit(): void {
    const previous = this.value;
    const committed = this._committedValue;
    const parsed = this.evaluateValue(previous);
    const next =
      previous.trim() === '' || Number.isFinite(parsed)
        ? this.normalizeValue(previous.trim() === '' ? '' : parsed)
        : this.normalizeValue(this._committedValue);
    this._writeValue(next);
    this._committedValue = next;
    if (next !== committed) this._recordHistory(next);
    if (previous !== next) this._emit('input');
    if (next !== committed && this.value === next) {
      this._emit('change');
    }
  }

  private _recordHistory(value: string): void {
    this._history.record(value);
    this._redoDraft = null;
  }

  private _restoreHistory(redo: boolean): void {
    if (!this._editable || this._drag) return;
    if (this.value !== this._committedValue) {
      if (redo) return;
      this._redoDraft = this.value;
      this._writeValue(this._committedValue);
      this._emit('input');
      return;
    }
    if (redo && !this._history.canRedo && this._redoDraft !== null) {
      const draft = this._redoDraft;
      this._redoDraft = null;
      this._writeValue(draft);
      this._emit('input');
      return;
    }
    const value = this._history.restore(redo);
    if (value === undefined) return;
    this._writeValue(value);
    this._committedValue = value;
    this._emit('input');
    if (this.value === value) this._emit('change');
  }

  private _releasePointer(pointerId: number): void {
    this._container.removeAttribute('data-dragging');
    if (this._handle.hasPointerCapture(pointerId))
      this._handle.releasePointerCapture(pointerId);
    this._cursor?.remove();
    this._cursor = null;
    if (this._hasPointerLock) this.ownerDocument.exitPointerLock();
  }

  private _syncTagLayout(): void {
    if (!this.tag) {
      this._input.style.removeProperty('padding-left');
      this._input.style.removeProperty('padding-right');
      return;
    }
    if (!this.isConnected) return;
    // Keep the native input full-size while matching its text to the tag layout.
    const area = this._text.getBoundingClientRect();
    const value = this._mirror.getBoundingClientRect();
    this._input.style.paddingLeft = `${Math.max(0, value.left - area.left)}px`;
    this._input.style.paddingRight = `${Math.max(0, area.right - value.right)}px`;
  }

  private readonly _onTextClick = (): void => {
    if (!this.disabled && !this._formDisabled) this.focus();
  };

  private get _hasPointerLock(): boolean {
    const root = this.getRootNode();
    return (
      this.ownerDocument.pointerLockElement === this ||
      ('pointerLockElement' in root && root.pointerLockElement === this)
    );
  }

  private _showCursor(drag: DragState): void {
    if (this._cursor) return;
    const cursor = this.ownerDocument.createElement('div');
    cursor.className = 'dsk-drag-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.cssText =
      'position:fixed;pointer-events:none;width:24px;height:24px;z-index:2147483647;transform:translate(-50%,-50%);margin:0;padding:0;border:0;background:transparent;';
    cursor.innerHTML = horizontalResizeSvg;
    this.ownerDocument.body.append(cursor);
    this._cursor = cursor;
    this._positionCursor(drag);
  }

  private _positionCursor(drag: DragState): void {
    if (!this._cursor) return;
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    const wrap = (value: number, size: number): number =>
      ((value % size) + size) % size;
    drag.cursorX = wrap(drag.cursorX, Math.max(1, view.innerWidth));
    drag.cursorY = wrap(drag.cursorY, Math.max(1, view.innerHeight));
    this._cursor.style.left = drag.cursorX + 'px';
    this._cursor.style.top = drag.cursorY + 'px';
  }

  private _requestLock(drag: DragState): void {
    if (
      !this.requestPointerLock ||
      this.ownerDocument.pointerLockElement ||
      this._pendingLock
    )
      return;
    const document = this.ownerDocument;
    const request = { drag };
    this._pendingLock = request;
    const cleanup = (): void => {
      document.removeEventListener('pointerlockchange', acquired);
      document.removeEventListener('pointerlockerror', cleanup);
      if (this._pendingLock === request) this._pendingLock = null;
    };
    const acquired = (): void => {
      if (!this._hasPointerLock) return;
      cleanup();
      // A request can complete after mouseup or removal. Never keep that lock.
      if (this._drag !== drag || !this.isConnected) document.exitPointerLock();
      else {
        drag.locked = true;
        this._showCursor(drag);
      }
    };
    document.addEventListener('pointerlockchange', acquired);
    document.addEventListener('pointerlockerror', cleanup);
    try {
      const pending: Promise<void> | void = this.requestPointerLock();
      pending?.then(acquired, cleanup);
    } catch {
      cleanup();
    }
  }

  private _updateDrag(): void {
    const drag = this._drag;
    if (!drag) return;
    const options = this.getAdjustmentOptions();
    const looping =
      (options.loopAfterMin || options.loopAfterMax) &&
      Number.isFinite(options.max - options.min) &&
      options.max > options.min;
    const rawCount = dragSteps(drag.distance, options.progression);
    const count = looping
      ? Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, rawCount))
      : rawCount;
    const movement = drag.distance - drag.previousDistance;
    const countDelta = count - drag.previousCount;
    const next = looping
      ? countDelta === 0
        ? this.value
        : this.formatValue(
            this.adjustValue(
              Number.isFinite(this.valueAsNumber)
                ? this.valueAsNumber
                : drag.startValue,
              countDelta,
              options,
            ),
          )
      : count === 0
        ? drag.anchorText
        : this.formatValue(this.adjustValue(drag.startValue, count, options));
    drag.previousCount = count;
    drag.previousDistance = drag.distance;
    if (
      ((looping ? movement : drag.distance) < 0 &&
        this.parseValue(next) <= options.min &&
        !(looping && options.loopAfterMin)) ||
      ((looping ? movement : drag.distance) > 0 &&
        this.parseValue(next) >= options.max &&
        !(looping && options.loopAfterMax))
    ) {
      // Discard outward movement at a bound, including sub-step movement.
      // Keep initialText unchanged so Escape still restores the drag start.
      drag.startValue = this.parseValue(next);
      drag.anchorText = next;
      drag.distance = 0;
      drag.previousCount = 0;
      drag.previousDistance = 0;
    }
    if (next !== this.value) {
      this._writeValue(next);
      this._emit('input');
    }
  }

  private _finishDrag(): void {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    this._releasePointer(drag.pointerId);
    this._commit();
  }

  private _cancelDrag(emit = true): void {
    if (!this._drag) return;
    const drag = this._drag;
    this._drag = null;
    this._releasePointer(drag.pointerId);
    const changed = this.value !== drag.initialText;
    this._writeValue(drag.initialText);
    this._committedValue = drag.initialText;
    if (emit && changed) this._emit('input');
  }

  private readonly _onInput = (event: Event): void => {
    event.stopPropagation();
    this.updateUserValue(this.editorValue(this._input.value));
  };

  private readonly _onNativeChange = (event: Event): void =>
    event.stopPropagation();

  private readonly _onBlur = (): void => {
    this._selectAfterClick = false;
    if (!this._drag) this._commit();
  };

  private readonly _onFocus = (): void => {
    if (this.selectOnFocus) {
      this._input.select();
    }
  };

  private readonly _onInputPointerDown = (): void => {
    this._selectAfterClick =
      this.selectOnFocus && this.shadowRoot?.activeElement !== this._input;
  };

  private readonly _onInputClick = (): void => {
    if (this._selectAfterClick && this.selectOnFocus) this._input.select();
    this._selectAfterClick = false;
  };

  private readonly _onBeforeInput = (event: InputEvent): void => {
    if (
      event.inputType === 'historyUndo' ||
      event.inputType === 'historyRedo'
    ) {
      event.preventDefault();
      this._restoreHistory(event.inputType === 'historyRedo');
    }
  };

  private readonly _onDragStart = (event: DragEvent): void =>
    event.preventDefault();

  private readonly _onImageError = (): void => {
    this._image.hidden = true;
    this._icon.removeAttribute('hidden');
  };

  private readonly _onImageLoad = (): void => {
    this._image.hidden = false;
    this._icon.setAttribute('hidden', '');
  };

  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (this.shadowRoot?.activeElement !== this._input || event.isComposing)
      return;
    if (event.key === 'Escape') {
      this._redoDraft = null;
      event.preventDefault();
      if (this._drag) this._cancelDrag();
      else if (this.value !== this._committedValue) {
        this._writeValue(this._committedValue);
        this._emit('input');
      }
      this.blur();
      return;
    }
    if (!this._editable) return;
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      (event.code === 'KeyZ' ||
        ((!event.code || event.code === 'Unidentified') &&
          event.key.toLowerCase() === 'z'))
    ) {
      event.preventDefault();
      this._restoreHistory(event.shiftKey);
      return;
    }
    if (this._drag) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this._commit();
      return;
    }
    const directions: Readonly<Record<string, number>> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const direction = directions[event.key];
    if (
      direction === undefined ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    event.preventDefault();
    const options = this.getAdjustmentOptions();
    if (event.key.startsWith('Arrow')) {
      const horizontal =
        event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      options.step = this.getKeyboardStep(
        horizontal ? this.keyHorizontalStep : this.keyVerticalStep,
        options.step,
      );
    }
    const parsed = this.evaluateValue(this.value);
    const start = Number.isFinite(parsed) ? parsed : 0;
    const next = this.formatValue(this.adjustValue(start, direction, options));
    if (next !== this.value) {
      this._writeValue(next);
      this._emit('input');
    }
    this._commit();
  };

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (!this._editable || event.button !== 0 || !event.isPrimary || this._drag)
      return;
    event.preventDefault();
    this._input.focus({ preventScroll: true });
    this._commit();
    if (!this._editable || !this.isConnected) return;
    this._drag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      lastX: event.clientX,
      distance: 0,
      previousCount: 0,
      previousDistance: 0,
      locked: false,
      cursorX: event.clientX,
      cursorY: event.clientY,
      startValue: Number.isFinite(this.valueAsNumber)
        ? this.valueAsNumber
        : clampNumber(0, this._options),
      initialText: this.value,
      anchorText: this.value,
    };
    this._handle.setPointerCapture(event.pointerId);
    this._container.setAttribute('data-dragging', '');
    if (event.pointerType === 'mouse') this._requestLock(this._drag);
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    const drag = this._drag;
    if (
      !drag ||
      drag.pointerId !== event.pointerId ||
      this._hasPointerLock ||
      drag.locked
    )
      return;
    if (drag.pointerType === 'mouse' && !(event.buttons & 1)) {
      this._finishDrag();
      return;
    }
    drag.distance += event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    drag.cursorX = event.clientX;
    drag.cursorY = event.clientY;
    this._updateDrag();
  };

  private readonly _onLockedMove = (event: PointerEvent): void => {
    const drag = this._drag;
    if (!drag || !this._hasPointerLock || event.pointerType !== 'mouse') return;
    if (!(event.buttons & 1)) {
      this._finishDrag();
      return;
    }
    drag.locked = true;
    drag.distance += event.movementX;
    drag.cursorX += event.movementX;
    drag.cursorY += event.movementY;
    this._showCursor(drag);
    this._positionCursor(drag);
    this._updateDrag();
  };

  private readonly _onLockChange = (): void => {
    if (this._drag?.locked && !this._hasPointerLock) {
      // Browsers may consume Escape to release Pointer Lock before keydown.
      this._cancelDrag();
      this.blur();
    }
  };

  private readonly _onLostPointerCapture = (event: PointerEvent): void => {
    if (!this._hasPointerLock) this._onPointerCancel(event);
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (!this._drag || this._drag.pointerId !== event.pointerId) return;
    this._finishDrag();
  };

  private readonly _onWindowBlur = (): void => this._cancelDrag();

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._cancelDrag();
  };
}
