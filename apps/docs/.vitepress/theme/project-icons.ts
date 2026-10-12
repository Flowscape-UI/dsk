import { h, type VNode } from 'vue';

/** Small, local SVG icons shared by the explorer, breadcrumbs, and editor tab. */
export function projectFileIcon(path: string): VNode {
  const name = path.split('/').pop() ?? path;
  let color = '#a5a5ad';
  let shapes: VNode[];
  const line = (d: string) =>
    h('path', {
      d,
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
  const label = (text: string, size = 8) =>
    h(
      'text',
      {
        x: 10,
        y: 13,
        fill: '#fff',
        'text-anchor': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': size,
        'font-weight': 700,
      },
      text,
    );
  if (name.endsWith('.ts')) {
    color = '#519aba';
    shapes = [
      h('rect', {
        x: 2,
        y: 2,
        width: 16,
        height: 16,
        rx: 1,
        fill: 'currentColor',
      }),
      label('TS'),
    ];
  } else if (name === 'package.json') {
    color = '#e75b60';
    shapes = [
      h('rect', { x: 2, y: 2, width: 16, height: 16, fill: 'currentColor' }),
      h('path', { d: 'M5 5h10v10h-4V8H9v7H5z', fill: '#fff' }),
    ];
  } else if (name.endsWith('.json')) {
    color = '#e5c07b';
    shapes = [
      line('M7 3H5v5l-2 2 2 2v5h2M13 3h2v5l2 2-2 2v5h-2'),
      h('circle', { cx: 10, cy: 10, r: 1, fill: 'currentColor' }),
    ];
  } else if (name.endsWith('.css')) {
    color = '#66b5f3';
    shapes = [line('M8 3 6 17M14 3l-2 14M3 7h14M2 13h14')];
  } else if (name.endsWith('.html')) {
    color = '#e78b64';
    shapes = [line('m6 5-4 5 4 5M14 5l4 5-4 5M12 3 8 17')];
  } else if (name.endsWith('.md')) {
    color = '#81b4dd';
    shapes = [line('M2 15V5l4 5 4-5v10M15 5v10m-3-3 3 3 3-3')];
  } else if (name.startsWith('.env')) {
    color = '#e9ce56';
    shapes = [
      h('rect', {
        x: 2,
        y: 2,
        width: 16,
        height: 16,
        rx: 1,
        fill: 'currentColor',
      }),
      h(
        'text',
        {
          x: 10,
          y: 12,
          fill: '#242424',
          'text-anchor': 'middle',
          'font-size': 6,
          'font-family': 'Arial, sans-serif',
          'font-weight': 700,
        },
        'ENV',
      ),
    ];
  } else if (name === '.gitignore') {
    color = '#e87a61';
    shapes = [
      h('path', { d: 'm10 1 9 9-9 9-9-9z', fill: 'currentColor' }),
      h('path', {
        d: 'm6 6 7 7M8 8v6',
        fill: 'none',
        stroke: '#242424',
        'stroke-width': 1.5,
      }),
      ...[
        [6, 6],
        [13, 13],
        [8, 14],
      ].map(([cx, cy]) => h('circle', { cx, cy, r: 1.5, fill: '#242424' })),
    ];
  } else if (name.endsWith('.tgz')) {
    color = '#d8b16b';
    shapes = [line('M4 2h9l3 3v13H4zM10 2v15M8 5h4M8 9h4M8 13h4')];
  } else {
    shapes = [line('M4 2h8l4 4v12H4zM12 2v5h4')];
  }
  return h(
    'svg',
    {
      class: 'dsk-project-file-icon',
      viewBox: '0 0 20 20',
      style: { color },
      'aria-hidden': 'true',
    },
    shapes,
  );
}

export function projectFolderIcon(): VNode {
  return h(
    'svg',
    {
      class: 'dsk-project-folder-icon',
      viewBox: '0 0 20 20',
      'aria-hidden': 'true',
    },
    [
      h('path', { d: 'M2 4h6l2 2h8v11H2z', fill: '#b28a48' }),
      h('path', {
        class: 'dsk-project-folder-closed',
        d: 'M2 8h16v9H2z',
        fill: '#d6ad67',
      }),
      h('path', {
        class: 'dsk-project-folder-open',
        d: 'M5 8h14l-3 9H2z',
        fill: '#d6ad67',
      }),
    ],
  );
}

export function projectChevron(): VNode {
  return h(
    'svg',
    {
      class: 'dsk-project-chevron',
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': 'true',
    },
    [
      h('path', {
        d: 'm6 4 4 4-4 4',
        stroke: 'currentColor',
        'stroke-width': 1.3,
      }),
    ],
  );
}
