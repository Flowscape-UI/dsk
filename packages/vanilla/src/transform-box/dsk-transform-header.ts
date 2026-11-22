/** Optional drag surface. Interactive descendants keep their native behavior. */
export class DskTransformHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:block; flex:none; box-sizing:border-box; touch-action:none; }
      :host([hidden]) { display:none!important; }
      :host(:focus-visible) { outline:2px solid var(--dsk-transform-color,#557be8); outline-offset:-2px; }
    </style><slot></slot>`;
  }
  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-transform-header': DskTransformHeader;
  }
}
