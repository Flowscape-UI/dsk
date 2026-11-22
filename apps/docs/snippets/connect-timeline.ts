import { evaluateTimelineTrack, type DskTimeline } from '@flowscape-ui/dsk';
import { tracks } from './timeline-data';

/** Call on the client after mounting the markup; dispose when leaving the page. */
export function connectTimeline(
  timeline: DskTimeline,
  object: HTMLElement,
): () => void {
  timeline.tracks = tracks;
  const update = () => {
    const values = { x: 0, rotation: 0, opacity: 1 };
    for (const track of timeline.tracks) {
      const sample = evaluateTimelineTrack(track, timeline.currentTime)[0];
      if (
        sample &&
        (track.id === 'x' || track.id === 'rotation' || track.id === 'opacity')
      )
        values[track.id] = sample.value;
    }
    object.style.transform = `translateX(${values.x}px) rotate(${values.rotation}deg)`;
    object.style.opacity = String(values.opacity);
  };
  timeline.addEventListener('timeupdate', update);
  timeline.addEventListener('input', update);
  update();
  return () => {
    timeline.pause();
    timeline.removeEventListener('timeupdate', update);
    timeline.removeEventListener('input', update);
  };
}
