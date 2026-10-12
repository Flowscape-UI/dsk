/** Optional search field for its containing layer tree. */
export class DskTreeSearch extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'placeholder',
    'disabled',
    'aria-label',
  ];
  private readonly _input: HTMLInputElement;
  private _listeners: AbortController | undefined;
  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true }).innerHTML =
      `<style>
      :host{display:block;padding:var(--dsk-tree-search-padding,8px)}:host([hidden]){display:none!important}
      input{box-sizing:border-box;width:100%;min-width:0;padding:6px 8px;font:inherit;color:inherit;background:var(--dsk-tree-search-background,transparent);border:1px solid var(--dsk-tree-search-border,#ccd3df);border-radius:var(--dsk-tree-radius,6px);outline:none}
      input:focus{border-color:var(--dsk-tree-focus-color,#557be8)}
    </style><input part="input" type="search">`;
    this._input = this.shadowRoot!.querySelector('input')!;
  }
  connectedCallback(): void {
    if (Object.hasOwn(this, 'value')) {
      const value: unknown = Reflect.get(this, 'value');
      Reflect.deleteProperty(this, 'value');
      this.value = String(value ?? '');
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    this._input.addEventListener(
      'input',
      () => {
        this.value = this._input.value;
      },
      { signal: this._listeners.signal },
    );
    this._input.addEventListener(
      'change',
      () =>
        this.dispatchEvent(
          new Event('change', { bubbles: true, composed: true }),
        ),
      { signal: this._listeners.signal },
    );
    this.attributeChangedCallback();
  }
  disconnectedCallback(): void {
    this._listeners?.abort();
  }
  attributeChangedCallback(): void {
    const value = this.getAttribute('value') ?? '';
    if (this._input.value !== value) this._input.value = value;
    this._input.placeholder =
      this.getAttribute('placeholder') ?? 'Search layers';
    this._input.disabled = this.hasAttribute('disabled');
    this._input.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') ?? this._input.placeholder,
    );
  }
  get value(): string {
    return this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }
  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-tree-search': DskTreeSearch;
  }
}
