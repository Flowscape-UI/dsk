import { LayerTreeReorder } from './helpers/layer-tree-reorder.ts';

export interface ListToggleDetail {
  open: boolean;
}
export interface ListRenameDetail {
  oldLabel: string;
  label: string;
}

const chevron =
  '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="m6 4 4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Optional row content, styled through ordinary light DOM CSS. */
export class DskListHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host{display:block;min-width:0}:host([hidden]){display:none!important}</style><slot></slot>';
  }
}

/** Optional content below a branch, shown while the branch is open. */
export class DskListFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host{display:block;padding:var(--dsk-tree-footer-padding,8px 12px);color:var(--dsk-tree-muted-color,#737b8c);opacity:var(--dsk-tree-inherited-opacity,1)}:host([hidden]){display:none!important}</style><slot></slot>';
  }
}

function interactivePath(event: Event, boundary: HTMLElement): boolean {
  for (const node of event.composedPath()) {
    if (node === boundary) break;
    if (
      node instanceof HTMLElement &&
      node.matches(
        'button,a[href],input,select,textarea,[contenteditable="true"],[data-dsk-tree-action]',
      )
    )
      return true;
  }
  return false;
}

/** A tree row whose direct list-value children form its collapsible branch. */
export class DskListValue extends HTMLElement {
  static readonly observedAttributes = ['open', 'disabled', 'label'];
  private _generatedLabel: string | null = null;
  private readonly _row: HTMLElement;
  private readonly _children: HTMLElement;
  private readonly _expand: HTMLElement;
  private readonly _collapse: HTMLElement;
  private readonly _observer: MutationObserver;
  private _listeners: AbortController | undefined;
  private readonly _editor: HTMLInputElement;
  private _editing = false;
  private _beforeClickOpen = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{display:block;color:inherit;font:inherit;outline:none}
      :host([hidden]){display:none!important}
      [part=row]{display:flex;align-items:center;gap:var(--dsk-tree-gap,8px);min-height:var(--dsk-tree-row-height,34px);padding:var(--dsk-tree-row-padding,0 10px);border-radius:var(--dsk-tree-radius,6px);box-sizing:border-box;cursor:pointer;user-select:none}
      [part=row]:hover{background:var(--dsk-tree-hover-background,#eef1f7)}
      :host(:focus-visible)>[part=row]{outline:2px solid var(--dsk-tree-focus-color,#557be8);outline-offset:-2px}
      :host([disabled]){--dsk-tree-inherited-opacity:var(--dsk-tree-disabled-opacity,.45)}
      [part=row]{opacity:var(--dsk-tree-inherited-opacity,1)}
      :host([disabled])>[part=row]{cursor:default}
      [part=toggle],[part=icon]{display:flex;align-items:center;justify-content:center;flex:none;width:var(--dsk-tree-icon-size,16px);height:var(--dsk-tree-icon-size,16px);color:var(--dsk-tree-icon-color,currentColor)}
      [part=toggle][data-leaf]{visibility:hidden}
      [part=label]{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      [part=editor]{box-sizing:border-box;width:100%;min-width:0;font:inherit;color:inherit;background:var(--dsk-tree-editor-background,transparent);border:1px solid var(--dsk-tree-focus-color,#557be8);border-radius:2px;padding:2px 4px;outline:none}
      [part=children]{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--dsk-tree-duration,180ms) var(--dsk-tree-easing,ease)}
      :host([open])>[part=children]{grid-template-rows:1fr}
      .dsk-tree-clip{min-height:0;overflow:hidden}
      [part=branch]{padding-inline-start:var(--dsk-tree-indent,20px)}
      [hidden]{display:none!important}
      .dsk-tree-collapse svg{transform:rotate(90deg)}
      @media(prefers-reduced-motion:reduce){[part=children]{transition:none}}
    </style>
    <div part="row" draggable="true">
      <span part="toggle" aria-hidden="true"><span class="dsk-tree-expand"><slot name="expand-icon">${chevron}</slot></span><span class="dsk-tree-collapse"><slot name="collapse-icon">${chevron}</slot></span></span>
      <span part="icon" aria-hidden="true"><slot name="icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor"/></svg></slot></span>
      <span part="label"><slot name="header"><span class="dsk-tree-label"></span></slot><input part="editor" aria-label="Layer name" hidden></span>
    </div>
    <div part="children" role="group"><div class="dsk-tree-clip"><div part="branch"><slot></slot><slot name="footer"></slot></div></div></div>`;
    this._row = root.querySelector<HTMLElement>('[part=row]')!;
    this._editor = root.querySelector<HTMLInputElement>('[part=editor]')!;
    this._children = root.querySelector<HTMLElement>('[part=children]')!;
    this._expand = root.querySelector<HTMLElement>('.dsk-tree-expand')!;
    this._collapse = root.querySelector<HTMLElement>('.dsk-tree-collapse')!;
    this._observer = new MutationObserver(() => this._sync());
  }

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'treeitem');
    for (const property of ['open', 'disabled', 'label']) {
      if (!Object.hasOwn(this, property)) continue;
      const value: unknown = Reflect.get(this, property);
      Reflect.deleteProperty(this, property);
      Reflect.set(this, property, value);
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    this._row.addEventListener('click', this._onClick, {
      signal: this._listeners.signal,
    });
    this._row.addEventListener(
      'dblclick',
      (event) => {
        if (interactivePath(event, this._row)) return;
        this.open = this._beforeClickOpen;
        this.startRename();
      },
      { signal: this._listeners.signal },
    );
    this._editor.addEventListener(
      'keydown',
      (event) => {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          this._finishRename(event.key === 'Enter');
          this.focus();
        }
      },
      { signal: this._listeners.signal },
    );
    this._editor.addEventListener('blur', () => this._finishRename(true), {
      signal: this._listeners.signal,
    });
    this.addEventListener('keydown', this._onKeyDown, {
      signal: this._listeners.signal,
    });
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    if (!this.hasAttribute('tabindex')) this.tabIndex = this.disabled ? -1 : 0;
    this._sync();
    queueMicrotask(() => {
      if (this.isConnected) this._sync();
    });
  }

  disconnectedCallback(): void {
    this._finishRename(false);
    this._listeners?.abort();
    this._observer.disconnect();
  }

  attributeChangedCallback(): void {
    this._sync();
  }

  get open(): boolean {
    return this.hasAttribute('open');
  }
  set open(value: boolean) {
    this.toggleAttribute('open', Boolean(value));
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', Boolean(value));
  }
  get label(): string {
    return this.getAttribute('label') ?? '';
  }
  private _nameNode(): Element | Text | null {
    const header = Array.from(this.children).find(
      (child) =>
        child.getAttribute('slot') === 'header' ||
        child.localName === 'dsk-list-header',
    );
    if (!header) return null;
    const marked = header.querySelector('[data-dsk-name]');
    if (marked) return marked;
    const walker = this.ownerDocument.createTreeWalker(
      header,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (node instanceof Text && node.textContent?.trim()) return node;
    return header;
  }
  get displayName(): string {
    return this._nameNode()?.textContent?.trim() || this.label;
  }
  startRename(): void {
    if (this.disabled || this._editing) return;
    this._editing = true;
    this._editor.value = this.displayName;
    this._editor.hidden = false;
    this.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name=header]',
    )!.hidden = true;
    this._row.draggable = false;
    this._editor.focus();
    this._editor.select();
  }
  private _finishRename(commit: boolean): void {
    if (!this._editing) return;
    this._editing = false;
    const oldLabel = this.displayName;
    const label = this._editor.value.trim();
    this._editor.hidden = true;
    this.shadowRoot!.querySelector<HTMLSlotElement>(
      'slot[name=header]',
    )!.hidden = false;
    this._row.draggable = true;
    if (commit && !this.disabled && label && label !== oldLabel) {
      const name = this._nameNode();
      if (name) name.textContent = label;
      this.label = label;
      this.dispatchEvent(
        new CustomEvent<ListRenameDetail>('rename', {
          detail: { oldLabel, label },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
  set label(value: string) {
    this.setAttribute('label', value);
  }
  get items(): readonly DskListValue[] {
    return Array.from(this.children).filter(
      (child): child is DskListValue => child instanceof DskListValue,
    );
  }
  get expandable(): boolean {
    return (
      this.items.length > 0 ||
      Array.from(this.children).some(
        (child) => child.localName === 'dsk-list-footer',
      )
    );
  }

  toggle(force = !this.open): void {
    if (!this.expandable || force === this.open) return;
    this.open = force;
    this.dispatchEvent(
      new CustomEvent<ListToggleDetail>('toggle', {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _sync(): void {
    for (const child of this.children) {
      if (!child.hasAttribute('slot') && child.localName === 'dsk-list-header')
        child.setAttribute('slot', 'header');
      if (!child.hasAttribute('slot') && child.localName === 'dsk-list-footer')
        child.setAttribute('slot', 'footer');
    }
    if (
      !this.hasAttribute('aria-label') ||
      this.getAttribute('aria-label') === this._generatedLabel
    ) {
      this._generatedLabel = this.displayName;
      this.setAttribute('aria-label', this._generatedLabel);
    }
    this.shadowRoot!.querySelector('.dsk-tree-label')!.textContent = this.label;
    if (this.expandable) this.setAttribute('aria-expanded', String(this.open));
    else this.removeAttribute('aria-expanded');
    this.setAttribute('aria-disabled', String(this.disabled));
    if (!this.closest('dsk-layer-tree'))
      this.tabIndex = this.disabled && !this.expandable ? -1 : 0;
    this._row
      .querySelector('[part=toggle]')!
      .toggleAttribute('data-leaf', !this.expandable);
    this._expand.hidden = this.open;
    this._collapse.hidden = !this.open;
    if (!this.open && this._children.matches(':focus-within')) this.focus();
    this._children.inert = !this.open;
    this._children.setAttribute('aria-hidden', String(!this.open));
  }

  private readonly _onClick = (event: MouseEvent): void => {
    if (
      (this.disabled && !this.expandable) ||
      interactivePath(event, this._row)
    )
      return;
    if (event.detail === 2) return;
    this._beforeClickOpen = this.open;
    this.focus();
    this.toggle();
  };
  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (
      this.closest('dsk-layer-tree') ||
      event.composedPath().find((node) => node instanceof DskListValue) !==
        this ||
      (this.disabled && !this.expandable) ||
      interactivePath(event, this)
    )
      return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  };
}

/** Roving keyboard focus and nesting semantics for a declarative layer list. */
export class DskLayerTree extends HTMLElement {
  private readonly _searchState = new Map<
    DskListValue,
    { hidden: HTMLElement['hidden']; open: boolean }
  >();
  private readonly _reorder: LayerTreeReorder;
  private readonly _observer: MutationObserver;
  private _listeners: AbortController | undefined;
  private _current: DskListValue | undefined;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML =
      `<style>:host{display:block;color:var(--dsk-tree-color,inherit);background:var(--dsk-tree-background,transparent);font:inherit}:host([hidden]){display:none!important}</style><slot name="search"></slot><div part="header"><slot name="header"></slot></div><div part="list"><slot></slot></div><div part="footer"><slot name="footer"></slot></div>`;
    this._observer = new MutationObserver(() => this._sync());
    this._reorder = new LayerTreeReorder(this);
  }
  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'tree');
    this._reorder.connect();
    this._listeners?.abort();
    this._listeners = new AbortController();
    this.addEventListener('keydown', this._onKeyDown, {
      signal: this._listeners.signal,
    });
    this.addEventListener('focusin', this._onFocus, {
      signal: this._listeners.signal,
    });
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['open', 'disabled', 'hidden', 'label', 'value'],
    });
    this._sync();
    queueMicrotask(() => {
      if (this.isConnected) this._sync();
    });
  }
  disconnectedCallback(): void {
    this._reorder.disconnect();
    this._listeners?.abort();
    this._observer.disconnect();
    this._clearSearch();
  }
  get items(): readonly DskListValue[] {
    return Array.from(this.querySelectorAll('dsk-list-value')).filter(
      (item) => item.closest('dsk-layer-tree') === this,
    );
  }
  get reorderable(): boolean {
    return this.getAttribute('reorderable') !== 'false';
  }
  set reorderable(value: boolean) {
    this.setAttribute('reorderable', String(Boolean(value)));
  }
  get visibleItems(): readonly DskListValue[] {
    return this.items.filter((item) => {
      if (item.hidden || (item.disabled && !item.expandable)) return false;
      for (
        let parent = item.parentElement;
        parent && parent !== this;
        parent = parent.parentElement
      ) {
        if (parent.hidden || (parent instanceof DskListValue && !parent.open))
          return false;
      }
      return true;
    });
  }
  private _sync(): void {
    for (const child of this.children) {
      if (!child.hasAttribute('slot') && child.localName === 'dsk-tree-search')
        child.setAttribute('slot', 'search');
      if (!child.hasAttribute('slot') && child.localName === 'dsk-list-header')
        child.setAttribute('slot', 'header');
      if (!child.hasAttribute('slot') && child.localName === 'dsk-list-footer')
        child.setAttribute('slot', 'footer');
    }
    this._filter();
    const visible = this.visibleItems;
    if (!this._current || !visible.includes(this._current))
      this._current = visible[0];
    for (const item of this.items)
      item.tabIndex = item === this._current ? 0 : -1;
  }
  private _clearSearch(): void {
    for (const [item, state] of this._searchState) {
      item.hidden = state.hidden;
      item.open = state.open;
    }
    this._searchState.clear();
  }
  private _filter(): void {
    const search = Array.from(this.children).find(
      (child) => child.localName === 'dsk-tree-search',
    );
    const query = (search?.getAttribute('value') ?? '')
      .trim()
      .toLocaleLowerCase();
    if (!query) {
      if (this._searchState.size) this._clearSearch();
      return;
    }
    const items = this.items;
    for (const [item, state] of this._searchState)
      if (!items.includes(item)) {
        item.hidden = state.hidden;
        item.open = state.open;
        this._searchState.delete(item);
      }
    for (const item of items)
      if (!this._searchState.has(item))
        this._searchState.set(item, { hidden: item.hidden, open: item.open });
    const shown = new Set<DskListValue>();
    const expanded = new Set<DskListValue>();
    const browsable = new Set<DskListValue>();
    for (const item of items) {
      if (this._searchState.get(item)!.hidden) continue;
      const chain: DskListValue[] = [];
      for (
        let parent = item.parentElement?.closest('dsk-list-value');
        parent && items.includes(parent);
        parent = parent.parentElement?.closest('dsk-list-value')
      )
        chain.push(parent);
      if (chain.some((parent) => this._searchState.get(parent)!.hidden))
        continue;
      const matches = item.displayName.toLocaleLowerCase().includes(query);
      if (
        matches ||
        chain.some((parent) =>
          parent.displayName.toLocaleLowerCase().includes(query),
        )
      ) {
        shown.add(item);
        browsable.add(item);
      }
      if (!matches) continue;
      shown.add(item);
      for (const parent of chain) {
        shown.add(parent);
        expanded.add(parent);
      }
    }
    for (const item of items) {
      if (item.hidden !== !shown.has(item)) item.hidden = !shown.has(item);
      if (!browsable.has(item) && item.open !== expanded.has(item))
        item.open = expanded.has(item);
    }
  }
  private readonly _onFocus = (event: FocusEvent): void => {
    const item = event
      .composedPath()
      .find((node): node is DskListValue => node instanceof DskListValue);
    if (!item || !this.visibleItems.includes(item)) return;
    this._current = item;
    this._sync();
  };
  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    const item = event
      .composedPath()
      .find((node): node is DskListValue => node instanceof DskListValue);
    const visible = this.visibleItems;
    if (!item || !visible.includes(item) || interactivePath(event, item))
      return;
    const index = visible.indexOf(item);
    if (event.key === 'F2') {
      event.preventDefault();
      item.startRename();
      return;
    }
    if (
      event.altKey &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      event.preventDefault();
      event.stopPropagation();
      this._reorder.changeLevel(item, event.key === 'ArrowRight');
      return;
    }
    if (
      event.altKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault();
      event.stopPropagation();
      this._reorder.move(item, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    let next: DskListValue | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = visible[index + 1];
        break;
      case 'ArrowUp':
        next = visible[index - 1];
        break;
      case 'Home':
        next = visible[0];
        break;
      case 'End':
        next = visible.at(-1);
        break;
      case 'ArrowRight':
        if (!item.open) item.toggle(true);
        else next = item.items.find((child) => visible.includes(child));
        break;
      case 'ArrowLeft':
        if (item.open && item.expandable) item.toggle(false);
        else next = item.parentElement?.closest('dsk-list-value') ?? undefined;
        break;
      case 'Enter':
      case ' ':
        item.toggle();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    next?.focus();
    this._sync();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-layer-tree': DskLayerTree;
    'dsk-list-value': DskListValue;
    'dsk-list-header': DskListHeader;
    'dsk-list-footer': DskListFooter;
  }
}
