export type CurvePoints = [number, number, number, number];
export type CurveValue =
  string | readonly [number, number, number, number] | null | undefined;
export type CurvePreset =
  'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type CurveNumber = number | string | null | undefined;
/** Control 1, control 2, and endpoint; the start is the previous endpoint. */
export type CurveSegment = [number, number, number, number, number, number];
export type CurvePath = CurveSegment[] & { start?: [number, number] };
export interface CurvePoint {
  x: number;
  y: number;
  kind: 'control' | 'node' | 'start' | 'end';
}

export const CURVE_PRESETS: Record<CurvePreset, CurvePoints> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

export const DEFAULT_CURVE: CurvePoints = [...CURVE_PRESETS['ease-in-out']];

const numberPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?';
const separatorPattern = '(?:\\s*,\\s*|\\s+)';
const pointsPattern = new RegExp(
  `^(${numberPattern})${separatorPattern}(${numberPattern})${separatorPattern}(${numberPattern})${separatorPattern}(${numberPattern})$`,
  'i',
);

export function curveNumber(value: CurveNumber, fallback: number): number {
  if (value == null || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function cleanCoordinate(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Number(Math.min(1, Math.max(0, value)).toFixed(6));
}

export function parseCurve(value: CurveValue): CurvePoints {
  if (value == null) return [...DEFAULT_CURVE];
  if (typeof value !== 'string') {
    if (value.length !== 4 || !value.every(Number.isFinite)) {
      return [...DEFAULT_CURVE];
    }
    return value.map(cleanCoordinate) as CurvePoints;
  }
  const text = value.trim().toLowerCase();
  if (Object.hasOwn(CURVE_PRESETS, text)) {
    return [...CURVE_PRESETS[text as CurvePreset]];
  }
  const body = /^cubic-bezier\(\s*(.*?)\s*\)$/.exec(text)?.[1] ?? text;
  const match = pointsPattern.exec(body);
  if (!match) return [...DEFAULT_CURVE];
  const coordinates = match.slice(1).map(Number);
  return coordinates.every(Number.isFinite)
    ? (coordinates.map(cleanCoordinate) as CurvePoints)
    : [...DEFAULT_CURVE];
}

export function formatCurve(points: CurvePoints): string {
  return `cubic-bezier(${points.map(cleanCoordinate).join(', ')})`;
}

export function curvePreset(points: CurvePoints): CurvePreset | 'custom' {
  for (const preset of Object.keys(CURVE_PRESETS) as CurvePreset[]) {
    if (
      points.every((value, index) => value === CURVE_PRESETS[preset][index])
    ) {
      return preset;
    }
  }
  return 'custom';
}

export function snapCoordinate(value: number, step: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  if (!Number.isFinite(step) || step <= 0) return cleanCoordinate(value);
  return cleanCoordinate(Math.round(value / step) * step);
}

function cubicCoordinate(time: number, first: number, second: number): number {
  const remaining = 1 - time;
  return (
    3 * remaining * remaining * time * first +
    3 * remaining * time * time * second +
    time * time * time
  );
}

/** Invert the horizontal coordinate before evaluating the vertical coordinate. */
export function sampleCurve(points: CurvePoints, progress: number): number {
  const position = Number.isNaN(progress)
    ? 0
    : Math.min(1, Math.max(0, progress));
  if (position === 0 || position === 1) return position;
  const [x1, y1, x2, y2] = points;
  let lower = 0;
  let upper = 1;
  // Bisection also handles flat derivatives at either endpoint or in the middle.
  for (let iteration = 0; iteration < 52; iteration += 1) {
    const time = (lower + upper) / 2;
    if (cubicCoordinate(time, x1, x2) < position) lower = time;
    else upper = time;
  }
  return cubicCoordinate((lower + upper) / 2, y1, y2);
}

export function parseCurvePath(value: CurveValue): CurvePath {
  if (typeof value === 'string' && /^curve\([\s\S]*\)$/.test(value.trim())) {
    try {
      return normalizeCurvePath(JSON.parse(value.trim().slice(6, -1)));
    } catch {
      return [[...DEFAULT_CURVE, 1, 1]];
    }
  }
  return [[...parseCurve(value), 1, 1]];
}

/** Reject malformed paths rather than silently dropping points. */
export function normalizeCurvePath(value: unknown): CurvePath {
  const fallback: CurvePath = [[...DEFAULT_CURVE, 1, 1]];
  let start: unknown;
  if (value && typeof value === 'object' && 'segments' in value) {
    start = 'start' in value ? value.start : undefined;
    value = value.segments;
  } else if (Array.isArray(value) && 'start' in value) start = value.start;
  if (
    start !== undefined &&
    (!Array.isArray(start) ||
      start.length !== 2 ||
      !start.every((v: unknown) => typeof v === 'number' && Number.isFinite(v)))
  )
    return fallback;
  if (!Array.isArray(value) || !value.length || value.length > 512)
    return fallback;
  const path: CurvePath = [];
  if (Array.isArray(start))
    path.start = [
      cleanCoordinate(Number(start[0])),
      cleanCoordinate(Number(start[1])),
    ];
  let startX = path.start?.[0] ?? 0;
  for (const item of value) {
    if (
      !Array.isArray(item) ||
      item.length !== 6 ||
      !item.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))
    )
      return fallback;
    const segment = (item as number[]).map(cleanCoordinate) as CurveSegment;
    if (segment[4] <= startX) return fallback;
    // The derivative of x(t) is quadratic. Its minimum must be nonnegative.
    const a = -startX + 3 * segment[0] - 3 * segment[2] + segment[4];
    const b = 2 * (startX - 2 * segment[0] + segment[2]);
    const c = segment[0] - startX;
    const t = a > 0 ? Math.min(1, Math.max(0, -b / (2 * a))) : 0;
    if (Math.min(c, a + b + c, a * t * t + b * t + c) < -0.000004)
      return fallback;
    path.push(segment);
    startX = segment[4];
  }
  return path;
}

export function formatCurvePath(path: CurvePath): string {
  const first = path[0];
  if (!first) return formatCurve(DEFAULT_CURVE);
  if (path.length === 1 && hasDefaultEndpoints(path))
    return formatCurve([first[0], first[1], first[2], first[3]]);
  return `curve(${JSON.stringify(path.start ? { start: path.start, segments: Array.from(path) } : path)})`;
}

export function hasDefaultEndpoints(path: CurvePath): boolean {
  return (
    (path.start?.[0] ?? 0) === 0 &&
    (path.start?.[1] ?? 0) === 0 &&
    path.at(-1)?.[4] === 1 &&
    path.at(-1)?.[5] === 1
  );
}

function copyPath(path: CurvePath): CurvePath {
  const result: CurvePath = path.map((segment) => [...segment] as CurveSegment);
  if (path.start) result.start = [...path.start];
  return result;
}

export function curvePathPoints(path: CurvePath): CurvePoint[] {
  const points: CurvePoint[] = path.flatMap((segment, index) => [
    { x: segment[0], y: segment[1], kind: 'control' as const },
    { x: segment[2], y: segment[3], kind: 'control' as const },
    ...(index < path.length - 1
      ? [{ x: segment[4], y: segment[5], kind: 'node' as const }]
      : []),
  ]);
  points.push(
    { x: path.start?.[0] ?? 0, y: path.start?.[1] ?? 0, kind: 'start' },
    { x: path.at(-1)?.[4] ?? 1, y: path.at(-1)?.[5] ?? 1, kind: 'end' },
  );
  return points;
}

export function curvePointAt(
  path: CurvePath,
  index: number,
  time: number,
): { x: number; y: number } {
  const segment = path[index];
  if (!segment) return { x: 0, y: 0 };
  const previous = path[index - 1];
  const t = Math.min(1, Math.max(0, time));
  const u = 1 - t;
  return {
    x:
      u ** 3 * (previous?.[4] ?? path.start?.[0] ?? 0) +
      3 * u * u * t * segment[0] +
      3 * u * t * t * segment[2] +
      t ** 3 * segment[4],
    y:
      u ** 3 * (previous?.[5] ?? path.start?.[1] ?? 0) +
      3 * u * u * t * segment[1] +
      3 * u * t * t * segment[3] +
      t ** 3 * segment[5],
  };
}

export function closestCurvePoint(
  path: CurvePath,
  x: number,
  y: number,
): { segment: number; time: number; distance: number } {
  let best = { segment: 0, time: 0, distance: Infinity };
  for (let index = 0; index < path.length; index++) {
    const distance = (t: number): number => {
      const point = curvePointAt(path, index, t);
      return Math.hypot(point.x - x, point.y - y);
    };
    let sample = 0;
    for (let i = 1; i <= 64; i++)
      if (distance(i / 64) < distance(sample / 64)) sample = i;
    let low = Math.max(0, (sample - 1) / 64);
    let high = Math.min(1, (sample + 1) / 64);
    for (let i = 0; i < 32; i++) {
      const left = (2 * low + high) / 3;
      const right = (low + 2 * high) / 3;
      if (distance(left) < distance(right)) high = right;
      else low = left;
    }
    const time = (low + high) / 2;
    if (distance(time) < best.distance)
      best = { segment: index, time, distance: distance(time) };
  }
  return best;
}

/** De Casteljau subdivision preserves the curve when inserting an anchor. */
export function splitCurvePath(
  path: CurvePath,
  index: number,
  time: number,
): CurvePath {
  const result = copyPath(path);
  const segment = result[index];
  if (!segment || path.length >= 512) return result;
  const previous = result[index - 1];
  const start: [number, number] = [
    previous?.[4] ?? path.start?.[0] ?? 0,
    previous?.[5] ?? path.start?.[1] ?? 0,
  ];
  const lerp = (a: [number, number], b: [number, number]): [number, number] => [
    a[0] + (b[0] - a[0]) * time,
    a[1] + (b[1] - a[1]) * time,
  ];
  const a = lerp(start, [segment[0], segment[1]]);
  const b = lerp([segment[0], segment[1]], [segment[2], segment[3]]);
  const c = lerp([segment[2], segment[3]], [segment[4], segment[5]]);
  const d = lerp(a, b);
  const e = lerp(b, c);
  const point = lerp(d, e);
  if (point[0] - start[0] < 0.00001 || segment[4] - point[0] < 0.00001)
    return result;
  result.splice(
    index,
    1,
    [...a, ...d, ...point].map(cleanCoordinate) as CurveSegment,
    [...e, ...c, segment[4], segment[5]].map(cleanCoordinate) as CurveSegment,
  );
  return result;
}

export function moveCurvePoint(
  path: CurvePath,
  pointIndex: number,
  x: number,
  y: number,
): CurvePath {
  const result = copyPath(path);
  const endpoint = pointIndex - (path.length * 3 - 1);
  if (endpoint === 0 || endpoint === 1) {
    const first = result[0]!;
    const last = result.at(-1)!;
    const oldX = endpoint === 0 ? (path.start?.[0] ?? 0) : last[4];
    const oldY = endpoint === 0 ? (path.start?.[1] ?? 0) : last[5];
    const lower =
      endpoint === 0
        ? 0
        : (result.at(-2)?.[4] ?? path.start?.[0] ?? 0) + 0.00001;
    const upper = endpoint === 0 ? first[4] - 0.00001 : 1;
    const newX = cleanCoordinate(Math.min(upper, Math.max(lower, x)));
    const newY = cleanCoordinate(y);
    if (endpoint === 0) {
      result.start = [newX, newY];
      first[0] = cleanCoordinate(
        Math.min(first[4], Math.max(newX, first[0] + newX - oldX)),
      );
      first[1] = cleanCoordinate(first[1] + newY - oldY);
      first[2] = Math.max(newX, first[2]);
    } else {
      last[4] = newX;
      last[5] = newY;
      last[2] = cleanCoordinate(
        Math.max(lower - 0.00001, Math.min(newX, last[2] + newX - oldX)),
      );
      last[3] = cleanCoordinate(last[3] + newY - oldY);
      last[0] = Math.min(newX, last[0]);
    }
    return result;
  }
  const index = Math.floor(pointIndex / 3);
  const kind = pointIndex % 3;
  const segment = result[index];
  if (!segment || pointIndex < 0) return result;
  const previous = result[index - 1];
  const left = previous?.[4] ?? path.start?.[0] ?? 0;
  if (kind < 2) {
    segment[kind * 2] = cleanCoordinate(
      Math.min(segment[4], Math.max(left, x)),
    );
    segment[kind * 2 + 1] = cleanCoordinate(y);
  } else {
    const next = result[index + 1];
    if (!next) return result;
    const newX = cleanCoordinate(
      Math.min(next[4] - 0.00001, Math.max(left + 0.00001, x)),
    );
    const newY = cleanCoordinate(y);
    const dx = newX - segment[4];
    const dy = newY - segment[5];
    segment[4] = newX;
    segment[5] = newY;
    segment[2] = cleanCoordinate(
      Math.max(left, Math.min(newX, segment[2] + dx)),
    );
    segment[3] = cleanCoordinate(segment[3] + dy);
    segment[0] = Math.min(newX, segment[0]);
    next[0] = cleanCoordinate(Math.min(next[4], Math.max(newX, next[0] + dx)));
    next[1] = cleanCoordinate(next[1] + dy);
    next[2] = Math.max(newX, next[2]);
  }
  for (const touched of kind === 2 ? [index, index + 1] : [index]) {
    const part = result[touched];
    if (!part) continue;
    const start = result[touched - 1]?.[4] ?? result.start?.[0] ?? 0;
    part[0] = Math.min(part[4], Math.max(start, part[0]));
    part[2] = Math.min(part[4], Math.max(start, part[2]));
  }
  return result;
}

export function removeCurvePoint(
  path: CurvePath,
  pointIndex: number,
): CurvePath {
  const result = copyPath(path);
  if (pointIndex < 0 || pointIndex % 3 !== 2) return result;
  const index = Math.floor(pointIndex / 3);
  const left = result[index];
  const right = result[index + 1];
  if (left && right)
    result.splice(index, 2, [
      left[0],
      left[1],
      right[2],
      right[3],
      right[4],
      right[5],
    ]);
  return result;
}

export function sampleCurvePath(path: CurvePath, progress: number): number {
  const x = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  if (x <= (path.start?.[0] ?? 0)) return path.start?.[1] ?? 0;
  if (x >= path.at(-1)![4]) return path.at(-1)![5];
  const index = path.findIndex((segment) => segment[4] >= x);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (curvePointAt(path, index, mid).x < x) low = mid;
    else high = mid;
  }
  return curvePointAt(path, index, (low + high) / 2).y;
}

/** CSS linear() is a sampled export; the editable value retains exact segments. */
export function curvePathCss(path: CurvePath): string {
  if (path.length === 1 && hasDefaultEndpoints(path))
    return formatCurvePath(path);
  const startX = path.start?.[0] ?? 0;
  const startY = path.start?.[1] ?? 0;
  const stops = [`${startY} 0%`];
  if (startX > 0) stops.push(`${startY} ${startX * 100}%`);
  for (let index = 0; index < path.length; index++)
    for (let i = 1; i <= 64; i++) {
      const point = curvePointAt(path, index, i / 64);
      stops.push(
        `${cleanCoordinate(point.y)} ${Number((point.x * 100).toFixed(6))}%`,
      );
    }
  if (path.at(-1)![4] < 1) stops.push(`${path.at(-1)![5]} 100%`);
  return `linear(${stops.join(', ')})`;
}
