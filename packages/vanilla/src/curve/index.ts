import { DskCurve } from './dsk-curve.ts';

export { DskCurve } from './dsk-curve.ts';
export type {
  CurvePoints,
  CurveValue,
  CurvePreset,
  CurveNumber,
  CurveSegment,
  CurvePath,
  CurvePoint,
} from './helpers/index.ts';

if (!customElements.get('dsk-curve'))
  customElements.define('dsk-curve', DskCurve);
