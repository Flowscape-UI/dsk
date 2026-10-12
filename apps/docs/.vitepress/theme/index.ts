import { ColorExample } from './color-example.ts';
import { GeometryExample } from './geometry-example.ts';
import { LayerExample } from './layer-example.ts';
import { CanvasExample } from './canvas-example.ts';
import { TldrawExample } from './tldraw-example.ts';
import { EngineExample } from './engine-example.ts';
import { ExampleProjectViewer } from './example-project.ts';
import { ExamplePanel } from './example-panel.ts';
import { InputLab, SingleInputExample } from './input-lab.ts';
import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import { EditorPreview } from './preview.ts';
import { SiteFooter } from './footer.ts';
import './style.css';
import logo from '@flowscape-ui/dsk/logo.svg?url';

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(SiteFooter),
      'nav-bar-title-before': () =>
        h('img', {
          class: 'dsk-docs-logo',
          src: logo,
          alt: '',
          width: 34,
          height: 34,
        }),
    }),
  async enhanceApp({ app }) {
    app.component('EditorPreview', EditorPreview);
    app.component('ExamplePanel', ExamplePanel);
    app.component('ColorExample', ColorExample);
    app.component('GeometryExample', GeometryExample);
    app.component('LayerExample', LayerExample);
    app.component('CanvasExample', CanvasExample);
    app.component('TldrawExample', TldrawExample);
    app.component('EngineExample', EngineExample);
    app.component('ExampleProjectViewer', ExampleProjectViewer);
    app.component('InputLab', InputLab);
    app.component('SingleInputExample', SingleInputExample);
    if (!import.meta.env.SSR) await import('@flowscape-ui/dsk');
  },
} satisfies Theme;
