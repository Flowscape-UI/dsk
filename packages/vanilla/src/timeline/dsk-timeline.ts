import {
  selectionKey,
  selectionExists,
  selectionRoots,
  movingItems,
  moveItems,
} from './helpers/selection.ts';
import { DskControlHistory } from '../helpers/history.ts';
import {
  clamp,
  copyTracks,
  type TimelineTrack,
  type TimelineResolvedTrack,
  type TimelineKeyframe,
  type TimelineSelection,
  type TimelineEditDetail,
} from './helpers/model.ts';

interface Gesture {
  pointer: number;
  x: number;
  y: number;
  scale: number;
  track: number;
  clip: number;
  edge: string | undefined;
  action:
    'seek' | 'move' | 'resize' | 'reorder' | 'keyframe' | 'marquee' | 'range';
  selected: TimelineSelection[];
  range: [number, number];
  rangeEdge?: string;
  marquee?: {
    items: { selection: TimelineSelection; rect: DOMRect }[];
    base: TimelineSelection[];
    active: boolean;
  };
  keyframe: number;
  before: TimelineResolvedTrack[];
  time: number;
  rowHeight: number;
  scroll: number;
}

/** Framework-independent timeline. Consumers render their media on timeupdate. */
export class DskTimeline extends HTMLElement {
  static readonly observedAttributes = [
    'duration',
    'current-time',
    'zoom',
    'step',
    'snap',
    'loop',
    'disabled',
    'readonly',
    'range-start',
    'range-end',
    'snap-elements',
    'snap-threshold',
  ];
  private _tracks: TimelineResolvedTrack[] = [];
  private _selection: TimelineSelection | null = null;
  private _selections: TimelineSelection[] = [];
  private _snapLine: number | null = null;
  private _marqueeBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  private _playing = false;
  private _frame = 0;
  private _last = 0;
  private _writing = false;
  private _listeners: AbortController | undefined;
  private _gesture: Gesture | undefined;
  private readonly _history = new DskControlHistory(
    () => this.tracks,
    (a, b) => JSON.stringify(a) === JSON.stringify(b),
  );
  private readonly _root: ShadowRoot;
  private readonly _scroll: HTMLDivElement;
  private readonly _board: HTMLDivElement;
  private readonly _playButton: HTMLButtonElement;
  private readonly _time: HTMLOutputElement;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.innerHTML = `<style>
      :host { display:block; color:var(--dsk-timeline-text,#eeeeef); background:var(--dsk-timeline-background,#161618); border:1px solid var(--dsk-timeline-border,#35353b); font:var(--dsk-timeline-font-size,14px)/var(--dsk-timeline-line-height,1.4) var(--dsk-timeline-font-family,system-ui,sans-serif); --label:var(--dsk-timeline-label-width,120px); }
      :host([hidden]) { display:none!important; } * { box-sizing:border-box; }
      button { font:inherit; color:inherit; cursor:pointer; } button:disabled { cursor:default; opacity:.5; }
      button:focus-visible, :host(:focus-visible) { outline:2px solid var(--dsk-timeline-accent,#ff007a); outline-offset:-2px; }
      [part~=toolbar] { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:10px; border-bottom:1px solid var(--dsk-timeline-border,#35353b); }
      [part~=play-button] { border:0; background:var(--dsk-timeline-accent,#ff007a); color:var(--dsk-timeline-accent-text,#fff); padding:7px 16px; border-radius:var(--dsk-timeline-radius,3px); }
      output { font:var(--dsk-timeline-time-font-size,13px) var(--dsk-timeline-mono-font-family,ui-monospace,monospace); font-variant-numeric:tabular-nums; }
      [part~=viewport] { overflow:auto; max-height:var(--dsk-timeline-max-height,420px); }
      [part~=board] { position:relative; min-width:100%; }
      .row { display:grid; grid-template-columns:var(--label) minmax(0,1fr); height:var(--dsk-timeline-row-height,60px); }
      .top { height:var(--dsk-timeline-ruler-height,36px); position:sticky; top:0; z-index:4; background:var(--dsk-timeline-background,#161618); }
      .label { position:sticky; left:0; z-index:3; background:var(--dsk-timeline-header-background,#202023); border:0; border-right:1px solid var(--dsk-timeline-border,#35353b); border-bottom:1px solid var(--dsk-timeline-border,#35353b); text-align:left; padding:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      button.label { cursor:grab; touch-action:none; }
      [part~=selected-lane] { background:var(--dsk-timeline-selected-track-background,color-mix(in srgb,var(--dsk-timeline-accent,#ff007a) 9%,transparent)); }
      [part~=selected-track-header] { background:var(--dsk-timeline-selected-header-background,color-mix(in srgb,var(--dsk-timeline-accent,#ff007a) 18%,var(--dsk-timeline-header-background,#202023))); box-shadow:inset 3px 0 var(--dsk-timeline-accent,#ff007a); }
      [part~=locked-track] [part~=clip], [part~=locked-track] [part~=keyframe] { cursor:default; }
      [part~=muted-track] [part~=lane] { opacity:var(--dsk-timeline-muted-opacity,.45); }
      [part~=selection-box] { position:absolute; pointer-events:none; z-index:6; border:1px solid var(--dsk-timeline-accent,#ff007a); background:color-mix(in srgb,var(--dsk-timeline-accent,#ff007a) 15%,transparent); }
      [part~=snap-guide] { position:absolute; top:0; bottom:0; width:1px; background:var(--dsk-timeline-snap-color,#f6cd66); pointer-events:none; z-index:6; }
      [part~=playback-range] { position:absolute; top:0; bottom:0; background:color-mix(in srgb,var(--dsk-timeline-accent,#ff007a) 15%,transparent); pointer-events:none; }
      [part~=range-start], [part~=range-end] { position:absolute; bottom:0; height:12px; width:12px; transform:translateX(-50%); padding:0; border:0; background:var(--dsk-timeline-accent,#ff007a); z-index:2; cursor:ew-resize; touch-action:none; }
      .lane { touch-action:none; position:relative; border-bottom:1px solid var(--dsk-timeline-border,#35353b); }
      [part~=ruler] { touch-action:none; cursor:crosshair; }
      .tick { position:absolute; top:0; bottom:0; border-left:1px solid var(--dsk-timeline-border,#35353b); padding:6px 4px; font:var(--dsk-timeline-tick-font-size,11px) var(--dsk-timeline-mono-font-family,ui-monospace,monospace); color:var(--dsk-timeline-muted,#b6b6c1); pointer-events:none; }
      [part~=clip] { position:absolute; top:var(--dsk-timeline-clip-inset,10px); height:calc(100% - 2 * var(--dsk-timeline-clip-inset,10px)); min-width:3px; border:1px solid var(--dsk-timeline-clip-border,#806299); border-radius:var(--dsk-timeline-radius,3px); background:var(--dsk-timeline-clip-background,#3a2b49); color:var(--dsk-timeline-clip-text,#f4ebff); padding:0 12px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; text-align:left; cursor:grab; touch-action:none; user-select:none; }
      [aria-pressed=true] { box-shadow:var(--dsk-timeline-selection-shadow,inset 0 0 0 1px var(--dsk-timeline-accent,#ff007a)); }
      [part~=keyframe] { position:absolute; top:calc(50% - 12px); width:24px; height:24px; padding:0; background:transparent; border:0; transform:translateX(-50%); z-index:2; touch-action:none; cursor:ew-resize; }
      [part~=keyframe-marker] { display:block; width:var(--dsk-timeline-keyframe-size,9px); height:var(--dsk-timeline-keyframe-size,9px); margin:auto; pointer-events:none; transform:rotate(var(--dsk-timeline-keyframe-angle,45deg)); background:var(--dsk-timeline-keyframe-color,#f6cd66); }
      [part~=selected-keyframe] [part~=keyframe-marker] { background:var(--dsk-timeline-accent,#ff007a); }
      .edge { position:absolute; top:0; bottom:0; width:var(--dsk-timeline-handle-width,8px); background:var(--dsk-timeline-handle-background,#ffffff20); cursor:ew-resize; }
      .edge[data-edge=start] { left:0; } .edge[data-edge=end] { right:0; }
      [part~=playhead] { position:absolute; top:0; bottom:0; width:var(--dsk-timeline-playhead-width,1px); background:var(--dsk-timeline-accent,#ff007a); pointer-events:none; z-index:5; }
      [part~=playhead-marker] { position:absolute; left:50%; transform:translateX(-50%); width:11px; height:10px; background:inherit; clip-path:polygon(0 0,100% 0,100% 60%,50% 100%,0 60%); }
      @media(pointer:coarse) { [part~=play-button] { min-height:44px; } .edge { width:var(--dsk-timeline-touch-handle-width,14px); } }
    </style><div part="toolbar"><button type="button" part="play-button">Play</button><output part="time"></output><slot name="toolbar"></slot></div><div part="viewport"><div part="board"></div></div>`;
    this._scroll =
      this._root.querySelector<HTMLDivElement>('[part~=viewport]')!;
    this._board = this._root.querySelector<HTMLDivElement>('[part~=board]')!;
    this._playButton = this._root.querySelector<HTMLButtonElement>('button')!;
    this._time = this._root.querySelector<HTMLOutputElement>('output')!;
  }
  connectedCallback(): void {
    for (const name of [
      'tracks',
      'currentTime',
      'duration',
      'zoom',
      'step',
      'snap',
      'loop',
      'disabled',
      'readOnly',
      'rangeStart',
      'rangeEnd',
      'snapElements',
      'snapThreshold',
    ]) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._root.addEventListener(
      'pointerdown',
      (event) => {
        if (event instanceof PointerEvent) this._down(event);
      },
      options,
    );
    this.addEventListener('pointermove', this._move, options);
    this.addEventListener('pointerup', this._up, options);
    this.addEventListener('pointercancel', this._cancel, options);
    this.addEventListener('lostpointercapture', this._cancel, options);
    this.addEventListener('keydown', this._key, options);
    this._playButton.addEventListener(
      'click',
      () => this.togglePlayback(),
      options,
    );
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._cancel,
      options,
    );
    this.ownerDocument.addEventListener(
      'visibilitychange',
      () => {
        if (this.ownerDocument.hidden) this.pause();
      },
      options,
    );
    this._render();
  }
  disconnectedCallback(): void {
    this._cancel();
    this.pause();
    this._listeners?.abort();
  }
  attributeChangedCallback(name: string): void {
    if (this._writing) return;
    this._cancel();
    if (this.disabled || name === 'range-start' || name === 'range-end')
      this.pause();
    if (name === 'duration') {
      this.pause();
      this._tracks = this._fit(this._tracks);
      this._history.reset();
    }
    this._render();
  }
  private _number(name: string, fallback: number, min: number): number {
    const raw = this.getAttribute(name);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) ? Math.max(min, value) : fallback;
  }
  get duration(): number {
    return this._number('duration', 12, 0.01);
  }
  set duration(value: number) {
    this.setAttribute('duration', String(value));
  }
  get currentTime(): number {
    return clamp(this._number('current-time', 0, 0), 0, this.duration);
  }
  set currentTime(value: number) {
    this.setAttribute('current-time', String(value));
  }
  get zoom(): number {
    return this._number('zoom', 1, 0.1);
  }
  set zoom(value: number) {
    this.setAttribute('zoom', String(value));
  }
  get step(): number {
    return this._number('step', 0.25, 0.001);
  }
  set step(value: number) {
    this.setAttribute('step', String(value));
  }
  get snap(): boolean {
    return this.getAttribute('snap') !== 'false';
  }
  set snap(value: boolean) {
    this.setAttribute('snap', String(value));
  }
  get loop(): boolean {
    return this.hasAttribute('loop');
  }
  set loop(value: boolean) {
    this.toggleAttribute('loop', value);
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
  get rangeStart(): number {
    return clamp(this._number('range-start', 0, 0), 0, this.duration - 0.001);
  }
  set rangeStart(value: number) {
    this.setAttribute('range-start', String(value));
  }
  get rangeEnd(): number {
    return clamp(
      this._number('range-end', this.duration, 0),
      this.rangeStart + 0.001,
      this.duration,
    );
  }
  set rangeEnd(value: number) {
    this.setAttribute('range-end', String(value));
  }
  get snapElements(): boolean {
    return this.getAttribute('snap-elements') !== 'false';
  }
  set snapElements(value: boolean) {
    this.setAttribute('snap-elements', String(value));
  }
  get snapThreshold(): number {
    return this._number('snap-threshold', 8, 0);
  }
  set snapThreshold(value: number) {
    this.setAttribute('snap-threshold', String(value));
  }
  get selections(): TimelineSelection[] {
    return this._selections.map((s) => ({ ...s }));
  }
  select(items: readonly TimelineSelection[]): void {
    this._setSelections(items);
    this._render();
  }
  private _setSelections(items: readonly TimelineSelection[]): void {
    const unique = new Map<string, TimelineSelection>();
    for (const item of items)
      if (selectionExists(this._tracks, item))
        unique.set(selectionKey(item), { ...item });
    this._selections = [...unique.values()];
    this._selection = this._selections.at(-1) ?? null;
    this._emit('selectionchange', this.selection);
    this._emit('selectionschange', this.selections);
  }
  private _isSelected(
    trackId: string,
    clipId: string | null,
    keyframeId: string | null,
  ): boolean {
    return this._selections.some(
      (s) =>
        s.trackId === trackId &&
        s.clipId === clipId &&
        s.keyframeId === keyframeId,
    );
  }
  setTrackState(
    id: string,
    patch: { locked?: boolean; muted?: boolean },
  ): boolean {
    if (this.disabled || this.readOnly) return false;
    this._cancel();
    const track = this._tracks.find((t) => t.id === id);
    if (!track) throw new RangeError('Unknown track.');
    if (
      (patch.locked === undefined || patch.locked === !!track.locked) &&
      (patch.muted === undefined || patch.muted === !!track.muted)
    )
      return false;
    this._history.begin();
    if (patch.locked !== undefined) track.locked = patch.locked;
    if (patch.muted !== undefined) track.muted = patch.muted;
    this._history.commit();
    this._render();
    this._editEvent('input', 'track-state');
    this._editEvent('change', 'track-state');
    return true;
  }
  get playing(): boolean {
    return this._playing;
  }
  get selection(): TimelineSelection | null {
    return this._selection ? { ...this._selection } : null;
  }
  get tracks(): TimelineResolvedTrack[] {
    return copyTracks(this._tracks);
  }
  set tracks(value: TimelineTrack[]) {
    const tracks = copyTracks(value);
    this._cancel();
    this._tracks = this._fit(tracks);
    this._selection = null;
    this._selections = [];
    this._history.reset();
    this._render();
  }
  /** Delete the selected keyframe, clip, or track as one undoable edit. */
  deleteSelection(): boolean {
    if (this.disabled || this.readOnly) return false;
    this._cancel();
    const roots = selectionRoots(this._selections).filter(
      (s) => !this._tracks.find((t) => t.id === s.trackId)?.locked,
    );
    if (!roots.length) return false;
    this._history.begin();
    const before = JSON.stringify(this._tracks);
    for (const selected of roots) {
      const t = this._tracks.findIndex((t) => t.id === selected.trackId),
        track = this._tracks[t];
      if (!track) continue;
      const c = track.clips.findIndex((c) => c.id === selected.clipId),
        clip = track.clips[c];
      if (selected.keyframeId) {
        const owner = selected.clipId === null ? track : clip;
        if (owner)
          owner.keyframes = owner.keyframes?.filter(
            (f) => f.id !== selected.keyframeId,
          );
      } else if (selected.clipId !== null) {
        if (c >= 0) track.clips.splice(c, 1);
      } else this._tracks.splice(t, 1);
    }
    if (before === JSON.stringify(this._tracks)) return false;
    this._history.commit();
    this._setSelections(this._selections);
    this._render();
    this._editEvent('input', 'delete');
    this._editEvent('change', 'delete');
    this.focus({ preventScroll: true });
    return true;
  }

  /** Editing commands participate in history; assigning tracks remains silent. */
  addKeyframe(
    trackId: string,
    clipId: string | null,
    frame: TimelineKeyframe,
  ): boolean {
    return this._keyframeCommand(trackId, clipId, (frames) => {
      frames.push({ ...frame });
      return frames;
    });
  }
  updateKeyframe(
    trackId: string,
    clipId: string | null,
    id: string,
    patch: Partial<Omit<TimelineKeyframe, 'id'>>,
  ): boolean {
    return this._keyframeCommand(trackId, clipId, (frames) => {
      const frame = frames.find((f) => f.id === id);
      if (!frame) throw new RangeError('Unknown keyframe.');
      Object.assign(frame, patch);
      return frames;
    });
  }
  removeKeyframe(trackId: string, clipId: string | null, id: string): boolean {
    return this._keyframeCommand(trackId, clipId, (frames) =>
      frames.filter((f) => f.id !== id),
    );
  }
  private _keyframeCommand(
    trackId: string,
    clipId: string | null,
    edit: (frames: TimelineKeyframe[]) => TimelineKeyframe[],
  ): boolean {
    if (this.disabled || this.readOnly) return false;
    this._cancel();
    const tracks = this.tracks,
      track = tracks.find((t) => t.id === trackId);
    if (track?.locked) return false;
    const owner =
      clipId === null ? track : track?.clips.find((c) => c.id === clipId);
    if (!owner) throw new RangeError('Unknown track or clip.');
    owner.keyframes = edit(owner.keyframes ?? []);
    const valid = copyTracks(tracks);
    if (JSON.stringify(valid) === JSON.stringify(this._tracks)) return false;
    this._history.begin();
    this._tracks = valid;
    this._history.commit();
    this._render();
    this._editEvent('input', 'keyframe');
    this._editEvent('change', 'keyframe');
    return true;
  }
  private _fit(tracks: TimelineResolvedTrack[]): TimelineResolvedTrack[] {
    return tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        const duration = Math.min(c.duration, this.duration);
        return {
          ...c,
          duration,
          start: Math.min(c.start, this.duration - duration),
        };
      }),
    }));
  }
  play(): void {
    if (this.disabled || this._playing || !this.isConnected) return;
    this._cancel();
    if (this.currentTime >= this.rangeEnd || this.currentTime < this.rangeStart)
      this._seek(this.rangeStart);
    this._playing = true;
    this._last = 0;
    this._paint();
    this._emit('play', { time: this.currentTime });
    this._frame = requestAnimationFrame(this._tick);
  }
  pause(): void {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    if (!this._playing) return;
    this._playing = false;
    this._paint();
    this._emit('pause', { time: this.currentTime });
  }
  togglePlayback(): void {
    if (this.playing) this.pause();
    else this.play();
  }
  private readonly _tick = (now: number): void => {
    if (!this._playing) return;
    const next =
      Math.max(this.rangeStart, this.currentTime) +
      (this._last ? (now - this._last) / 1000 : 0);
    this._last = now;
    if (next >= this.rangeEnd) {
      this._seek(
        this.loop
          ? this.rangeStart +
              ((next - this.rangeStart) % (this.rangeEnd - this.rangeStart))
          : this.rangeEnd,
      );
      if (!this.loop) {
        this.pause();
        this._emit('ended', { time: this.currentTime });
        return;
      }
    } else this._seek(next);
    if (this._playing) this._frame = requestAnimationFrame(this._tick);
  };
  private _emit(name: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true, detail }),
    );
  }
  private _seek(time: number): void {
    const next = clamp(time, 0, this.duration);
    if (next === this.currentTime) return;
    this._writing = true;
    this.setAttribute('current-time', String(next));
    this._writing = false;
    this._paint();
    this._emit('timeupdate', { time: next });
  }
  private _paint(): void {
    this._playButton.textContent = this.playing ? 'Pause' : 'Play';
    this._playButton.disabled = this.disabled;
    this._playButton.setAttribute('aria-pressed', String(this.playing));
    this._time.textContent = `${this.currentTime.toFixed(2)} / ${this.duration.toFixed(2)} s`;
    const head = this._board.querySelector<HTMLElement>('[part~=playhead]');
    if (head)
      head.style.left = `calc(var(--label) + (100% - var(--label)) * ${this.currentTime / this.duration})`;
    const ruler = this._board.querySelector<HTMLElement>('[part~=ruler]');
    ruler?.setAttribute('aria-valuenow', String(this.currentTime));
  }
  private _render(): void {
    const focused =
      this._root.activeElement instanceof HTMLElement
        ? this._root.activeElement.dataset.focus
        : undefined;
    this._board.replaceChildren();
    this._board.style.width = `max(100%, calc(${this.duration * 50 * this.zoom}px + var(--label)))`;
    const top = document.createElement('div');
    top.className = 'row top';
    top.setAttribute('part', 'ruler-row');
    const title = document.createElement('div');
    title.className = 'label';
    title.setAttribute('part', 'ruler-label');
    title.textContent = 'Tracks';
    top.append(title);
    const ruler = document.createElement('div');
    ruler.className = 'lane';
    ruler.setAttribute('part', 'ruler');
    ruler.setAttribute('role', 'slider');
    ruler.setAttribute('aria-label', 'Current time');
    ruler.setAttribute('aria-valuemin', '0');
    ruler.setAttribute('aria-valuemax', String(this.duration));
    ruler.tabIndex = this.disabled ? -1 : 0;
    ruler.dataset.focus = 'ruler';
    const count = Math.min(
      20,
      Math.max(2, Math.floor(this.duration * this.zoom)),
    );
    for (let i = 0; i < count; i++) {
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.setAttribute('part', 'tick');
      tick.style.left = `${(i / count) * 100}%`;
      tick.textContent = `${+((i / count) * this.duration).toFixed(2)}s`;
      ruler.append(tick);
    }
    const range = document.createElement('div');
    range.setAttribute('part', 'playback-range');
    range.style.left = `${(this.rangeStart / this.duration) * 100}%`;
    range.style.width = `${((this.rangeEnd - this.rangeStart) / this.duration) * 100}%`;
    ruler.append(range);
    for (const edge of ['start', 'end']) {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.setAttribute('part', `range-${edge}`);
      handle.dataset.range = edge;
      handle.dataset.focus = `range-${edge}`;
      handle.style.left = `${((edge === 'start' ? this.rangeStart : this.rangeEnd) / this.duration) * 100}%`;
      handle.setAttribute(
        'aria-label',
        `Playback range ${edge}. Use arrow keys.`,
      );
      handle.disabled = this.disabled || this.readOnly;
      ruler.append(handle);
    }
    top.append(ruler);
    this._board.append(top);
    this._tracks.forEach((track, t) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.row = String(t);
      row.setAttribute('part', 'track');
      const selected = this._selections.some((s) => s.trackId === track.id);
      if (selected) row.part.add('selected-track');
      if (track.locked) row.part.add('locked-track');
      if (track.muted) row.part.add('muted-track');
      if (track.part) row.part.add(...track.part.split(/\s+/));
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'label';
      label.dataset.track = String(t);
      label.dataset.focus = JSON.stringify([track.id]);
      label.setAttribute('part', 'track-header');
      label.setAttribute('aria-pressed', String(selected));
      if (selected) label.part.add('selected-track-header');
      label.textContent = `${track.locked ? '🔒' : '⠿'} ${track.label}${track.muted ? ' · muted' : ''}`;
      label.setAttribute(
        'aria-label',
        `${track.label}. Use Alt and arrow keys to reorder.`,
      );
      label.disabled = this.disabled;
      row.append(label);
      const lane = document.createElement('div');
      lane.className = 'lane';
      lane.setAttribute('part', 'lane');
      lane.dataset.track = String(t);
      if (selected) lane.part.add('selected-lane');
      track.clips.forEach((clip, c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('part', 'clip');
        if (clip.part) b.part.add(...clip.part.split(/\s+/));
        if (this._isSelected(track.id, clip.id, null))
          b.part.add('selected-clip');
        b.dataset.track = String(t);
        b.dataset.clip = String(c);
        b.dataset.focus = JSON.stringify([track.id, clip.id]);
        b.style.left = `${(clip.start / this.duration) * 100}%`;
        b.style.width = `${(clip.duration / this.duration) * 100}%`;
        b.textContent = clip.label;
        b.disabled = this.disabled;
        b.setAttribute(
          'aria-label',
          `${clip.label}, ${clip.start.toFixed(2)} to ${(clip.start + clip.duration).toFixed(2)} seconds. Arrows move; Alt and arrows resize the end.`,
        );
        b.setAttribute(
          'aria-pressed',
          String(this._isSelected(track.id, clip.id, null)),
        );
        for (const edge of ['start', 'end']) {
          const span = document.createElement('span');
          span.className = 'edge';
          span.dataset.edge = edge;
          span.setAttribute('part', `resize-${edge}`);
          b.append(span);
        }
        lane.append(b);
        this._appendKeyframes(
          lane,
          track,
          clip.id,
          clip.keyframes ?? [],
          t,
          c,
          clip.start,
          clip.duration,
        );
      });
      this._appendKeyframes(
        lane,
        track,
        null,
        track.keyframes ?? [],
        t,
        -1,
        0,
        this.duration,
      );
      row.append(lane);
      this._board.append(row);
    });
    const head = document.createElement('div');
    head.setAttribute('part', 'playhead');
    const marker = document.createElement('span');
    marker.setAttribute('part', 'playhead-marker');
    head.append(marker);
    head.setAttribute('aria-hidden', 'true');
    this._board.append(head);
    if (this._snapLine !== null) {
      const guide = document.createElement('div');
      guide.setAttribute('part', 'snap-guide');
      guide.style.left = `calc(var(--label) + (100% - var(--label)) * ${this._snapLine / this.duration})`;
      this._board.append(guide);
    }
    if (this._marqueeBox) {
      const box = document.createElement('div');
      box.setAttribute('part', 'selection-box');
      Object.assign(box.style, {
        left: this._marqueeBox.x + 'px',
        top: this._marqueeBox.y + 'px',
        width: this._marqueeBox.width + 'px',
        height: this._marqueeBox.height + 'px',
      });
      this._board.append(box);
    }

    this._paint();
    if (focused)
      Array.from(this._board.querySelectorAll<HTMLElement>('[data-focus]'))
        .find((el) => el.dataset.focus === focused)
        ?.focus({ preventScroll: true });
  }
  private _appendKeyframes(
    lane: HTMLElement,
    track: TimelineResolvedTrack,
    clipId: string | null,
    frames: TimelineKeyframe[],
    t: number,
    c: number,
    start: number,
    duration: number,
  ): void {
    frames.forEach((frame, k) => {
      if (frame.time > duration) return;
      const key = document.createElement('button');
      key.type = 'button';
      key.setAttribute('part', 'keyframe');
      if (frame.part) key.part.add(...frame.part.split(/\s+/));
      if (this._isSelected(track.id, clipId, frame.id))
        key.part.add('selected-keyframe');
      const marker = document.createElement('span');
      marker.setAttribute('part', 'keyframe-marker');
      key.append(marker);
      key.dataset.track = String(t);
      key.dataset.clip = String(c);
      key.dataset.keyframe = String(k);
      key.dataset.focus = JSON.stringify([track.id, clipId, frame.id]);
      key.style.left = `${((start + frame.time) / this.duration) * 100}%`;
      key.disabled = this.disabled;
      key.setAttribute(
        'aria-label',
        `${frame.label ?? frame.id}, ${frame.time.toFixed(2)} seconds, value ${frame.value ?? 'unset'}. Arrows move; Delete removes.`,
      );
      key.setAttribute(
        'aria-pressed',
        String(this._isSelected(track.id, clipId, frame.id)),
      );
      lane.append(key);
    });
  }
  private _select(
    track: number,
    clip: number,
    keyframe = -1,
    toggle = false,
    preserve = false,
  ): void {
    const t = this._tracks[track];
    if (!t) return;
    const item: TimelineSelection = {
      trackId: t.id,
      clipId: t.clips[clip]?.id ?? null,
      keyframeId:
        (clip < 0 ? t.keyframes : t.clips[clip]?.keyframes)?.[keyframe]?.id ??
        null,
    };
    const exists = this._selections.some(
      (s) => selectionKey(s) === selectionKey(item),
    );
    this._setSelections(
      toggle
        ? exists
          ? this._selections.filter(
              (s) => selectionKey(s) !== selectionKey(item),
            )
          : [...this._selections, item]
        : preserve && exists
          ? this._selections
          : [item],
    );
  }
  private _setRange(start: number, end: number, emit = true): void {
    start = clamp(start, 0, this.duration - 0.001);
    end = clamp(end, start + 0.001, this.duration);
    this._writing = true;
    this.setAttribute('range-start', String(start));
    this.setAttribute('range-end', String(end));
    this._writing = false;
    this._render();
    if (emit) this._emit('rangechange', { start, end });
  }
  private _snap(
    value: number,
    scale: number,
    selected: TimelineSelection[],
    free = false,
  ): number {
    this._snapLine = null;
    if (!this.snap || free) return value;
    if (this.snapElements) {
      const targets = [
        0,
        this.duration,
        this.currentTime,
        this.rangeStart,
        this.rangeEnd,
      ];
      const roots = selectionRoots(selected);
      for (const track of this._tracks) {
        if (
          roots.some(
            (s) =>
              s.trackId === track.id &&
              s.clipId === null &&
              s.keyframeId === null,
          )
        )
          continue;
        for (const frame of track.keyframes ?? [])
          if (
            !roots.some(
              (s) =>
                s.trackId === track.id &&
                s.clipId === null &&
                s.keyframeId === frame.id,
            )
          )
            targets.push(frame.time);
        for (const clip of track.clips) {
          if (
            roots.some(
              (s) =>
                s.trackId === track.id &&
                s.clipId === clip.id &&
                s.keyframeId === null,
            )
          )
            continue;
          targets.push(clip.start, clip.start + clip.duration);
          for (const frame of clip.keyframes ?? [])
            if (
              frame.time <= clip.duration &&
              !roots.some(
                (s) =>
                  s.trackId === track.id &&
                  s.clipId === clip.id &&
                  s.keyframeId === frame.id,
              )
            )
              targets.push(clip.start + frame.time);
        }
      }
      let best = this.snapThreshold / scale;
      for (const target of targets) {
        const distance = Math.abs(target - value);
        if (distance <= best) {
          best = distance;
          this._snapLine = target;
        }
      }
      if (this._snapLine !== null) return this._snapLine;
    }
    return Math.round(value / this.step) * this.step;
  }
  private readonly _down = (event: PointerEvent): void => {
    if (
      this.disabled ||
      this._gesture ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLElement>(
      '[data-range],[data-track],[part~=ruler]',
    );
    if (!control) return;
    const seek = control.part.contains('ruler'),
      rangeEdge = control.dataset.range;
    const track = Number(control.dataset.track),
      clip =
        control.dataset.clip === undefined ? -1 : Number(control.dataset.clip),
      keyframe =
        control.dataset.keyframe === undefined
          ? -1
          : Number(control.dataset.keyframe);
    const lane = control.part.contains('lane'),
      previous = this.selections;
    if (!seek && !rangeEdge && !lane) {
      this._select(track, clip, keyframe, event.shiftKey, true);
      if (event.shiftKey) {
        event.preventDefault();
        control.focus({ preventScroll: true });
        this._render();
        return;
      }
    }
    if (
      !seek &&
      !lane &&
      (this.readOnly || (!rangeEdge && this._tracks[track]?.locked))
    ) {
      this._render();
      return;
    }
    event.preventDefault();
    this.pause();
    const ruler = this._board.querySelector<HTMLElement>('[part~=ruler]')!;
    const action = rangeEdge
      ? 'range'
      : lane
        ? 'marquee'
        : seek
          ? 'seek'
          : keyframe >= 0
            ? 'keyframe'
            : clip < 0
              ? 'reorder'
              : target instanceof HTMLElement && target.dataset.edge
                ? 'resize'
                : 'move';
    const items = lane
      ? Array.from(
          this._board.querySelectorAll<HTMLElement>(
            '[part~=clip],[part~=keyframe]',
          ),
        ).flatMap((el) => {
          const t = this._tracks[Number(el.dataset.track)]!,
            c = t.clips[Number(el.dataset.clip)];
          if (t.locked) return [];
          const f =
            el.dataset.keyframe === undefined
              ? undefined
              : (c?.keyframes ?? t.keyframes)?.[Number(el.dataset.keyframe)];
          return [
            {
              selection: {
                trackId: t.id,
                clipId: c?.id ?? null,
                keyframeId: f?.id ?? null,
              },
              rect: el.getBoundingClientRect(),
            },
          ];
        })
      : [];
    if (lane) {
      this._select(track, -1);
      this._board
        .querySelector<HTMLElement>(
          `[part~=track-header][data-track="${track}"]`,
        )
        ?.focus({ preventScroll: true });
    } else control.focus({ preventScroll: true });
    this._history.begin();
    this._gesture = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scale: ruler.getBoundingClientRect().width / this.duration,
      track,
      clip,
      keyframe,
      edge: target instanceof HTMLElement ? target.dataset.edge : undefined,
      action,
      before: this.tracks,
      time: this.currentTime,
      rowHeight:
        this._board.querySelector('.row:not(.top)')?.getBoundingClientRect()
          .height ?? 60,
      scroll: this._scroll.scrollLeft,
      selected: action === 'marquee' ? previous : this.selections,
      range: [this.rangeStart, this.rangeEnd],
      rangeEdge,
      marquee: lane
        ? { items, base: event.shiftKey ? previous : [], active: false }
        : undefined,
    };
    this.setPointerCapture(event.pointerId);
    if (seek) this._move(event);
    else this._render();
  };
  private readonly _move = (event: PointerEvent): void => {
    const g = this._gesture;
    if (!g || g.pointer !== event.pointerId) return;
    if (g.action === 'seek') {
      const r = this._board
        .querySelector('[part~=ruler]')!
        .getBoundingClientRect();
      this._seek((event.clientX - r.left) / g.scale);
      return;
    }
    if (g.action === 'range') {
      const delta =
        (event.clientX - g.x + this._scroll.scrollLeft - g.scroll) / g.scale;
      const value = this._snap(
        (g.rangeEdge === 'start' ? g.range[0] : g.range[1]) + delta,
        g.scale,
        [],
        event.altKey,
      );
      this._setRange(
        g.rangeEdge === 'start'
          ? clamp(value, 0, g.range[1] - 0.001)
          : g.range[0],
        g.rangeEdge === 'end'
          ? clamp(value, g.range[0] + 0.001, this.duration)
          : g.range[1],
      );
      return;
    }
    if (g.action === 'marquee') {
      if (!g.marquee) return;
      if (
        !g.marquee.active &&
        Math.hypot(event.clientX - g.x, event.clientY - g.y) < 4
      )
        return;
      g.marquee.active = true;
      const left = Math.min(g.x, event.clientX),
        right = Math.max(g.x, event.clientX),
        top = Math.min(g.y, event.clientY),
        bottom = Math.max(g.y, event.clientY);
      const rect = this._board.getBoundingClientRect();
      this._marqueeBox = {
        x: left - rect.left,
        y: top - rect.top,
        width: right - left,
        height: bottom - top,
      };
      this._setSelections([
        ...g.marquee.base,
        ...g.marquee.items
          .filter(
            ({ rect: r }) =>
              r.right >= left &&
              r.left <= right &&
              r.bottom >= top &&
              r.top <= bottom,
          )
          .map((i) => i.selection),
      ]);
      this._render();
      return;
    }
    const tracks = copyTracks(g.before);
    const delta =
      (event.clientX - g.x + this._scroll.scrollLeft - g.scroll) / g.scale;
    const snap = (n: number) =>
      this._snap(n, g.scale, g.selected, event.altKey);
    this._snapLine = null;
    if (g.action === 'move' || g.action === 'keyframe') {
      const items = movingItems(g.before, g.selected, this.duration);
      const anchor =
        g.action === 'move'
          ? g.before[g.track]!.clips[g.clip]!.start
          : (g.clip < 0 ? 0 : g.before[g.track]!.clips[g.clip]!.start) +
            (g.clip < 0
              ? g.before[g.track]!.keyframes
              : g.before[g.track]!.clips[g.clip]!.keyframes)![g.keyframe]!.time;
      let adjusted = snap(anchor + delta) - anchor;
      if (g.action === 'move' && this._snapLine === null) {
        const end = anchor + g.before[g.track]!.clips[g.clip]!.duration;
        const aligned = snap(end + delta);
        if (this._snapLine !== null) adjusted = aligned - end;
      }
      if (items.length) {
        const bounded = clamp(
          adjusted,
          Math.max(...items.map((item) => item.min)),
          Math.min(...items.map((item) => item.max)),
        );
        if (bounded !== adjusted) this._snapLine = null;
        adjusted = bounded;
      }
      const next = moveItems(g.before, items, adjusted);
      if (JSON.stringify(next) !== JSON.stringify(this._tracks)) {
        this._tracks = next;
        this._render();
        this._editEvent('input', g.action);
      } else this._render();
      return;
    }
    if (g.action === 'reorder') {
      const destination = clamp(
        g.track + Math.round((event.clientY - g.y) / g.rowHeight),
        0,
        tracks.length - 1,
      );
      const [track] = tracks.splice(g.track, 1);
      tracks.splice(destination, 0, track!);
    } else {
      const c = tracks[g.track]!.clips[g.clip]!;
      const end = c.start + c.duration;
      const min = Math.min(0.01, this.duration);
      if (g.edge === 'start') {
        c.start = clamp(snap(c.start + delta), 0, end - min);
        c.duration = end - c.start;
      } else if (g.edge === 'end')
        c.duration =
          clamp(snap(end + delta), c.start + min, this.duration) - c.start;
      else
        c.start = clamp(snap(c.start + delta), 0, this.duration - c.duration);
    }
    if (JSON.stringify(tracks) === JSON.stringify(this._tracks)) return;
    this._tracks = tracks;
    this._render();
    this._editEvent('input', g.action);
  };
  private _release(): Gesture | undefined {
    const g = this._gesture;
    this._gesture = undefined;
    this._snapLine = null;
    this._marqueeBox = null;
    if (g && this.hasPointerCapture(g.pointer))
      this.releasePointerCapture(g.pointer);
    return g;
  }
  private readonly _up = (event: PointerEvent): void => {
    if (this._gesture?.pointer !== event.pointerId) return;
    this._move(event);
    const g = this._release();
    this._render();
    if (
      g &&
      g.action !== 'seek' &&
      g.action !== 'marquee' &&
      g.action !== 'range' &&
      JSON.stringify(g.before) !== JSON.stringify(this._tracks)
    ) {
      this._history.commit();
      this._editEvent('change', g.action);
    }
  };
  private readonly _cancel = (): void => {
    const g = this._release();
    if (!g) return;
    if (g.action === 'range') this._setRange(...g.range);
    else if (g.action === 'marquee') {
      this._setSelections(g.selected);
      this._render();
    } else if (g.action === 'seek') this._seek(g.time);
    else {
      this._tracks = g.before;
      this._render();
      this._editEvent('input', g.action);
    }
  };
  private _editEvent(name: string, action: TimelineEditDetail['action']): void {
    this._emit(name, {
      tracks: this.tracks,
      action,
    } satisfies TimelineEditDetail);
  }
  private readonly _key = (event: KeyboardEvent): void => {
    const origin = event.composedPath()[0];
    if (!(origin instanceof HTMLElement)) return;
    if (origin !== this && !this._root.contains(origin)) return;
    if (event.key === 'Escape' && this._gesture) {
      event.preventDefault();
      this._cancel();
      return;
    }
    if (this._gesture || this.disabled) return;
    if (
      this._history.handle(event, !this.readOnly, (tracks) => {
        this._tracks = copyTracks(tracks);
        this._setSelections(this._selections);
        this._render();
        this._editEvent('input', 'history');
        this._editEvent('change', 'history');
      })
    )
      return;
    if (event.ctrlKey || event.metaKey) return;
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      !event.altKey
    ) {
      if (this.readOnly) return;
      if (origin.dataset.track !== undefined) {
        this._select(
          Number(origin.dataset.track),
          origin.dataset.clip === undefined ? -1 : Number(origin.dataset.clip),
          origin.dataset.keyframe === undefined
            ? -1
            : Number(origin.dataset.keyframe),
          false,
          true,
        );
      }
      if (this._selection) {
        event.preventDefault();
        event.stopPropagation();
        this.deleteSelection();
      }
      return;
    }
    if (
      origin.dataset.track !== undefined &&
      (event.key === 'Enter' ||
        (event.code === 'Space' && origin.part.contains('track-header')))
    ) {
      event.preventDefault();
      this._select(
        Number(origin.dataset.track),
        origin.dataset.clip === undefined ? -1 : Number(origin.dataset.clip),
        origin.dataset.keyframe === undefined
          ? -1
          : Number(origin.dataset.keyframe),
        event.shiftKey,
      );
      this._render();
      return;
    }

    if (event.code === 'Space' && origin !== this._playButton) {
      event.preventDefault();
      this.togglePlayback();
      return;
    }
    const dx =
      event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (origin.dataset.range) {
      if (dx && !this.readOnly) {
        event.preventDefault();
        this.pause();
        const delta = dx * this.step * (event.shiftKey ? 10 : 1);
        this._setRange(
          origin.dataset.range === 'start'
            ? clamp(this.rangeStart + delta, 0, this.rangeEnd - 0.001)
            : this.rangeStart,
          origin.dataset.range === 'end'
            ? clamp(
                this.rangeEnd + delta,
                this.rangeStart + 0.001,
                this.duration,
              )
            : this.rangeEnd,
        );
      }
      return;
    }
    if (origin.part.contains('ruler') || origin === this) {
      if (dx) {
        event.preventDefault();
        this.pause();
        this._seek(
          this.currentTime + dx * this.step * (event.shiftKey ? 10 : 1),
        );
      }
      return;
    }
    if (
      this.readOnly ||
      origin.dataset.track === undefined ||
      this._tracks[Number(origin.dataset.track)]?.locked
    )
      return;
    const t = Number(origin.dataset.track),
      c = origin.dataset.clip === undefined ? -1 : Number(origin.dataset.clip);
    const k =
      origin.dataset.keyframe === undefined
        ? -1
        : Number(origin.dataset.keyframe);
    if (
      ((c >= 0 || k >= 0) && !dx) ||
      (c < 0 && k < 0 && (!dy || !event.altKey))
    )
      return;
    event.preventDefault();
    this._history.begin();
    const before = JSON.stringify(this._tracks);
    this._select(t, c, k, false, true);
    let action: TimelineEditDetail['action'] = 'move';
    if (dx && (k >= 0 || (c >= 0 && !event.altKey))) {
      this._tracks = moveItems(
        this._tracks,
        movingItems(this._tracks, this._selections, this.duration),
        dx * this.step * (event.shiftKey ? 10 : 1),
      );
      this._render();
      if (before !== JSON.stringify(this._tracks)) {
        this._history.commit();
        this._editEvent('input', k >= 0 ? 'keyframe' : 'move');
        this._editEvent('change', k >= 0 ? 'keyframe' : 'move');
      }
      return;
    }

    if (k >= 0 && c < 0) {
      const frame = this._tracks[t]!.keyframes![k]!;
      frame.time = clamp(
        frame.time + dx * this.step * (event.shiftKey ? 10 : 1),
        0,
        this.duration,
      );
      action = 'keyframe';
    } else if (c < 0) {
      const dest = clamp(t + dy, 0, this._tracks.length - 1);
      const [track] = this._tracks.splice(t, 1);
      this._tracks.splice(dest, 0, track!);

      action = 'reorder';
    } else {
      const clip = this._tracks[t]!.clips[c]!;
      const delta = dx * this.step * (event.shiftKey ? 10 : 1);
      if (k >= 0) {
        const frame = clip.keyframes![k]!;
        frame.time = clamp(frame.time + delta, 0, clip.duration);
        action = 'keyframe';
      } else if (event.altKey) {
        clip.duration = clamp(
          clip.duration + delta,
          Math.min(0.01, this.duration),
          this.duration - clip.start,
        );
        action = 'resize';
      } else
        clip.start = clamp(
          clip.start + delta,
          0,
          this.duration - clip.duration,
        );
    }
    this._render();
    if (before !== JSON.stringify(this._tracks)) {
      this._history.commit();
      this._editEvent('input', action);
      this._editEvent('change', action);
    }
  };
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-timeline': DskTimeline;
  }
}
