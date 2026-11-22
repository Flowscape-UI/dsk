import { DskDockItem } from './dsk-dock-item.ts';
import { DskDockZone } from './dsk-dock-zone.ts';

export interface DockDetail {
  item: DskDockItem;
  from: DskDockZone;
  to: DskDockZone | null;
}
interface DockGesture extends DockDetail {
  handle: HTMLElement;
  pointer: number | null;
  x: number;
  y: number;
  active: boolean;
}

/** Layout-free docking. Zones and handles belong to the consumer's light DOM. */
export class DskDock extends HTMLElement {
  static observedAttributes = ['disabled', 'readonly'];
  private _gesture: DockGesture | null = null;
  private _listeners: AbortController | null = null;
  private readonly _preview: HTMLElement;
  private readonly _status: HTMLElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host { display:block; }
      :host([hidden]) { display:none!important; }
      [part=preview] { position:fixed; margin:0; inset:auto; pointer-events:none;
        padding:8px 12px; border:1px solid var(--dsk-dock-preview-border,#777);
        background:var(--dsk-dock-preview-background,#202024); color:var(--dsk-dock-preview-color,#fff);
        font:inherit; z-index:2147483647; }
      [part=preview][hidden] { display:none!important; }
      [part=status] { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
    </style><slot></slot><div part="preview" popover="manual" hidden></div><span part="status" role="status" aria-live="polite"></span>`;
    this._preview = shadow.querySelector<HTMLElement>('[part=preview]')!;
    this._status = shadow.querySelector<HTMLElement>('[part=status]')!;
  }
  connectedCallback(): void {
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this.addEventListener('pointerdown', this._down, options);
    this.addEventListener('keydown', this._key, options);
    this.ownerDocument.addEventListener('pointermove', this._move, options);
    this.ownerDocument.addEventListener('pointerup', this._up, options);
    this.ownerDocument.addEventListener('pointercancel', this._cancel, options);
    this.ownerDocument.addEventListener(
      'lostpointercapture',
      this._cancel,
      options,
    );
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._cancel,
      options,
    );
  }
  disconnectedCallback(): void {
    this.cancel();
    this._listeners?.abort();
    this._listeners = null;
  }
  attributeChangedCallback(): void {
    if (this.disabled || this.readOnly) this.cancel();
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('readonly', value);
  }
  get zones(): DskDockZone[] {
    return [...this.querySelectorAll('dsk-dock-zone')].filter(
      (z) => z.closest('dsk-dock') === this,
    );
  }
  get items(): DskDockItem[] {
    return [...this.querySelectorAll('dsk-dock-item')].filter(
      (i) => i.closest('dsk-dock') === this,
    );
  }
  private _available(zone: DskDockZone, item: DskDockItem): boolean {
    return (
      zone.closest('dsk-dock') === this &&
      !zone.disabled &&
      !item.contains(zone) &&
      zone.getClientRects().length > 0 &&
      getComputedStyle(zone).visibility !== 'hidden'
    );
  }
  /** Silent programmatic assignment. Appends the existing item; never clones its content. */
  dock(item: DskDockItem, zone: DskDockZone): boolean {
    this.cancel();
    if (
      !this.items.includes(item) ||
      !this.zones.includes(zone) ||
      item.contains(zone)
    )
      throw new RangeError('Item and destination must belong to this dock.');
    if (item.closest('dsk-dock-zone') === zone) return false;
    this._place(item, zone);
    return true;
  }
  private _place(item: DskDockItem, zone: DskDockZone): void {
    if (typeof zone.moveBefore === 'function') zone.moveBefore(item, null);
    else zone.append(item);
  }
  cancel(): void {
    this._finish(false);
  }
  private _detail(g: DockGesture): DockDetail {
    return { item: g.item, from: g.from, to: g.to };
  }
  private _emit(name: string, detail: DockDetail, cancelable = false): boolean {
    return this.dispatchEvent(
      new CustomEvent<DockDetail>(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable,
      }),
    );
  }
  private _handle(event: Event): HTMLElement | null {
    const handle = event
      .composedPath()
      .find(
        (e): e is HTMLElement =>
          e instanceof HTMLElement && e.hasAttribute('data-dsk-dock-handle'),
      );
    if (
      !handle ||
      handle.closest('dsk-dock') !== this ||
      handle.matches(':disabled')
    )
      return null;
    return handle;
  }
  private _begin(
    handle: HTMLElement,
    pointer: number | null,
    x: number,
    y: number,
  ): void {
    if (this.disabled || this.readOnly || this._gesture) return;
    const item = handle.closest('dsk-dock-item'),
      from = item?.closest('dsk-dock-zone');
    if (!item || !from || item.disabled || from.disabled) return;
    this._gesture = {
      item,
      from,
      to: from,
      handle,
      pointer,
      x,
      y,
      active: false,
    };
    if (pointer === null) this._activate();
  }
  private _activate(): void {
    const g = this._gesture;
    if (!g || g.active) return;
    if (!this._emit('dockstart', this._detail(g), true)) {
      this._gesture = null;
      return;
    }
    if (this._gesture !== g || this.disabled || this.readOnly) return;
    g.active = true;
    this.setAttribute('data-dragging', '');
    g.item.setAttribute('data-dragging', '');
    for (const zone of this.zones)
      if (this._available(zone, g.item))
        zone.setAttribute('data-dock-active', '');
    g.from.setAttribute('data-drag-over', '');
    this._status.textContent =
      'Choose a destination with arrow keys, then press Enter. Escape cancels.';
  }
  private _target(zone: DskDockZone | null): void {
    const g = this._gesture;
    if (!g || g.to === zone) return;
    g.to?.removeAttribute('data-drag-over');
    g.to = zone;
    zone?.setAttribute('data-drag-over', '');
    this._status.textContent = zone
      ? `Destination: ${zone.getAttribute('aria-label') || zone.id || 'zone'}`
      : 'No destination.';
    this._emit('dockover', this._detail(g));
  }
  private readonly _down = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    const handle = this._handle(event);
    if (!handle) return;
    this._begin(handle, event.pointerId, event.clientX, event.clientY);
    if (!this._gesture) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
  };
  private readonly _move = (event: PointerEvent): void => {
    const g = this._gesture;
    if (!g || g.pointer !== event.pointerId) return;
    if (!g.item.isConnected || g.item.disabled || g.from.disabled) {
      this.cancel();
      return;
    }
    if (!g.active && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 4)
      return;
    this._activate();
    if (!this._gesture) return;
    const zone =
      this.ownerDocument
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('dsk-dock-zone') ?? null;
    this._target(zone && this._available(zone, g.item) ? zone : null);
    this._preview.textContent = g.item.getAttribute('aria-label') || 'Panel';
    this._preview.hidden = false;
    if (
      typeof this._preview.showPopover === 'function' &&
      !this._preview.matches(':popover-open')
    )
      this._preview.showPopover();
    this._preview.style.left = `${Math.max(0, Math.min(event.clientX + 12, (this.ownerDocument.defaultView?.innerWidth ?? 1024) - this._preview.offsetWidth))}px`;
    this._preview.style.top = `${Math.max(0, event.clientY - this._preview.offsetHeight - 12)}px`;
  };
  private readonly _up = (event: PointerEvent): void => {
    if (this._gesture?.pointer === event.pointerId) this._finish(true);
  };
  private readonly _cancel = (): void => {
    this.cancel();
  };
  private _finish(commit: boolean): void {
    const g = this._gesture;
    if (!g) return;
    this._gesture = null;
    if (g.pointer !== null && g.handle.hasPointerCapture(g.pointer))
      g.handle.releasePointerCapture(g.pointer);
    let moved = false;
    const valid =
      g.active &&
      commit &&
      !this.disabled &&
      !this.readOnly &&
      !g.item.disabled &&
      this.items.includes(g.item) &&
      g.to &&
      this._available(g.to, g.item);
    if (
      valid &&
      g.to &&
      g.to !== g.from &&
      this._emit('beforedock', this._detail(g), true)
    ) {
      // A consumer may remove a destination from its beforedock listener.
      if (
        this.items.includes(g.item) &&
        !this.disabled &&
        !this.readOnly &&
        !g.item.disabled &&
        this.zones.includes(g.to) &&
        this._available(g.to, g.item)
      ) {
        this._place(g.item, g.to);
        moved = true;
      }
    }
    this.removeAttribute('data-dragging');
    g.item.removeAttribute('data-dragging');
    for (const z of new Set([...this.zones, g.from, ...(g.to ? [g.to] : [])])) {
      z.removeAttribute('data-dock-active');
      z.removeAttribute('data-drag-over');
    }
    if (this._preview.matches(':popover-open')) this._preview.hidePopover();
    this._preview.hidden = true;
    if (!g.active) return;
    if (moved) {
      g.handle.focus({ preventScroll: true });
      this._emit('change', this._detail(g));
      this._status.textContent = 'Panel moved.';
      this._emit('dockend', this._detail(g));
      return;
    }
    this._status.textContent = 'Move cancelled.';
    this._emit('dockcancel', this._detail(g));
  }
  private readonly _key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._gesture) {
      event.preventDefault();
      this.cancel();
      return;
    }
    const handle = this._handle(event);
    if (!handle) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return;
      if (this._gesture?.pointer === null) this._finish(true);
      else if (!this._gesture) this._begin(handle, null, 0, 0);
    } else if (
      this._gesture?.pointer === null &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      const zones = this.zones.filter((z) =>
        this._available(z, this._gesture!.item),
      );
      if (!zones.length) return;
      const index = zones.indexOf(this._gesture.to!),
        delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      this._target(zones[(index + delta + zones.length) % zones.length]!);
    } else if (event.key === 'Tab' && this._gesture) this.cancel();
  };
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-dock': DskDock;
  }
}
