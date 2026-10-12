/** Bridge a control whose value or mixed presentation uses a different API. */
export interface InputGroupAdapter {
  getValue(input: HTMLElement): string;
  setValue(input: HTMLElement, value: string): void;
  /** Optional custom mixed presentation; the adapter keeps ownership of its value. */
  setMixed?(input: HTMLElement, mixed: boolean, label: string): void;
}

interface MixedState {
  adapter: InputGroupAdapter;
  value: string;
  emptyValue: string;
  placeholder: string | null;
  placeholderProperty: string | undefined;
  label: string;
}

const valueAdapter: InputGroupAdapter = {
  getValue: (input) => String(Reflect.get(input, 'value') ?? ''),
  setValue: (input, value) => {
    if (!Reflect.set(input, 'value', value))
      throw new TypeError('A grouped input must have a writable value.');
  },
};

/** Coordinate editable values without replacing controls or their keyboard behavior. */
export class DskInputGroup extends HTMLElement {
  static readonly observedAttributes = ['mixed-label', 'has-mixed-values'];
  private readonly _automaticMixed = new Set<HTMLElement>();
  private readonly _adapters = new Map<HTMLElement, InputGroupAdapter>();
  private readonly _mixed = new Map<HTMLElement, MixedState>();
  private readonly _mixedInputs = new Set<HTMLElement>();
  private readonly _lastEdits = new WeakMap<HTMLElement, string>();
  private readonly _observer: MutationObserver;
  private readonly _pendingDefinitions = new Set<string>();
  private _listeners: AbortController | undefined;
  private _updating = false;

  constructor() {
    super();
    this.attachInternals().role = 'group';
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-flex; vertical-align: middle; }
        :host([hidden]) { display: none !important; }
        [part="container"] { display: flex; flex-wrap: var(--dsk-input-group-wrap, nowrap); align-items: center; gap: var(--dsk-input-group-gap, 8px); min-width: 0; width: 100%; }
      </style>
      <div part="container"><slot></slot></div>
    `;
    this._observer = new MutationObserver(() => this._refresh());
  }

  connectedCallback(): void {
    for (const property of ['linked', 'mixedLabel', 'hasMixedValues']) {
      if (!Object.hasOwn(this, property)) continue;
      const value: unknown = Reflect.get(this, property);
      Reflect.deleteProperty(this, property);
      Reflect.set(this, property, value);
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    for (const type of ['input', 'change'])
      this.addEventListener(type, this._onEdit, {
        signal: this._listeners.signal,
      });
    this.addEventListener('focusin', this._onFocusIn, {
      signal: this._listeners.signal,
    });
    this.addEventListener('focusout', this._onFocusOut, {
      signal: this._listeners.signal,
    });
    this._observer.observe(this, {
      subtree: true,
      childList: true,
    });
    this._refresh();
    queueMicrotask(() => this._refresh());
  }

  disconnectedCallback(): void {
    this._listeners?.abort();
    this._observer.disconnect();
    for (const input of this._mixed.keys()) this._restore(input, true);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._refresh();
  }

  get linked(): boolean {
    return this.hasAttribute('linked');
  }
  set linked(value: boolean) {
    this.toggleAttribute('linked', Boolean(value));
  }

  get mixedLabel(): string {
    return this.getAttribute('mixed-label') ?? 'Mixed';
  }

  get hasMixedValues(): boolean {
    return (
      this.hasAttribute('has-mixed-values') &&
      this.getAttribute('has-mixed-values') !== 'false'
    );
  }
  set hasMixedValues(value: boolean) {
    this.toggleAttribute('has-mixed-values', Boolean(value));
  }

  /** Actual values, including values temporarily hidden behind placeholders. */
  get storedValues(): readonly string[] {
    return Object.freeze(
      this.inputs.map((input) => {
        const state = this._mixed.get(input);
        const current = this._adapter(input).getValue(input);
        return state && !state.adapter.setMixed && current === state.emptyValue
          ? state.value
          : current;
      }),
    );
  }
  set mixedLabel(value: string | null | undefined) {
    if (value == null) this.removeAttribute('mixed-label');
    else this.setAttribute('mixed-label', value);
  }

  /** Current controls in DOM order; nested groups own their own controls. */
  get inputs(): readonly HTMLElement[] {
    const result: HTMLElement[] = [];
    for (const node of this.querySelectorAll('*')) {
      if (
        !(node instanceof HTMLElement) ||
        node.closest('dsk-input-group') !== this ||
        result.some((parent) => parent.contains(node))
      )
        continue;
      const native =
        node instanceof HTMLTextAreaElement ||
        node instanceof HTMLSelectElement ||
        (node instanceof HTMLInputElement &&
          ![
            'button',
            'submit',
            'reset',
            'image',
            'hidden',
            'file',
            'checkbox',
            'radio',
          ].includes(node.type));
      const custom =
        node.localName.includes('-') &&
        'value' in node &&
        ['string', 'number'].includes(typeof Reflect.get(node, 'value'));
      if (native || custom || this._adapters.has(node)) result.push(node);
    }
    return Object.freeze(result);
  }

  /** Null denotes a mixed field; mixed labels are never returned as values. */
  get values(): readonly (string | null)[] {
    return Object.freeze(
      this.inputs.map((input) =>
        this.isMixed(input) ? null : this._adapter(input).getValue(input),
      ),
    );
  }

  setMixed(input: HTMLElement, mixed = true): void {
    if (!this.inputs.includes(input))
      throw new TypeError('The input must belong to this group.');
    this._lastEdits.delete(input);
    if (mixed) this._mixedInputs.add(input);
    else this._mixedInputs.delete(input);
    this._refresh();
  }

  isMixed(input: HTMLElement): boolean {
    return this._mixedInputs.has(input) || this._automaticMixed.has(input);
  }

  private readonly _onFocusIn = (): void => {
    this._refresh();
  };
  private readonly _onFocusOut = (): void => {
    // Let blur commit the current edit before hiding its value.
    queueMicrotask(() => this._refresh());
  };

  registerInput(input: HTMLElement, adapter: InputGroupAdapter): void {
    if (
      !(input instanceof HTMLElement) ||
      input.closest('dsk-input-group') !== this
    )
      throw new TypeError('The input must belong to this group.');
    if (
      !adapter ||
      typeof adapter.getValue !== 'function' ||
      typeof adapter.setValue !== 'function' ||
      (adapter.setMixed !== undefined && typeof adapter.setMixed !== 'function')
    )
      throw new TypeError(
        'An input adapter needs getValue and setValue methods.',
      );
    this._restore(input, true);
    this._adapters.set(input, adapter);
    this._refresh();
  }

  unregisterInput(input: HTMLElement): boolean {
    this._restore(input, true);
    const removed = this._adapters.delete(input);
    this._refresh();
    return removed;
  }

  private _adapter(input: HTMLElement): InputGroupAdapter {
    return this._adapters.get(input) ?? valueAdapter;
  }

  private _label(input: HTMLElement, label: string): void {
    if ('placeholder' in input) Reflect.set(input, 'placeholder', label);
    else input.setAttribute('placeholder', label);
  }

  private _refresh(): void {
    if (!this.isConnected || this._updating) return;
    this._updating = true;
    try {
      for (const node of this.querySelectorAll('*')) {
        const name = node.localName;
        if (
          !name.includes('-') ||
          customElements.get(name) ||
          this._pendingDefinitions.has(name)
        )
          continue;
        this._pendingDefinitions.add(name);
        const reference = new WeakRef(this);
        void customElements.whenDefined(name).then(() => {
          const group = reference.deref();
          group?._pendingDefinitions.delete(name);
          group?._refresh();
        });
      }
      const inputs = this.inputs;
      const values = this.storedValues;
      const different = new Set(values).size > 1;
      const active = this.ownerDocument.activeElement;
      this._automaticMixed.clear();
      if (this.hasMixedValues && different)
        for (const input of inputs)
          if (input !== active && !(active && input.contains(active)))
            this._automaticMixed.add(input);
      for (const input of this._mixedInputs)
        if (!inputs.includes(input)) this._mixedInputs.delete(input);
      for (const input of this._mixed.keys())
        if (!inputs.includes(input) || !this.isMixed(input))
          this._restore(input, true);
      for (const input of inputs) {
        if (!this.isMixed(input)) continue;
        let state = this._mixed.get(input);
        if (!state) {
          const adapter = this._adapter(input);
          const placeholder: unknown = Reflect.get(input, 'placeholder');
          state = {
            adapter,
            value: adapter.getValue(input),
            emptyValue: '',
            placeholder: input.getAttribute('placeholder'),
            placeholderProperty:
              typeof placeholder === 'string' ? placeholder : undefined,
            label: this.mixedLabel,
          };
          this._mixed.set(input, state);
          if (adapter.setMixed) adapter.setMixed(input, true, this.mixedLabel);
          else {
            adapter.setValue(input, '');
            this._label(input, this.mixedLabel);
          }
          state.emptyValue = adapter.getValue(input);
        } else if (state.label !== this.mixedLabel) {
          if (state.adapter.setMixed)
            state.adapter.setMixed(input, true, this.mixedLabel);
          else this._label(input, this.mixedLabel);
          state.label = this.mixedLabel;
        }
      }
    } finally {
      this._updating = false;
    }
  }

  private _restore(input: HTMLElement, restoreValue: boolean): void {
    const state = this._mixed.get(input);
    if (!state) return;
    this._mixed.delete(input);
    if (state.adapter.setMixed)
      state.adapter.setMixed(input, false, state.label);
    else {
      const current: unknown =
        'placeholder' in input
          ? Reflect.get(input, 'placeholder')
          : input.getAttribute('placeholder');
      if (current === state.label) {
        if (state.placeholderProperty !== undefined)
          Reflect.set(input, 'placeholder', state.placeholderProperty);
        if (state.placeholder === null) input.removeAttribute('placeholder');
        else input.setAttribute('placeholder', state.placeholder);
      }
      if (restoreValue && state.adapter.getValue(input) === state.emptyValue)
        state.adapter.setValue(input, state.value);
    }
  }

  private readonly _onEdit = (event: Event): void => {
    if (this._updating || (event instanceof InputEvent && event.isComposing))
      return;
    const inputs = this.inputs;
    const path = event.composedPath();
    const source = inputs.find((input) => path.includes(input));
    if (!source || this._locked(source)) return;
    const value = this._adapter(source).getValue(source);
    const duplicateCommit =
      event.type === 'change' && this._lastEdits.get(source) === value;
    if (event.type === 'input') this._lastEdits.set(source, value);
    else this._lastEdits.delete(source);
    if (duplicateCommit) return;
    this._updating = true;
    try {
      this._mixedInputs.delete(source);
      this._restore(source, false);
      if (!this.linked) return;
      for (const input of inputs) {
        if (input === source || this._locked(input)) continue;
        this._mixedInputs.delete(input);
        this._restore(input, false);
        this._adapter(input).setValue(input, value);
      }
    } finally {
      this._updating = false;
      this._refresh();
    }
  };

  private _locked(input: HTMLElement): boolean {
    return (
      input.matches(':disabled') ||
      input.hasAttribute('disabled') ||
      input.hasAttribute('readonly') ||
      Reflect.get(input, 'disabled') === true ||
      Reflect.get(input, 'readOnly') === true
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-input-group': DskInputGroup;
  }
}
