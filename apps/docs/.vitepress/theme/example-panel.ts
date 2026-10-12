import { defineComponent, h } from 'vue';
import './example-panel.css';

/** Shared documentation surface. Use controls/preview slots for a split demo. */
export const ExamplePanel = defineComponent({
  name: 'ExamplePanel',
  props: { title: { type: String, default: '' } },
  setup(props, { slots }) {
    return () =>
      h(
        'section',
        { class: 'dsk-example-panel', 'aria-label': props.title || undefined },
        [
          props.title
            ? h('div', { class: 'dsk-example-panel-title' }, props.title)
            : null,
          slots.controls || slots.preview
            ? h('div', { class: 'dsk-example-panel-split' }, [
                h(
                  'div',
                  { class: 'dsk-example-panel-controls' },
                  slots.controls?.(),
                ),
                h(
                  'div',
                  { class: 'dsk-example-panel-preview' },
                  slots.preview?.(),
                ),
              ])
            : h(
                'div',
                { class: 'dsk-example-panel-content' },
                slots.default?.(),
              ),
        ],
      );
  },
});
