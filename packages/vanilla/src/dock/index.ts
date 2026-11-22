import { DskDock } from './dsk-dock.ts';
import { DskDockZone } from './dsk-dock-zone.ts';
import { DskDockItem } from './dsk-dock-item.ts';
export { DskDock, DskDockZone, DskDockItem };
export type { DockDetail } from './dsk-dock.ts';
if (!customElements.get('dsk-dock')) customElements.define('dsk-dock', DskDock);
if (!customElements.get('dsk-dock-zone'))
  customElements.define('dsk-dock-zone', DskDockZone);
if (!customElements.get('dsk-dock-item'))
  customElements.define('dsk-dock-item', DskDockItem);
