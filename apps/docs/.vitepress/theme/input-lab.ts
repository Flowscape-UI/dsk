import { ExamplePanel } from './example-panel.ts';
import { defineComponent, h, ref, onMounted, onBeforeUnmount } from 'vue';
import { useData } from 'vitepress';
import type { PropType } from 'vue';
import type { InputExampleKind } from '../../snippets/single-input.ts';

export const InputLab = defineComponent({
  name: 'InputLab',
  setup() {
    const host = ref<HTMLElement>();
    const { lang } = useData();
    const failed = ref(false);
    let active = true;
    let dispose: (() => void) | undefined;
    onMounted(async () => {
      try {
        const { mountInputLab } = await import('../../snippets/input-lab.ts');
        if (active && host.value)
          dispose = mountInputLab(
            host.value,
            lang.value === 'ru' ? 'ru' : 'en',
          );
      } catch {
        if (active) failed.value = true;
      }
    });
    onBeforeUnmount(() => {
      active = false;
      dispose?.();
    });
    return () =>
      h(ExamplePanel, null, {
        default: () =>
          h(
            'div',
            { ref: host },
            failed.value
              ? lang.value === 'ru'
                ? 'Не удалось загрузить пример. Обновите страницу.'
                : 'Could not load the example. Reload the page.'
              : undefined,
          ),
      });
  },
});

export const SingleInputExample = defineComponent({
  name: 'SingleInputExample',
  props: {
    kind: { type: String as PropType<InputExampleKind>, required: true },
    styled: Boolean,
  },
  setup(props) {
    const host = ref<HTMLElement>();
    let active = true;
    let dispose: (() => void) | undefined;
    onMounted(async () => {
      try {
        const { mountSingleInput } =
          await import('../../snippets/single-input.ts');
        if (active && host.value)
          dispose = mountSingleInput(host.value, props.kind, props.styled);
      } catch {
        if (active && host.value)
          host.value.textContent = 'Could not load example.';
      }
    });
    onBeforeUnmount(() => {
      active = false;
      dispose?.();
    });
    return () =>
      h(ExamplePanel, null, { default: () => h('div', { ref: host }) });
  },
});
