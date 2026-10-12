import { DskTreeSearch } from './dsk-tree-search.ts';
import { DskListHeader } from './dsk-layer-tree.ts';
import { DskListFooter } from './dsk-layer-tree.ts';
import { DskListValue } from './dsk-layer-tree.ts';
import { DskLayerTree } from './dsk-layer-tree.ts';

export { DskTreeSearch } from './dsk-tree-search.ts';
export { DskLayerTree } from './dsk-layer-tree.ts';
export { DskListValue } from './dsk-layer-tree.ts';
export { DskListHeader } from './dsk-layer-tree.ts';
export { DskListFooter } from './dsk-layer-tree.ts';
export type { ListToggleDetail, ListRenameDetail } from './dsk-layer-tree.ts';
export type { LayerReorderDetail } from './helpers/index.ts';

if (!customElements.get('dsk-tree-search'))
  customElements.define('dsk-tree-search', DskTreeSearch);
if (!customElements.get('dsk-list-header'))
  customElements.define('dsk-list-header', DskListHeader);
if (!customElements.get('dsk-list-footer'))
  customElements.define('dsk-list-footer', DskListFooter);
if (!customElements.get('dsk-list-value'))
  customElements.define('dsk-list-value', DskListValue);
if (!customElements.get('dsk-layer-tree'))
  customElements.define('dsk-layer-tree', DskLayerTree);
