export interface TransformBoxValue {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}
export type TransformBoxAction = 'move' | 'rotate' | 'resize';
export function equalBox(a: TransformBoxValue, b: TransformBoxValue): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.angle === b.angle
  );
}

export type TransformBoxResizeDirection =
  't' | 'l' | 'r' | 'b' | 'tl' | 'tr' | 'bl' | 'br';
export function resizeDirection(
  value: string | null,
): TransformBoxResizeDirection {
  switch (value) {
    case 't':
    case 'l':
    case 'r':
    case 'b':
    case 'tl':
    case 'tr':
    case 'bl':
    case 'br':
      return value;
    default:
      return 'br';
  }
}
/** Delta is measured in the box's local axes. Keep the opposite edge fixed. */
export function resizeBox(
  start: TransformBoxValue,
  direction: TransformBoxResizeDirection,
  dx: number,
  dy: number,
): TransformBoxValue {
  const sx = direction.includes('r') ? 1 : direction.includes('l') ? -1 : 0;
  const sy = direction.includes('b') ? 1 : direction.includes('t') ? -1 : 0;
  const signedWidth = start.width + sx * dx;
  const signedHeight = start.height + sy * dy;
  const width = Math.abs(signedWidth);
  const height = Math.abs(signedHeight);
  const dw = width - start.width,
    dh = height - start.height;
  const angle = (start.angle * Math.PI) / 180;
  const cx = (sx * (signedWidth - start.width)) / 2,
    cy = (sy * (signedHeight - start.height)) / 2;
  return {
    ...start,
    width,
    height,
    x: start.x + cx * Math.cos(angle) - cy * Math.sin(angle) - dw / 2,
    y: start.y + cx * Math.sin(angle) + cy * Math.cos(angle) - dh / 2,
  };
}
