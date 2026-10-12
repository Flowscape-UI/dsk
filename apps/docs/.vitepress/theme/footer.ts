import { defineComponent, h } from 'vue';
import { useData, withBase } from 'vitepress';

export const SiteFooter = defineComponent({
  name: 'SiteFooter',
  setup() {
    const { lang } = useData();
    return () => {
      const base = lang.value === 'ru' ? '/ru' : '';
      const groups = [
        {
          title: 'Documentation',
          links: [
            ['Introduction', `${base}/guide/introduction`],
            ['Quick start', `${base}/guide/installation`],
            ['Styling & customization', `${base}/guide/styling`],
          ],
        },
        {
          title: 'Components',
          links: [
            ['Inputs & groups', `${base}/components/inputs`],
            ['Color & eyedropper', `${base}/components/color`],
            ['Angles & curves', `${base}/components/geometry`],
            ['Layer tree', `${base}/components/layers`],
            ['Canvas widgets', `${base}/components/canvas`],
          ],
        },
        {
          title: 'Project',
          links: [
            ['GitHub ↗', 'https://github.com/Flowscape-UI/dsk'],
            [
              'Support the project ↗',
              'https://github.com/sponsors/Flowscape-UI',
            ],
            ['MIT License', `${base}/license`],
          ],
        },
      ];
      return h('footer', { class: 'dsk-docs-site-footer' }, [
        h('div', { class: 'dsk-docs-footer-inner' }, [
          h('div', { class: 'dsk-docs-footer-intro' }, [
            h(
              'p',
              { class: 'dsk-docs-footer-byline' },
              'A project made by Flowscape Team',
            ),
            h(
              'h2',
              'We build open-source tools for people who build creative tools.',
            ),
            h(
              'p',
              { class: 'dsk-docs-footer-description' },
              'Small, precise components. Your design, your engine, your next idea.',
            ),
          ]),
          h(
            'nav',
            { class: 'dsk-docs-footer-links', 'aria-label': 'Footer' },
            groups.map((group) =>
              h('div', [
                h('h3', group.title),
                h(
                  'ul',
                  group.links.map(([label, href]) =>
                    h('li', [
                      h(
                        'a',
                        {
                          href: href?.startsWith('/') ? withBase(href) : href,
                          ...(href?.startsWith('https:')
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {}),
                        },
                        label,
                      ),
                    ]),
                  ),
                ),
              ]),
            ),
          ),
          h('div', { class: 'dsk-docs-footer-bottom' }, [
            h('span', '© 2026 Flowscape Team'),
            h('span', 'DSK · Open source under the MIT License'),
            h(
              'a',
              {
                href: '#top',
                'aria-label': 'Back to top',
                onClick: (event: MouseEvent) => {
                  event.preventDefault();
                  window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia(
                      '(prefers-reduced-motion: reduce)',
                    ).matches
                      ? 'instant'
                      : 'smooth',
                  });
                },
              },
              'Back to top ↑',
            ),
          ]),
        ]),
      ]);
    };
  },
});
