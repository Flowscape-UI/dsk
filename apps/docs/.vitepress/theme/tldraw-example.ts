import { defineComponent, h } from 'vue';
import { EngineExample } from './engine-example.ts';

export const TldrawExample = defineComponent({
  setup: () => () => h(EngineExample, { engine: 'tldraw' }),
});
