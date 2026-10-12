import { DskAngle } from './dsk-angle.ts';

export { DskAngle } from './dsk-angle.ts';
export type { AngleUnit, AngleNumber } from './helpers/index.ts';

if (!customElements.get('dsk-angle'))
  customElements.define('dsk-angle', DskAngle);
