import type { TimelineTrack } from '@flowscape-ui/dsk';

export const tracks: TimelineTrack[] = [
  {
    id: 'x',
    label: 'Position X',
    keyframes: [
      { id: 'start', time: 0, value: -60, easing: 'ease-in-out' },
      { id: 'end', time: 4, value: 60 },
    ],
  },
  {
    id: 'rotation',
    label: 'Rotation',
    clips: [
      {
        id: 'turn',
        label: 'Turn',
        start: 0,
        duration: 4,
        keyframes: [
          { id: 'start', time: 0, value: 0 },
          { id: 'end', time: 4, value: 180 },
        ],
      },
    ],
  },
  {
    id: 'opacity',
    label: 'Opacity',
    keyframes: [
      { id: 'start', time: 0, value: 1 },
      { id: 'end', time: 4, value: 0.3 },
    ],
  },
];
