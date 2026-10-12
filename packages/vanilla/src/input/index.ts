import { DskInputUpload } from './dsk-input-upload.ts';
import { DskInput } from './dsk-input.ts';
import { DskInputGroup } from './dsk-input-group.ts';
import { DskInputHex } from './dsk-input-hex.ts';
import { DskInputColor } from './dsk-input-color.ts';

export { DskInputUpload } from './dsk-input-upload.ts';
export type { UploadRejectDetail } from './dsk-input-upload.ts';
export { DskInput } from './dsk-input.ts';
export { DskInputGroup } from './dsk-input-group.ts';
export { DskInputHex } from './dsk-input-hex.ts';
export { DskInputColor } from './dsk-input-color.ts';
export type { ColorFormat, AlphaMode } from './dsk-input-color.ts';
export { DskInputBase } from './input-base.ts';
export type { InputGroupAdapter } from './dsk-input-group.ts';
export type { HexFormat } from './helpers/index.ts';
export type { InputPositioning, InputTagPosition } from './dsk-input.ts';
export type {
  NumericBounds,
  NumericOptions,
  NumericOptionsInput,
  NumericValue,
  Progression,
} from './helpers/index.ts';

if (!customElements.get('dsk-input-upload'))
  customElements.define('dsk-input-upload', DskInputUpload);
if (!customElements.get('dsk-input'))
  customElements.define('dsk-input', DskInput);
if (!customElements.get('dsk-input-group'))
  customElements.define('dsk-input-group', DskInputGroup);
if (!customElements.get('dsk-input-hex'))
  customElements.define('dsk-input-hex', DskInputHex);
if (!customElements.get('dsk-input-color'))
  customElements.define('dsk-input-color', DskInputColor);
