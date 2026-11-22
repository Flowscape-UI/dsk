import { CURVE_PRESETS, sampleCurve } from '../curve/helpers/curve-model.ts';
import type { TimelineKeyframe, TimelineTrack } from './helpers/model.ts';

/** Applied to the segment leaving a keyframe. */
export type TimelineEasing =
  | keyof typeof CURVE_PRESETS
  | 'step'
  | readonly [number, number, number, number];

export function copyTimelineEasing(easing: TimelineEasing): TimelineEasing {
  if (typeof easing === 'string') {
    if (easing === 'step' || Object.hasOwn(CURVE_PRESETS, easing))
      return easing;
  } else if (
    easing.length === 4 &&
    easing.every(Number.isFinite) &&
    easing.every((v) => v >= 0 && v <= 1)
  ) {
    return [...easing];
  }
  throw new TypeError(
    'Invalid timeline easing. Bezier coordinates must be between 0 and 1.',
  );
}

/** Samples numeric keyframes, holding endpoint values. Equal times use the last supplied key. */
export function evaluateTimelineKeyframes(
  frames: readonly TimelineKeyframe[],
  time: number,
): number | undefined {
  if (!Number.isFinite(time)) return undefined;
  const sorted = frames
    .filter((f) => Number.isFinite(f.time) && Number.isFinite(f.value))
    .slice()
    .sort((a, b) => a.time - b.time);
  const keys = sorted.filter((f, i) => sorted[i + 1]?.time !== f.time);
  if (!keys.length) return undefined;
  if (time < keys[0]!.time) return keys[0]!.value;
  for (let i = 0; i < keys.length - 1; i++) {
    const from = keys[i]!,
      to = keys[i + 1]!;
    if (time >= to.time) continue;
    const easing = from.easing ?? 'linear';
    const progress = (time - from.time) / (to.time - from.time);
    const amount =
      easing === 'step'
        ? 0
        : easing === 'linear'
          ? progress
          : sampleCurve(
              typeof easing === 'string' ? CURVE_PRESETS[easing] : [...easing],
              progress,
            );
    return from.value! + (to.value! - from.value!) * amount;
  }
  return keys.at(-1)!.value;
}

export interface TimelineSample {
  clipId: string | null;
  value: number;
}
/** Muted tracks produce no samples. Locked tracks still participate in playback. */
export function evaluateTimelineTrack(
  track: TimelineTrack,
  time: number,
): TimelineSample[] {
  if (track.muted || !Number.isFinite(time)) return [];
  const samples: TimelineSample[] = [];
  const value = evaluateTimelineKeyframes(track.keyframes ?? [], time);
  if (value !== undefined) samples.push({ clipId: null, value });
  for (const clip of track.clips ?? []) {
    if (time < clip.start || time > clip.start + clip.duration) continue;
    const value = evaluateTimelineKeyframes(
      clip.keyframes ?? [],
      time - clip.start,
    );
    if (value !== undefined) samples.push({ clipId: clip.id, value });
  }
  return samples;
}
