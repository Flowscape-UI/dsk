/** Dockable content. Mark a native button with data-dsk-dock-handle to opt into dragging. */
export class DskDockItem extends HTMLElement {
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
  /** Keep descendants connected when the browser supports state-preserving moves. */
  connectedMoveCallback(): void {}
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-dock-item': DskDockItem;
  }
}
