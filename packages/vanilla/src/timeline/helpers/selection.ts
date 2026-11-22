import {
  clamp,
  copyTracks,
  type TimelineResolvedTrack,
  type TimelineSelection,
} from './model.ts';

export const selectionKey = (s: TimelineSelection): string =>
  JSON.stringify([s.trackId, s.clipId, s.keyframeId]);
export function selectionExists(
  tracks: TimelineResolvedTrack[],
  s: TimelineSelection,
): boolean {
  const track = tracks.find((t) => t.id === s.trackId);
  if (!track) return false;
  const owner =
    s.clipId === null ? track : track.clips.find((c) => c.id === s.clipId);
  return (
    !!owner &&
    (s.keyframeId === null ||
      !!owner.keyframes?.some((f) => f.id === s.keyframeId))
  );
}
/** Exclude children of selected containers so they are not edited twice. */
export function selectionRoots(
  items: readonly TimelineSelection[],
): TimelineSelection[] {
  return items.filter(
    (s) =>
      !items.some(
        (p) =>
          p !== s &&
          p.trackId === s.trackId &&
          p.keyframeId === null &&
          (p.clipId === null || p.clipId === s.clipId),
      ),
  );
}
export interface MovingItem {
  selection: TimelineSelection;
  start: number;
  end: number;
  min: number;
  max: number;
}
export function movingItems(
  tracks: TimelineResolvedTrack[],
  selected: readonly TimelineSelection[],
  duration: number,
): MovingItem[] {
  const items: MovingItem[] = [];
  for (const s of selectionRoots(selected)) {
    const track = tracks.find((t) => t.id === s.trackId);
    if (!track || track.locked) continue;
    const clip =
      s.clipId === null
        ? undefined
        : track.clips.find((c) => c.id === s.clipId);
    if (s.keyframeId !== null) {
      const frame = (
        clip?.keyframes ?? (s.clipId === null ? track.keyframes : undefined)
      )?.find((f) => f.id === s.keyframeId);
      if (frame)
        items.push({
          selection: s,
          start: (clip?.start ?? 0) + frame.time,
          end: (clip?.start ?? 0) + frame.time,
          min: -frame.time,
          max: (clip?.duration ?? duration) - frame.time,
        });
    } else if (clip)
      items.push({
        selection: s,
        start: clip.start,
        end: clip.start + clip.duration,
        min: -clip.start,
        max: duration - clip.start - clip.duration,
      });
  }
  return items;
}
export function moveItems(
  tracks: TimelineResolvedTrack[],
  items: MovingItem[],
  delta: number,
): TimelineResolvedTrack[] {
  const result = copyTracks(tracks);
  if (!items.length) return result;
  delta = clamp(
    delta,
    Math.max(...items.map((i) => i.min)),
    Math.min(...items.map((i) => i.max)),
  );
  for (const item of items) {
    const s = item.selection,
      track = result.find((t) => t.id === s.trackId)!;
    const clip =
      s.clipId === null
        ? undefined
        : track.clips.find((c) => c.id === s.clipId)!;
    if (s.keyframeId !== null)
      (clip?.keyframes ?? track.keyframes)!.find(
        (f) => f.id === s.keyframeId,
      )!.time += delta;
    else if (clip) clip.start += delta;
  }
  return result;
}
