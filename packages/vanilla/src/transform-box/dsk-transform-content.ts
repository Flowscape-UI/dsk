/** Content-only region. Its interactions never initiate box transformations. */
export class DskTransformContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:block; flex:1 1 auto; min-width:0; min-height:0; box-sizing:border-box; overflow:auto; touch-action:auto; }
      :host([hidden]) { display:none!important; }
    </style><slot></slot>`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-transform-content': DskTransformContent;
  }
}
