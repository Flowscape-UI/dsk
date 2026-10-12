import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, type TsdownPlugin } from 'tsdown';

// Preserve the raw SVG imports shared with the Vite-powered playground.
function rawSvg(): TsdownPlugin {
  return {
    name: 'dsk-raw-svg',
    resolveId(source, importer) {
      if (source.endsWith('.svg?raw') && importer)
        return resolve(dirname(importer), source);
    },
    load(id) {
      if (id.endsWith('.svg?raw'))
        return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  };
}

export default defineConfig([
  {
    entry: { index: './src/index.ts' },
    format: ['esm'],
    platform: 'browser',
    target: 'es2022',
    outDir: 'dist',
    clean: true,
    plugins: [rawSvg()],
    sourcemap: true,
    dts: { sourcemap: true },
    css: { fileName: 'styles.css' },
    deps: {
      alwaysBundle: ['dom-to-image-more'],
      onlyBundle: ['dom-to-image-more'],
    },
    copy: [
      { from: 'src/styles.d.css.ts', to: 'dist' },
      { from: '../../LICENSE', to: 'dist' },
    ],
  },
  {
    entry: { 'dsk.global': './src/index.ts' },
    format: ['iife'],
    platform: 'browser',
    target: 'es2022',
    outDir: 'dist',
    clean: false,
    plugins: [rawSvg()],
    dts: false,
    minify: true,
    globalName: 'DSK',
    css: { fileName: 'styles.css' },
    deps: {
      alwaysBundle: ['dom-to-image-more'],
      onlyBundle: ['dom-to-image-more'],
    },
    outputOptions: {
      entryFileNames: 'dsk.global.js',
      codeSplitting: false,
    },
  },
]);
