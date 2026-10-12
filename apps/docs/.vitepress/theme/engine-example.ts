import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue';
import { useData } from 'vitepress';
import './engine-example.css';

const engines = {
  tldraw: () => import('../../snippets/tldraw/mount-example.ts'),
  excalidraw: () => import('../../snippets/excalidraw/mount-example.ts'),
  reactflow: () => import('../../snippets/reactflow/mount-example.ts'),
  three: () => import('../../snippets/three/mount-example.ts'),
  konva: () => import('../../snippets/konva/mount-example.ts'),
  fabric: () => import('../../snippets/fabric/mount-example.ts'),
};
type Engine = keyof typeof engines;

/** Mount only the current page's engine, after hydration. Release it on navigation. */
export const EngineExample = defineComponent({
  props: { engine: { type: String as PropType<Engine>, required: true } },
  setup(props) {
    const { lang } = useData();
    const root = ref<HTMLElement>();
    const loading = ref(true);
    const error = ref(false);
    let active = true;
    let generation = 0;
    let dispose: (() => void) | undefined;
    let observer: MutationObserver | undefined;
    const start = async () => {
      const current = ++generation;
      dispose?.();
      dispose = undefined;
      observer?.disconnect();
      if (root.value) {
        delete root.value.dataset.ready;
        delete root.value.dataset.error;
      }
      loading.value = true;
      error.value = false;
      try {
        const { mountExample } = await engines[props.engine]();
        if (!active || current !== generation || !root.value) return;
        const host = root.value;
        const sync = () => {
          if (host.dataset.error) {
            loading.value = false;
            error.value = true;
            observer?.disconnect();
            dispose?.();
            dispose = undefined;
          } else if (host.dataset.ready === 'true') {
            loading.value = false;
          }
        };
        observer = new MutationObserver(sync);
        observer.observe(host, {
          attributes: true,
          attributeFilter: ['data-ready', 'data-error'],
        });
        const cleanup = await mountExample(host, lang.value === 'ru');
        if (!active || current !== generation) {
          cleanup();
          return;
        }
        dispose = cleanup;
        sync();
      } catch (cause) {
        if (!active || current !== generation) return;
        observer?.disconnect();
        dispose?.();
        dispose = undefined;
        root.value?.replaceChildren();
        loading.value = false;
        error.value = true;
        console.error(`Could not mount the ${props.engine} example`, cause);
      }
    };
    onMounted(start);
    watch(
      () => [props.engine, lang.value],
      () => {
        if (root.value) void start();
      },
    );
    onBeforeUnmount(() => {
      active = false;
      generation++;
      observer?.disconnect();
      dispose?.();
    });
    return () =>
      h(
        'div',
        {
          class: 'dsk-engine-loader',
          'data-engine': props.engine,
          'aria-busy': String(loading.value),
        },
        [
          h('div', { ref: root }),
          loading.value
            ? h('div', { class: 'dsk-engine-loading', role: 'status' }, [
                h('span', {
                  class: 'dsk-engine-spinner',
                  'aria-hidden': 'true',
                }),
                h(
                  'span',
                  lang.value === 'ru'
                    ? 'Загрузка интерактивного примера…'
                    : 'Loading interactive example…',
                ),
              ])
            : null,
          error.value
            ? h('div', { class: 'dsk-engine-error', role: 'alert' }, [
                h(
                  'p',
                  lang.value === 'ru'
                    ? 'Не удалось загрузить пример. Проверьте соединение и попробуйте ещё раз.'
                    : 'The example could not load. Check your connection and try again.',
                ),
                h(
                  'button',
                  { type: 'button', onClick: start },
                  lang.value === 'ru' ? 'Повторить' : 'Retry',
                ),
              ])
            : null,
        ],
      );
  },
});
