import type { DskLayerTree, DskListValue } from '../dsk-layer-tree.ts';

export interface LayerReorderDetail {
  item: DskListValue;
  parent: HTMLElement;
  oldParent: HTMLElement;
  position: 'before' | 'after' | 'inside';
  oldIndex: number;
  newIndex: number;
}

/** Native dragging keeps the original DOM in place and supplies the translucent cursor image. */
export class LayerTreeReorder {
  private readonly _tree: DskLayerTree;
  private readonly _line: HTMLElement;
  private readonly _status: HTMLElement;
  private _listeners: AbortController | undefined;
  private _source: DskListValue | undefined;
  private _target: DskListValue | DskLayerTree | undefined;
  private _position: LayerReorderDetail['position'] = 'before';

  constructor(tree: DskLayerTree) {
    this._tree = tree;
    const style = document.createElement('style');
    style.textContent = `
      [part=drop-indicator]{position:fixed;inset:auto;margin:0;padding:0;border:0;overflow:visible;height:var(--dsk-tree-drop-line-width,2px);background:var(--dsk-tree-drop-color,#0d99ff);color:var(--dsk-tree-drop-color,#0d99ff);pointer-events:none;z-index:2147483647}
      [part=drop-indicator]::before{content:"";position:absolute;left:0;top:50%;width:var(--dsk-tree-drop-dot-size,6px);height:var(--dsk-tree-drop-dot-size,6px);box-sizing:border-box;border:2px solid currentColor;border-radius:50%;background:var(--dsk-tree-drop-dot-background,#fff);transform:translate(-50%,-50%)}
      [part=drop-indicator][data-inside]{box-sizing:border-box;border:2px solid currentColor;border-radius:var(--dsk-tree-radius,6px);background:var(--dsk-tree-drop-background,color-mix(in srgb,#0d99ff 12%,transparent))}
      [part=drop-indicator][data-inside]::before{display:none}
      [part=reorder-status]{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    `;
    this._line = document.createElement('div');
    this._line.setAttribute('part', 'drop-indicator');
    this._line.setAttribute('popover', 'manual');
    this._line.setAttribute('aria-hidden', 'true');
    this._status = document.createElement('div');
    this._status.setAttribute('part', 'reorder-status');
    this._status.setAttribute('aria-live', 'polite');
    tree.shadowRoot!.append(style, this._line, this._status);
  }

  connect(): void {
    this.disconnect();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._tree.addEventListener('dragstart', this._start, options);
    this._tree.addEventListener('dragover', this._over, options);
    this._tree.addEventListener('drop', this._drop, options);
    this._tree.addEventListener('dragend', this._end, options);
    this._tree.addEventListener('dragleave', this._leave, options);
    this._tree.ownerDocument.addEventListener('keydown', this._key, options);
    this._tree.ownerDocument.addEventListener('scroll', this._hide, {
      ...options,
      capture: true,
    });
  }

  disconnect(): void {
    this._listeners?.abort();
    this._end();
  }

  move(item: DskListValue, direction: -1 | 1): void {
    if (!this._allowed(item)) return;
    const siblings = this._siblings(item);
    const target = siblings[siblings.indexOf(item) + direction];
    if (target) this._commit(item, target, direction > 0 ? 'after' : 'before');
  }

  changeLevel(item: DskListValue, indent: boolean): void {
    const siblings = this._siblings(item);
    const target = indent
      ? siblings[siblings.indexOf(item) - 1]
      : item.parentElement?.closest('dsk-list-value');
    if (target) this._commit(item, target, indent ? 'inside' : 'after');
  }

  private _boundary(node: HTMLElement | null): HTMLElement | null {
    while (node && node !== this._tree) {
      if (node.localName === 'dsk-list-value' && node.hasAttribute('disabled'))
        return node;
      node = node.parentElement;
    }
    return null;
  }
  private _allowed(item: DskListValue): boolean {
    return (
      !item.disabled &&
      this._tree.reorderable &&
      this._tree.visibleItems.includes(item) &&
      item.getAttribute('draggable') !== 'false'
    );
  }
  private _siblings(item: DskListValue): DskListValue[] {
    return this._tree.items.filter(
      (other) => other.parentElement === item.parentElement,
    );
  }
  private _eventItem(event: Event): DskListValue | undefined {
    const items = this._tree.items;
    for (const node of event.composedPath()) {
      const item = items.find((candidate) => candidate === node);
      if (item) return item;
    }
    return undefined;
  }
  private readonly _start = (event: DragEvent): void => {
    const item = this._eventItem(event);
    if (!item) return;
    const row = item.shadowRoot!.querySelector<HTMLElement>('[part=row]')!;
    if (!event.composedPath().includes(row)) return;
    const path = event.composedPath();
    if (
      path
        .slice(0, path.indexOf(row))
        .some(
          (node) =>
            node instanceof HTMLElement &&
            node.matches(
              'button,a[href],input,select,textarea,[contenteditable="true"],[data-dsk-tree-action]',
            ),
        )
    ) {
      event.preventDefault();
      return;
    }
    if (!this._allowed(item) || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    this._source = item;
    const rect = row.getBoundingClientRect();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      item.getAttribute('aria-label') ?? item.label,
    );
    event.dataTransfer.setDragImage(
      row,
      Math.max(0, event.clientX - rect.left),
      Math.max(0, event.clientY - rect.top),
    );
    event.stopPropagation();
  };
  private readonly _over = (event: DragEvent): void => {
    const source = this._source;
    if (!source || !this._allowed(source)) {
      this._hide();
      return;
    }
    let target: DskListValue | DskLayerTree =
      this._eventItem(event) ?? this._tree;
    let row = target.shadowRoot!.querySelector<HTMLElement>('[part=row]');
    // Moving left across indentation promotes the insertion point to an ancestor.
    while (row && event.clientX < row.getBoundingClientRect().left) {
      const parent = target.parentElement?.closest('dsk-list-value');
      if (!parent) break;
      target = parent;
      row = target.shadowRoot!.querySelector<HTMLElement>('[part=row]');
    }
    const rect = (row ?? target).getBoundingClientRect();
    const position = !row
      ? 'inside'
      : event.clientY < rect.top + rect.height * 0.25
        ? 'before'
        : event.clientY > rect.bottom - rect.height * 0.25
          ? 'after'
          : 'inside';
    if (!this._destination(source, target, position)) {
      this._hide();
      return;
    }
    this._target = target;
    this._position = position;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const inside = position === 'inside' && target !== this._tree;
    this._line.toggleAttribute('data-inside', inside);
    this._line.dataset.position = position;
    Object.assign(this._line.style, {
      left: `${rect.left + 6}px`,
      top: `${inside || position === 'before' ? rect.top : target.getBoundingClientRect().bottom}px`,
      width: `${Math.max(0, rect.width - 6)}px`,
      height: inside
        ? `${rect.height}px`
        : 'var(--dsk-tree-drop-line-width,2px)',
    });
    if (!this._line.matches(':popover-open')) this._line.showPopover();
  };
  private readonly _drop = (event: DragEvent): void => {
    if (!this._source || !this._target) return;
    event.preventDefault();
    event.stopPropagation();
    const source = this._source;
    const target = this._target;
    const position = this._position;
    this._end();
    this._commit(source, target, position);
  };
  private _destination(
    item: DskListValue,
    target: DskListValue | DskLayerTree,
    position: LayerReorderDetail['position'],
  ): HTMLElement | null {
    if (
      target !== this._tree &&
      !this._tree.items.includes(target as DskListValue)
    )
      return null;
    const parent = position === 'inside' ? target : target.parentElement;
    if (!parent || target === item || item.contains(parent) || parent === item)
      return null;
    if (this._boundary(item.parentElement) !== this._boundary(parent))
      return null;
    for (
      let node: HTMLElement | null = parent;
      node && node !== this._tree;
      node = node.parentElement
    )
      if (node.hidden) return null;
    return parent;
  }
  private _commit(
    item: DskListValue,
    target: DskListValue | DskLayerTree,
    position: LayerReorderDetail['position'],
  ): void {
    if (!this._allowed(item)) return;
    const oldParent = item.parentElement;
    const parent = this._destination(item, target, position);
    if (!parent || !oldParent) return;
    const siblings = this._siblings(item);
    const oldIndex = siblings.indexOf(item);
    const next = this._tree.items.filter(
      (sibling) => sibling.parentElement === parent && sibling !== item,
    );
    const newIndex =
      position === 'inside'
        ? next.length
        : next.indexOf(target as DskListValue) + (position === 'after' ? 1 : 0);
    if (oldParent === parent && oldIndex === newIndex) return;
    const detail: LayerReorderDetail = {
      item,
      parent,
      oldParent,
      position,
      oldIndex,
      newIndex,
    };
    if (
      !this._tree.dispatchEvent(
        new CustomEvent<LayerReorderDetail>('beforereorder', {
          detail,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      )
    )
      return;
    // Listeners may change the tree; never apply a stale drop to a new parent.
    if (
      item.parentElement !== oldParent ||
      this._destination(item, target, position) !== parent ||
      !this._allowed(item)
    )
      return;
    const reference =
      position === 'inside'
        ? (next.at(-1)?.nextSibling ??
          Array.from(parent.children).find(
            (child) => child.localName === 'dsk-list-footer',
          ) ??
          null)
        : position === 'after'
          ? target.nextSibling
          : target;
    parent.insertBefore(item, reference);
    if (position === 'inside' && target !== this._tree)
      (target as DskListValue).open = true;
    item.focus({ preventScroll: true });
    this._status.textContent = `${item.getAttribute('aria-label') ?? item.label}: ${newIndex + 1} / ${next.length + 1}`;
    this._tree.dispatchEvent(
      new CustomEvent<LayerReorderDetail>('reorder', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
  private readonly _hide = (): void => {
    this._target = undefined;
    if (this._line.matches(':popover-open')) this._line.hidePopover();
  };
  private readonly _end = (): void => {
    this._hide();
    this._source = undefined;
  };
  private readonly _key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this._end();
  };
  private readonly _leave = (event: DragEvent): void => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !this._tree.contains(event.relatedTarget)
    )
      this._hide();
  };
}
