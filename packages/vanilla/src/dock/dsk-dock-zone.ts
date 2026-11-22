/** A consumer-positioned destination. No edge, size, or layout is imposed. */
export class DskDockZone extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:block; }
      :host([hidden]) { display:none!important; }
    </style><slot></slot>`;
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
    'dsk-dock-zone': DskDockZone;
  }
}
