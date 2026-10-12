import type { DskCurve } from '@flowscape-ui/dsk';

export type MotionExample = 'travel' | 'reveal' | 'rotate';

/** Animate application content with the curve's CSS export, including added nodes. */
export function animateWithCurve(
  curve: DskCurve,
  target: HTMLElement,
  example: MotionExample = 'travel',
  easing = curve.cssValue,
): Animation {
  const frames: Record<MotionExample, Keyframe[]> = {
    travel: [
      { transform: 'translateX(-65px)' },
      { transform: 'translateX(65px)' },
    ],
    reveal: [
      { opacity: 0, transform: 'translateY(35px) scale(0.7)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
    rotate: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }],
  };
  return target.animate(frames[example], {
    duration: matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : curve.duration,
    easing,
    fill: 'forwards',
  });
}
