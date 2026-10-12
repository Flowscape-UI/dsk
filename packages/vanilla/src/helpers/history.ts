/** Bounded component-local history. Callers store immutable snapshots. */
export class DskHistory<T> {
  private _entries: T[];
  private _index = 0;

  private readonly equals: (a: T, b: T) => boolean;
  constructor(initial: T, equals: (a: T, b: T) => boolean = Object.is) {
    this.equals = equals;
    this._entries = [initial];
  }

  get current(): T {
    return this._entries[this._index]!;
  }
  get canRedo(): boolean {
    return this._index < this._entries.length - 1;
  }
  reset(value: T): void {
    this._entries = [value];
    this._index = 0;
  }
  discardRedo(): void {
    this._entries.splice(this._index + 1);
  }
  record(value: T): void {
    if (this.equals(this.current, value)) return;
    this.discardRedo();
    this._entries.push(value);
    if (this._entries.length > 100) this._entries.shift();
    this._index = this._entries.length - 1;
  }
  restore(redo: boolean): T | undefined {
    const index = this._index + (redo ? 1 : -1);
    if (index < 0 || index >= this._entries.length) return undefined;
    this._index = index;
    return this.current;
  }
}

/** Physical KeyZ also works with non-Latin keyboard layouts. */
export function historyDirection(event: KeyboardEvent): boolean | undefined {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    !(event.ctrlKey || event.metaKey)
  )
    return undefined;
  const key = event.code || event.key.toLowerCase();
  if (
    key === 'KeyZ' ||
    key === 'z' ||
    (key === 'Unidentified' && event.key.toLowerCase() === 'z')
  )
    return event.shiftKey;
  return undefined;
}

/** Lazily captures the first edit, so initial attributes need no lifecycle hooks. */
export class DskControlHistory<T> {
  private _history: DskHistory<T> | undefined;
  private _draft: T | undefined;
  private readonly read: () => T;
  private readonly equals: (a: T, b: T) => boolean;
  constructor(read: () => T, equals: (a: T, b: T) => boolean = Object.is) {
    this.read = read;
    this.equals = equals;
  }
  begin(): void {
    this._history ??= new DskHistory(this.read(), this.equals);
  }
  reset(): void {
    this._history = undefined;
    this._draft = undefined;
  }
  commit(): void {
    this._draft = undefined;
    this._history?.record(this.read());
  }
  handle(
    event: KeyboardEvent,
    enabled: boolean,
    apply: (value: T) => void,
    drafts = false,
  ): boolean {
    const redo = historyDirection(event);
    if (redo === undefined) return false;
    event.preventDefault();
    event.stopPropagation();
    if (enabled) {
      if (drafts && this._history) {
        const current = this.read();
        if (!redo && !this.equals(current, this._history.current)) {
          apply(this._history.current);
          this._draft = current;
          return true;
        }
        if (redo && !this._history.canRedo && this._draft !== undefined) {
          const draft = this._draft;
          this._draft = undefined;
          apply(draft);
          return true;
        }
      }
      this._draft = undefined;
      const value = this._history?.restore(redo);
      if (value !== undefined) apply(value);
    }
    return true;
  }
}
