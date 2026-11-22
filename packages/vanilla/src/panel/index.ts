import { DskPanel } from './dsk-panel.ts';

export { DskPanel } from './dsk-panel.ts';
export type { PanelDragEnd, PanelResizeDetail } from './dsk-panel.ts';

if (!customElements.get('dsk-panel'))
  customElements.define('dsk-panel', DskPanel);
