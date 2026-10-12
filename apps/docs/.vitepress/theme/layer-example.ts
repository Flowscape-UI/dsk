import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import type {
  DskListValue,
  LayerReorderDetail,
  ListRenameDetail,
  ListToggleDetail,
} from '@flowscape-ui/dsk';
import { ExamplePanel } from './example-panel.ts';
import { bindLayerPreview } from '../../snippets/layer-preview.ts';
import './layer-example.css';

export const LayerExample = defineComponent({
  props: { kind: { type: String, default: 'basic' } },
  setup(props) {
    const { lang } = useData();
    const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en);
    const root = ref<HTMLElement>();
    const preview = ref<HTMLElement>();
    const status = ref('');
    const ready = ref(false);
    let selected: DskListValue | undefined;
    let dispose: (() => void) | undefined;
    let active = true;
    const listeners = new AbortController();
    onMounted(async () => {
      await import('@flowscape-ui/dsk');
      if (!active || !root.value) return;
      const search = props.kind === 'search' || props.kind === 'scene';
      const custom = props.kind === 'custom';
      root.value.innerHTML = `<dsk-layer-tree aria-label="${t('Document layers', 'Слои документа')}">
        ${search ? `<dsk-tree-search placeholder="${t('Find a layer', 'Найти слой')}"></dsk-tree-search>` : ''}
        <dsk-list-value label="${t('Artboard', 'Монтажная область')}" open>
          ${custom ? `<dsk-list-header><strong data-dsk-name>${t('Artboard', 'Монтажная область')}</strong><small>Frame</small></dsk-list-header><span slot="expand-icon">+</span><span slot="collapse-icon">−</span><span slot="icon">▦</span>` : ''}
          <dsk-list-value data-layer="pink" label="${t('Cover', 'Обложка')}"></dsk-list-value>
          <dsk-list-value data-layer="violet" label="${t('Sticker', 'Стикер')}"></dsk-list-value>
          <dsk-list-value label="${t('Text', 'Текст')}"><dsk-list-value label="${t('Title', 'Заголовок')}"></dsk-list-value><dsk-list-value label="${t('Caption', 'Подпись')}"></dsk-list-value></dsk-list-value>
          ${custom ? `<dsk-list-footer>${t('Custom branch footer', 'Свой подвал ветки')}</dsk-list-footer>` : ''}
        </dsk-list-value>
        ${props.kind === 'disabled' ? `<dsk-list-value label="${t('Protected group', 'Защищённая группа')}" disabled open><dsk-list-value label="${t('Local A', 'Внутренний A')}"></dsk-list-value><dsk-list-value label="${t('Local B', 'Внутренний B')}"></dsk-list-value></dsk-list-value>` : ''}
      </dsk-layer-tree>`;
      const tree = root.value.querySelector('dsk-layer-tree')!;
      selected = tree.items.find((item) => item.dataset.layer === 'pink');
      tree.addEventListener(
        'focusin',
        (event) => {
          const item = event
            .composedPath()
            .find(
              (node): node is DskListValue =>
                node instanceof HTMLElement &&
                node.localName === 'dsk-list-value',
            );
          if (item) {
            selected = item;
            status.value = `${t('Focus', 'Фокус')}: ${item.displayName}`;
          }
        },
        { signal: listeners.signal },
      );
      tree.addEventListener(
        'toggle',
        (event: Event) => {
          const { open } = (event as CustomEvent<ListToggleDetail>).detail;
          status.value = `toggle: ${open}`;
        },
        { signal: listeners.signal },
      );
      tree.addEventListener(
        'rename',
        (event) => {
          const { oldLabel, label } = (event as CustomEvent<ListRenameDetail>)
            .detail;
          status.value = `rename: ${oldLabel} → ${label}`;
        },
        { signal: listeners.signal },
      );
      tree.addEventListener(
        'reorder',
        (event) => {
          const { item, oldIndex, newIndex, position } = (
            event as CustomEvent<LayerReorderDetail>
          ).detail;
          status.value = `reorder: ${item.displayName}, ${oldIndex} → ${newIndex} (${position})`;
        },
        { signal: listeners.signal },
      );
      if (preview.value) dispose = bindLayerPreview(tree, preview.value);
      ready.value = true;
    });
    onBeforeUnmount(() => {
      active = false;
      listeners.abort();
      dispose?.();
    });
    return () =>
      h(
        ExamplePanel,
        {
          class: [
            'dsk-layer-example',
            props.kind === 'custom' && 'dsk-layer-example-custom',
          ],
          'data-kind': props.kind,
        },
        {
          controls: () => [
            h('div', { ref: root }),
            h(
              'button',
              {
                disabled: !ready.value,
                onClick: () => selected?.startRename(),
              },
              t('Rename focused row', 'Переименовать строку в фокусе'),
            ),
            h(
              'output',
              { 'aria-live': 'polite' },
              status.value ||
                t(
                  'Expand a branch or focus a row.',
                  'Раскройте ветку или выберите строку.',
                ),
            ),
          ],
          preview: () => [
            h(
              'dsk-pan-zoom',
              { 'aria-label': t('Layer preview', 'Предпросмотр слоёв') },
              [h('div', { ref: preview, class: 'dsk-layer-scene' })],
            ),
            h(
              'p',
              t(
                'Focus Cover or Sticker to highlight it. Rename updates its title; reordering changes stacking. Collapsing and searching only affect the tree.',
                'Выберите Обложку или Стикер, чтобы выделить объект. Имя и порядок отражаются в предпросмотре. Сворачивание и поиск влияют только на дерево.',
              ),
            ),
          ],
        },
      );
  },
});
