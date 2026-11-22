/** User-positioned rotation control for the nearest transform box, outside content. */
export class DskTransformBoxHandleRotate extends HTMLElement {
  static readonly observedAttributes = ['disabled'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; width:20px; height:20px; border:1px solid var(--dsk-transform-color,#557be8); border-radius:50%; background:var(--dsk-transform-handle-background,#fff); color:var(--dsk-transform-color,#557be8); cursor:grab; touch-action:none; user-select:none; flex:none; }
      :host([hidden]) { display:none!important; }
      :host([disabled]) { cursor:default; }
      :host(:focus) { outline:none; }
      :host(:active) { cursor:grabbing; }
    </style><slot>↻</slot>`;
  }
  connectedCallback(): void {
    if (Object.hasOwn(this, 'disabled')) {
      const value = this.disabled;
      Reflect.deleteProperty(this, 'disabled');
      this.disabled = value;
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (!this.hasAttribute('role')) this.setAttribute('role', 'slider');
    if (!this.hasAttribute('aria-label'))
      this.setAttribute('aria-label', 'Rotate object');
    this.setAttribute('aria-valuemin', '0');
    this.setAttribute('aria-valuemax', '360');
    if (!this.hasAttribute('aria-valuenow'))
      this.setAttribute('aria-valuenow', '0');
  }
  attributeChangedCallback(): void {
    this.setAttribute('aria-disabled', String(this.disabled));
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-transform-box-handle-rotate': DskTransformBoxHandleRotate;
  }
}
