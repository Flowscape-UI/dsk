import { copyTimelineEasing, type TimelineEasing } from '../interpolation.ts';
export interface TimelineKeyframe {
  id: string;
  /** Additional CSS part names for styling this item independently. */
  part?: string;
  /** Seconds relative to the clip, or absolute timeline seconds for track keyframes. */
  time: number;
  value?: number;
  easing?: TimelineEasing;
  label?: string;
}
export interface TimelineClip {
  id: string;
  /** Additional CSS part names for styling this item independently. */
  part?: string;
  label: string;
  start: number;
  duration: number;
  keyframes?: TimelineKeyframe[];
}
export interface TimelineTrack {
  locked?: boolean;
  muted?: boolean;
  id: string;
  /** Additional CSS part names for styling this item independently. */
  part?: string;
  label: string;
  clips?: TimelineClip[];
  keyframes?: TimelineKeyframe[];
}
export interface TimelineResolvedTrack extends TimelineTrack {
  clips: TimelineClip[];
}
export interface TimelineSelection {
  trackId: string;
  clipId: string | null;
  keyframeId: string | null;
}
export interface TimelineEditDetail {
  tracks: TimelineTrack[];
  action:
    | 'move'
    | 'resize'
    | 'reorder'
    | 'history'
    | 'keyframe'
    | 'delete'
    | 'track-state';
}
function copyPart(part: string | undefined): { part?: string } {
  if (part === undefined) return {};
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*(\s+[a-zA-Z_][a-zA-Z0-9_-]*)*$/.test(part))
    throw new TypeError(
      'Part names must be whitespace-separated CSS identifiers.',
    );
  return { part };
}
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function copyKeyframes(frames: TimelineKeyframe[]): TimelineKeyframe[] {
  const keys = new Set<string>();
  return frames.map((frame) => {
    if (!frame.id || keys.has(frame.id))
      throw new TypeError('Keyframe IDs must be unique within their owner.');
    keys.add(frame.id);
    if (
      !Number.isFinite(frame.time) ||
      frame.time < 0 ||
      (frame.value !== undefined && !Number.isFinite(frame.value))
    )
      throw new RangeError(
        'Keyframes require a non-negative time and a finite value.',
      );
    return {
      id: frame.id,
      ...copyPart(frame.part),
      ...(frame.easing === undefined
        ? {}
        : { easing: copyTimelineEasing(frame.easing) }),
      time: frame.time,
      ...(frame.value === undefined ? {} : { value: frame.value }),
      ...(frame.label === undefined ? {} : { label: String(frame.label) }),
    };
  });
}

export function copyTracks(
  tracks: readonly TimelineTrack[],
): TimelineResolvedTrack[] {
  const ids = new Set<string>();
  return tracks.map((track) => {
    if (!track.id || ids.has(track.id))
      throw new TypeError('Track IDs must be unique and non-empty.');
    ids.add(track.id);
    const clips = new Set<string>();
    return {
      id: track.id,
      ...copyPart(track.part),
      label: String(track.label),
      ...(track.locked === undefined ? {} : { locked: !!track.locked }),
      ...(track.muted === undefined ? {} : { muted: !!track.muted }),
      ...(track.keyframes ? { keyframes: copyKeyframes(track.keyframes) } : {}),
      clips: (track.clips ?? []).map((clip) => {
        if (!clip.id || clips.has(clip.id))
          throw new TypeError('Clip IDs must be unique within a track.');
        clips.add(clip.id);
        if (
          !Number.isFinite(clip.start) ||
          clip.start < 0 ||
          !Number.isFinite(clip.duration) ||
          clip.duration <= 0
        )
          throw new RangeError(
            'Clips require a non-negative start and a positive duration.',
          );
        const keyframes = clip.keyframes
          ? copyKeyframes(clip.keyframes)
          : undefined;
        return {
          id: clip.id,
          ...copyPart(clip.part),
          label: String(clip.label),
          start: clip.start,
          duration: clip.duration,
          ...(keyframes ? { keyframes } : {}),
        };
      }),
    };
  });
}
