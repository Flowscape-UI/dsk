import { DskColorArea } from './dsk-color-area.ts';
import { DskColorHue } from './dsk-color-hue.ts';
import { DskColorAlpha } from './dsk-color-alpha.ts';
import { DskColorEyedropper } from './dsk-color-eyedropper.ts';

export { DskColorArea } from './dsk-color-area.ts';
export { DskColorHue } from './dsk-color-hue.ts';
export { DskColorAlpha } from './dsk-color-alpha.ts';
export { DskColorEyedropper } from './dsk-color-eyedropper.ts';
export type { ColorNumber } from './helpers/index.ts';
export type {
  EyeDropperErrorDetail,
  EyeDropperMode,
} from './dsk-color-eyedropper.ts';
export type { EyeDropperPreviewDetail } from './helpers/index.ts';
export type {
  EyeDropperModeAdapter,
  EyeDropperModeContext,
  EyeDropperModeInfo,
  EyeDropperSession,
} from './eyedropper-modes.ts';
export { createCanvasSampler } from './eyedropper-source.ts';
export { eyeDropperPagePseudoElements } from './page-eyedropper-options.ts';
export type { EyeDropperPageOptions } from './page-eyedropper-options.ts';
export type {
  EyeDropperSampleRequest,
  EyeDropperSampler,
} from './eyedropper-source.ts';

if (!customElements.get('dsk-color-area'))
  customElements.define('dsk-color-area', DskColorArea);
if (!customElements.get('dsk-color-hue'))
  customElements.define('dsk-color-hue', DskColorHue);
if (!customElements.get('dsk-color-alpha'))
  customElements.define('dsk-color-alpha', DskColorAlpha);
if (!customElements.get('dsk-color-eyedropper'))
  customElements.define('dsk-color-eyedropper', DskColorEyedropper);
