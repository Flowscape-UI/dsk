import { DskTransformBoxHandleResize } from './dsk-transform-box-handle-resize.ts';
export { DskTransformBoxHandleResize } from './dsk-transform-box-handle-resize.ts';
import { DskTransformBoxHandleRotate } from './dsk-transform-box-handle-rotate.ts';
export { DskTransformBoxHandleRotate } from './dsk-transform-box-handle-rotate.ts';
import { DskTransformHeader } from './dsk-transform-header.ts';
import { DskTransformContent } from './dsk-transform-content.ts';
export { DskTransformHeader } from './dsk-transform-header.ts';
export { DskTransformContent } from './dsk-transform-content.ts';
import { DskTransformBox } from './dsk-transform-box.ts';
export { DskTransformBox } from './dsk-transform-box.ts';
export type { TransformBoxDetail } from './dsk-transform-box.ts';
export type {
  TransformBoxValue,
  TransformBoxAction,
  TransformBoxResizeDirection,
} from './helpers/geometry.ts';
if (!customElements.get('dsk-transform-box'))
  customElements.define('dsk-transform-box', DskTransformBox);

if (!customElements.get('dsk-transform-header'))
  customElements.define('dsk-transform-header', DskTransformHeader);
if (!customElements.get('dsk-transform-content'))
  customElements.define('dsk-transform-content', DskTransformContent);

if (!customElements.get('dsk-transform-box-handle-rotate'))
  customElements.define(
    'dsk-transform-box-handle-rotate',
    DskTransformBoxHandleRotate,
  );

if (!customElements.get('dsk-transform-box-handle-resize'))
  customElements.define(
    'dsk-transform-box-handle-resize',
    DskTransformBoxHandleResize,
  );
