import {
  bindCanvasWidget,
  resolveCanvasCamera,
  type CanvasCamera,
  type CanvasWidgetBinding,
} from './coordinates.ts';

/** HTML annotation pinned to world coordinates, with independent camera tracking. */
export class DskCanvasMarker extends HTMLElement {
  static readonly observedAttributes = [
    'x',
    'y',
    'pan-x',
    'pan-y',
    'zoom',
    'follow-pan',
    'follow-zoom',
    'scale-with-zoom',
    'label',
  ];
  private _binding: CanvasWidgetBinding | undefined;
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host{display:inline-block;font:12px sans-serif;white-space:nowrap;color:var(--dsk-marker-color,#fff);z-index:var(--dsk-marker-z-index,1)}
      :host([hidden]){display:none!important}
      [part=container]{display:flex;align-items:center;gap:6px;padding:var(--dsk-marker-padding,6px 9px);border-radius:var(--dsk-marker-radius,6px);background:var(--dsk-marker-background,#557be8);box-shadow:var(--dsk-marker-shadow,0 2px 8px #0002)}
      [part=pin]{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
    </style><div part="container"><span part="pin" aria-hidden="true"></span><slot><span part="label">Marker</span></slot></div>`;
  }
  connectedCallback(): void {
    for (const name of [
      'x',
      'y',
      'camera',
      'followPan',
      'followZoom',
      'scaleWithZoom',
    ]) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    this._binding?.dispose();
    this._binding = bindCanvasWidget(this);
    this._sync();
  }
  disconnectedCallback(): void {
    this._binding?.dispose();
    this._binding = undefined;
  }
  attributeChangedCallback(): void {
    this._sync();
  }
  private _number(name: string, fallback: number): number {
    const raw = this.getAttribute(name);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }
  get x(): number {
    return this._number('x', 0);
  }
  set x(value: number) {
    this.setAttribute('x', String(value));
  }
  get y(): number {
    return this._number('y', 0);
  }
  set y(value: number) {
    this.setAttribute('y', String(value));
  }
  get followPan(): boolean {
    return this.getAttribute('follow-pan') !== 'false';
  }
  set followPan(value: boolean) {
    this.setAttribute('follow-pan', String(value));
  }
  get followZoom(): boolean {
    return this.getAttribute('follow-zoom') !== 'false';
  }
  set followZoom(value: boolean) {
    this.setAttribute('follow-zoom', String(value));
  }
  get scaleWithZoom(): boolean {
    return (
      this.hasAttribute('scale-with-zoom') &&
      this.getAttribute('scale-with-zoom') !== 'false'
    );
  }
  set scaleWithZoom(value: boolean) {
    this.toggleAttribute('scale-with-zoom', value);
  }
  get camera(): CanvasCamera {
    return {
      panX: this._number('pan-x', 0),
      panY: this._number('pan-y', 0),
      zoom: Math.max(1e-12, Math.min(1e12, this._number('zoom', 1))),
    };
  }
  set camera(value: CanvasCamera) {
    const camera = resolveCanvasCamera(value);
    this.setAttribute('pan-x', String(camera.panX));
    this.setAttribute('pan-y', String(camera.panY));
    this.setAttribute('zoom', String(camera.zoom));
  }
  private _sync(): void {
    this.shadowRoot!.querySelector('[part=label]')!.textContent =
      this.getAttribute('label') ?? 'Marker';
    this._binding?.update({
      camera: this.camera,
      position: { x: this.x, y: this.y },
      followPan: this.followPan,
      followZoom: this.followZoom,
      scaleWithZoom: this.scaleWithZoom,
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-canvas-marker': DskCanvasMarker;
  }
}
