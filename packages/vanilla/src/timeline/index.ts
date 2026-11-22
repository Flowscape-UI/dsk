import { DskTimeline } from './dsk-timeline.ts';
export { DskTimeline } from './dsk-timeline.ts';
export type {
  TimelineKeyframe,
  TimelineClip,
  TimelineTrack,
  TimelineResolvedTrack,
  TimelineSelection,
  TimelineEditDetail,
} from './helpers/model.ts';
if (!customElements.get('dsk-timeline'))
  customElements.define('dsk-timeline', DskTimeline);

export {
  evaluateTimelineKeyframes,
  evaluateTimelineTrack,
} from './interpolation.ts';
export type { TimelineEasing, TimelineSample } from './interpolation.ts';
