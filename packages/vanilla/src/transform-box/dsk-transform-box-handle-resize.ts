import {
  resizeDirection,
  type TransformBoxResizeDirection,
} from './helpers/geometry.ts';
/** User-positioned resize control for the nearest transform box, outside content. */
export class DskTransformBoxHandleResize extends HTMLElement {
  static readonly observedAttributes = ['disabled', 'direction'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; width:12px; height:12px; border:1px solid var(--dsk-transform-color,#557be8); border-radius:0; background:var(--dsk-transform-handle-background,#fff); color:var(--dsk-transform-color,#557be8); cursor:var(--dsk-transform-resize-cursor,nwse-resize); touch-action:none; user-select:none; flex:none; }
      :host([hidden]) { display:none!important; }
      :host([disabled]) { cursor:default; }
      :host(:focus) { outline:none; }

    </style><slot></slot>`;
  }
  connectedCallback(): void {
    for (const name of ['disabled', 'direction']) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (!this.hasAttribute('aria-label'))
      this.setAttribute('aria-label', 'Resize object');
    this.attributeChangedCallback();
  }
  attributeChangedCallback(): void {
    const direction = this.direction;
    this.style.setProperty(
      '--dsk-transform-resize-cursor',
      direction === 't' || direction === 'b'
        ? 'ns-resize'
        : direction === 'l' || direction === 'r'
          ? 'ew-resize'
          : direction === 'tl' || direction === 'br'
            ? 'nwse-resize'
            : 'nesw-resize',
    );
    this.setAttribute('aria-disabled', String(this.disabled));
  }
  get direction(): TransformBoxResizeDirection {
    return resizeDirection(this.getAttribute('direction'));
  }
  set direction(value: TransformBoxResizeDirection) {
    this.setAttribute('direction', value);
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
    'dsk-transform-box-handle-resize': DskTransformBoxHandleResize;
  }
}
