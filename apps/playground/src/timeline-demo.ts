import { evaluateTimelineKeyframes } from '@flowscape-ui/dsk';
import type {
  DskTimeline,
  DskCurve,
  TimelineEasing,
  TimelineClip,
  TimelineTrack,
} from '@flowscape-ui/dsk';
import './timeline-demo.css';

const timeline = document.querySelector<DskTimeline>('#timeline-demo')!;
const object = document.querySelector<HTMLElement>('#timeline-preview-object')!;
const status = document.querySelector<HTMLOutputElement>('#timeline-status')!;
type MotionProperty = 'position' | 'rotation' | 'opacity';
const bindings = new Map<string, MotionProperty>();
const readout = document.querySelector<HTMLOutputElement>('#timeline-values')!;
const initial: TimelineTrack[] = [
  {
    id: 'position',
    label: 'Position X · px',
    clips: [
      {
        id: 'intro',
        label: 'Slide',
        start: 0.5,
        duration: 4,
        keyframes: [
          { id: 'from', time: 0, value: -100 },
          { id: 'middle', time: 2, value: 0 },
          { id: 'to', time: 4, value: 100 },
        ],
      },
    ],
  },
  {
    id: 'rotation',
    label: 'Rotation · deg',
    part: 'motion-track',
    clips: [
      {
        id: 'move',
        label: 'Rotate',
        part: 'motion-clip',
        start: 1,
        duration: 7,
        keyframes: [
          { id: 'from', time: 0, value: 0 },
          { id: 'middle', time: 3.5, value: 180 },
          { id: 'to', time: 7, value: 360 },
        ],
      },
    ],
  },
  {
    id: 'opacity',
    label: 'Opacity · 0–1',
    clips: [
      {
        id: 'fade',
        label: 'Fade',
        start: 0,
        duration: 11,
        keyframes: [
          { id: 'from', time: 0, value: 0.2 },
          { id: 'middle', time: 5.5, value: 1 },
          { id: 'to', time: 11, value: 0.2 },
        ],
      },
    ],
  },
];
function resetBindings(): void {
  bindings.clear();
  bindings.set('position', 'position');
  bindings.set('rotation', 'rotation');
  bindings.set('opacity', 'opacity');
}
resetBindings();
timeline.tracks = initial;
function sample(clip: TimelineClip, time: number): number | undefined {
  return evaluateTimelineKeyframes(
    clip.keyframes ?? [],
    Math.max(0, Math.min(clip.duration, time - clip.start)),
  );
}
function render(): void {
  const time = timeline.currentTime;
  const values: Record<MotionProperty, number> = {
    position: 0,
    rotation: 0,
    opacity: 1,
  };
  for (const track of timeline.tracks) {
    if (track.muted) continue;
    const property = bindings.get(track.id);
    if (!property) continue;
    const segments: TimelineClip[] = [...track.clips];
    if (track.keyframes?.length)
      segments.push({
        id: 'direct',
        label: track.label,
        start: 0,
        duration: timeline.duration,
        keyframes: track.keyframes,
      });
    for (const clip of segments) {
      // Initial tracks hold their end values; added layers contribute only inside their clips.
      if (
        !initial.some((t) => t.id === track.id) &&
        (time <
          (clip.id === 'direct'
            ? Math.min(...(clip.keyframes ?? []).map((f) => f.time))
            : clip.start) ||
          time >
            (clip.id === 'direct'
              ? Math.max(...(clip.keyframes ?? []).map((f) => f.time))
              : clip.start + clip.duration))
      )
        continue;
      const value = sample(clip, time);
      if (value === undefined) continue;
      if (property === 'opacity')
        values.opacity *= Math.max(0, Math.min(1, value));
      else values[property] += value;
    }
  }
  object.style.transform = `translateX(${values.position}px) rotate(${values.rotation}deg)`;
  object.style.opacity = String(values.opacity);
  readout.textContent = `X: ${values.position.toFixed(1)} px · Rotation: ${values.rotation.toFixed(1)}° · Opacity: ${values.opacity.toFixed(2)}`;
}
function report(): void {
  syncTimelineEditors();
  document.querySelector<HTMLButtonElement>(
    '#timeline-delete-selection',
  )!.disabled = !timeline.selection || timeline.disabled || timeline.readOnly;

  const selected = timeline.selection,
    track = timeline.tracks.find((t) => t.id === selected?.trackId),
    clip = track?.clips.find((c) => c.id === selected?.clipId);
  document.querySelector<HTMLOutputElement>(
    '#timeline-keyframe-target',
  )!.textContent = track
    ? `Keyframe target: ${track.label}${clip ? ' / ' + clip.label : ' (direct track)'}`
    : 'Select a track or clip to add a keyframe';
  document.querySelector<HTMLButtonElement>(
    '#timeline-add-keyframe',
  )!.disabled =
    !track || !!track.locked || timeline.disabled || timeline.readOnly;

  status.textContent = JSON.stringify(
    {
      selection: timeline.selection,
      selections: timeline.selections,
      bindings: Object.fromEntries(bindings),
      tracks: timeline.tracks,
    },
    null,
    2,
  );
  render();
}
timeline.addEventListener('timeupdate', render);
timeline.addEventListener('input', report);
timeline.addEventListener('change', report);
timeline.addEventListener('selectionchange', report);
document.querySelector<HTMLSelectElement>('#timeline-zoom')!.onchange = (
  event,
) => {
  timeline.zoom = Number((event.target as HTMLSelectElement).value);
};
document.querySelector<HTMLInputElement>('#timeline-step')!.onchange = (
  event,
) => {
  timeline.step = Number((event.target as HTMLInputElement).value);
};
for (const key of ['snap', 'loop', 'disabled', 'readOnly'] as const) {
  document.querySelector<HTMLInputElement>(`#timeline-${key}`)!.onchange = (
    event,
  ) => {
    timeline[key] = (event.target as HTMLInputElement).checked;
    report();
  };
}
document.querySelector<HTMLButtonElement>('#timeline-reset')!.onclick = () => {
  timeline.pause();
  timeline.rangeStart = 0;
  timeline.rangeEnd = timeline.duration;
  timeline.currentTime = 0;
  resetBindings();
  timeline.tracks = initial;
  report();
};
report();

let frameNumber = 0;
const frameValue = document.querySelector<HTMLInputElement>(
  '#timeline-keyframe-value',
)!;
function targetClip() {
  const selected = timeline.selection;
  const track =
    timeline.tracks.find((t) => t.id === selected?.trackId) ??
    timeline.tracks.find((t) => t.id === 'rotation') ??
    timeline.tracks[0];
  if (!track) return undefined;
  const clip =
    selected?.trackId === track.id && selected.clipId === null
      ? undefined
      : (track.clips.find((c) => c.id === selected?.clipId) ?? track.clips[0]);
  return { track, clip };
}

document.querySelector<HTMLButtonElement>('#timeline-add-keyframe')!.onclick =
  () => {
    const target = targetClip();
    if (!target) return;
    const { track, clip } = target;
    timeline.addKeyframe(track.id, clip?.id ?? null, {
      id: `custom-${++frameNumber}`,
      time: Math.max(
        0,
        Math.min(
          clip?.duration ?? timeline.duration,
          timeline.currentTime - (clip?.start ?? 0),
        ),
      ),
      value: Number(frameValue.value),
    });
  };
document.querySelector<HTMLButtonElement>(
  '#timeline-update-keyframe',
)!.onclick = () => {
  const selected = timeline.selection;
  if (selected?.keyframeId)
    timeline.updateKeyframe(
      selected.trackId,
      selected.clipId,
      selected.keyframeId,
      { value: Number(frameValue.value) },
    );
};
document.querySelector<HTMLButtonElement>(
  '#timeline-delete-keyframe',
)!.onclick = () => {
  const selected = timeline.selection;
  if (selected?.keyframeId)
    timeline.removeKeyframe(
      selected.trackId,
      selected.clipId,
      selected.keyframeId,
    );
};
timeline.addEventListener('selectionchange', () => {
  const selected = timeline.selection;
  const track = timeline.tracks.find((t) => t.id === selected?.trackId);
  const frames = selected?.clipId
    ? track?.clips.find((c) => c.id === selected.clipId)?.keyframes
    : track?.keyframes;
  const frame = frames?.find((f) => f.id === selected?.keyframeId);
  if (frame) frameValue.value = String(frame.value ?? 0);
});

document.querySelector<HTMLSelectElement>('#timeline-appearance')!.onchange = (
  event,
) => {
  timeline.dataset.appearance = (event.target as HTMLSelectElement).value;
};

let trackNumber = 0;
const trackName = document.querySelector<HTMLInputElement>(
  '#timeline-track-name',
)!;
const trackProperty = document.querySelector<HTMLSelectElement>(
  '#timeline-track-property',
)!;
const addTrack = document.querySelector<HTMLButtonElement>(
  '#timeline-add-track',
)!;
addTrack.onclick = () => {
  if (timeline.disabled || timeline.readOnly) return;
  const property = trackProperty.value as MotionProperty;
  const id = `custom-track-${++trackNumber}`;
  const duration = Math.min(4, timeline.duration);
  const start = Math.min(timeline.currentTime, timeline.duration - duration);
  const defaults: Record<MotionProperty, [number, number]> = {
    position: [0, 60],
    rotation: [0, 90],
    opacity: [1, 0.3],
  };
  const [from, to] = defaults[property];
  const label = trackName.value.trim() || `${property} ${trackNumber}`;
  bindings.set(id, property);
  const withClip = document.querySelector<HTMLInputElement>(
    '#timeline-with-clip',
  )!.checked;
  const keyframes = [
    { id: 'from', time: 0, value: from },
    { id: 'to', time: duration, value: to },
  ];
  const track: TimelineTrack = {
    id,
    label,
    ...(withClip
      ? { clips: [{ id: 'animation', label, start, duration, keyframes }] }
      : { keyframes: keyframes.map((f) => ({ ...f, time: f.time + start })) }),
  };
  timeline.tracks = [...timeline.tracks, track];
  trackName.value = '';
  report();
};
for (const flag of ['disabled', 'readOnly']) {
  document
    .querySelector<HTMLInputElement>(`#timeline-${flag}`)!
    .addEventListener('change', () => {
      addTrack.disabled = timeline.disabled || timeline.readOnly;
    });
}

let clipNumber = 0;
document.querySelector<HTMLButtonElement>('#timeline-add-clip')!.onclick =
  () => {
    if (timeline.disabled || timeline.readOnly) return;
    const target = targetClip();
    if (!target) return;
    const { track } = target;
    const tracks = timeline.tracks;
    const owner = tracks.find((t) => t.id === track.id)!;
    const duration = Math.min(4, timeline.duration),
      start = Math.min(timeline.currentTime, timeline.duration - duration);
    const property = bindings.get(track.id) ?? 'position';
    const from = property === 'opacity' ? 1 : 0,
      to = property === 'opacity' ? 0.3 : property === 'rotation' ? 90 : 60;
    owner.clips.push({
      id: `extra-clip-${++clipNumber}`,
      label: 'Animation',
      start,
      duration,
      keyframes: [
        { id: 'from', time: 0, value: from },
        { id: 'to', time: duration, value: to },
      ],
    });
    timeline.tracks = tracks;
    report();
  };

document.querySelector<HTMLButtonElement>(
  '#timeline-delete-selection',
)!.onclick = () => {
  timeline.deleteSelection();
};

function syncTimelineEditors(): void {
  const selected = timeline.selection,
    track = timeline.tracks.find((t) => t.id === selected?.trackId);
  const frame = (
    selected?.clipId
      ? track?.clips.find((c) => c.id === selected.clipId)?.keyframes
      : track?.keyframes
  )?.find((f) => f.id === selected?.keyframeId);
  for (const flag of ['locked', 'muted'] as const) {
    const control = document.querySelector<HTMLInputElement>(
      `#timeline-track-${flag}`,
    )!;
    control.checked = !!track?.[flag];
    control.disabled = !track || timeline.disabled || timeline.readOnly;
  }
  document.querySelector<HTMLOutputElement>(
    '#timeline-selection-count',
  )!.textContent = `${timeline.selections.length} selected`;
  document.querySelector<HTMLInputElement>('#timeline-range-start')!.value =
    String(timeline.rangeStart);
  document.querySelector<HTMLInputElement>('#timeline-range-end')!.value =
    String(timeline.rangeEnd);
  const select = document.querySelector<HTMLSelectElement>('#timeline-easing')!;
  const curve = document.querySelector<DskCurve>('#timeline-curve')!;
  select.disabled =
    !frame || !!track?.locked || timeline.readOnly || timeline.disabled;
  const easing = frame?.easing ?? 'linear';
  select.value = typeof easing === 'string' ? easing : 'custom';
  curve.disabled = select.disabled || easing === 'step';
  curve.value =
    typeof easing === 'string'
      ? easing === 'step'
        ? 'linear'
        : easing
      : easing;
}
for (const flag of ['locked', 'muted'] as const) {
  document.querySelector<HTMLInputElement>(
    `#timeline-track-${flag}`,
  )!.onchange = (event) => {
    const selected = timeline.selection;
    if (selected)
      timeline.setTrackState(selected.trackId, {
        [flag]: (event.target as HTMLInputElement).checked,
      });
  };
}
for (const edge of ['start', 'end'] as const) {
  document.querySelector<HTMLInputElement>(
    `#timeline-range-${edge}`,
  )!.onchange = (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    if (edge === 'start') timeline.rangeStart = value;
    else timeline.rangeEnd = value;
    syncTimelineEditors();
  };
}
timeline.addEventListener('rangechange', syncTimelineEditors);
document.querySelector<HTMLInputElement>('#timeline-snap-elements')!.onchange =
  (event) => {
    timeline.snapElements = (event.target as HTMLInputElement).checked;
  };
document.querySelector<HTMLInputElement>('#timeline-snap-threshold')!.onchange =
  (event) => {
    timeline.snapThreshold = Number((event.target as HTMLInputElement).value);
  };
function setEasing(easing: TimelineEasing): void {
  const selected = timeline.selection;
  if (selected?.keyframeId)
    timeline.updateKeyframe(
      selected.trackId,
      selected.clipId,
      selected.keyframeId,
      { easing },
    );
}
document.querySelector<HTMLSelectElement>('#timeline-easing')!.onchange = (
  event,
) => {
  const value = (event.target as HTMLSelectElement).value;
  setEasing(
    value === 'custom' ? [0.25, 0.1, 0.25, 1] : (value as TimelineEasing),
  );
};
document
  .querySelector<DskCurve>('#timeline-curve')!
  .addEventListener('change', (event) => {
    const curve = document.querySelector<DskCurve>('#timeline-curve')!;
    if (event.target === curve) setEasing(curve.points);
  });
