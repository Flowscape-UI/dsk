import { defineComponent, h, ref, onMounted, onBeforeUnmount } from 'vue';
import { useData, withBase } from 'vitepress';

export const InstallCard = defineComponent({
  name: 'InstallCard',
  setup() {
    const { lang } = useData();
    const status = ref('Copy command');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const terminal = ref<HTMLElement>();
    const entered = ref(false);
    let observer: IntersectionObserver | undefined;
    onMounted(() => {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            entered.value = true;
            observer?.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      if (terminal.value) observer.observe(terminal.value);
    });
    onBeforeUnmount(() => {
      clearTimeout(timer);
      observer?.disconnect();
    });
    const command = 'npm i @flowscape-ui/dsk';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(command);
        status.value = 'Copied!';
      } catch {
        status.value = 'Select command to copy';
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        status.value = 'Copy command';
      }, 2500);
    };
    return () =>
      h(
        'section',
        { class: 'dsk-docs-install', 'aria-label': 'Get started with DSK' },
        [
          h('div', { class: 'dsk-docs-install-card' }, [
            h('div', { class: 'dsk-docs-install-content' }, [
              h('h2', 'Start building with DSK'),
              h(
                'div',
                {
                  ref: terminal,
                  class: [
                    'dsk-docs-terminal',
                    { 'dsk-docs-terminal-entered': entered.value },
                  ],
                },
                [
                  h('div', { class: 'dsk-docs-terminal-bar' }, [
                    h(
                      'span',
                      {
                        class: 'dsk-docs-terminal-dots',
                        'aria-hidden': 'true',
                      },
                      [h('i'), h('i'), h('i')],
                    ),
                    h('span', 'Terminal / npm'),
                  ]),
                  h('div', { class: 'dsk-docs-terminal-command' }, [
                    h('pre', { 'aria-label': command }, [
                      h(
                        'code',
                        {
                          class: 'dsk-docs-terminal-typing',
                          'aria-hidden': 'true',
                          style: { '--dsk-command-length': command.length },
                        },
                        [
                          h('span', 'npm i '),
                          h(
                            'span',
                            { class: 'dsk-docs-terminal-accent' },
                            '@flowscape-ui/dsk',
                          ),
                        ],
                      ),
                    ]),
                    h(
                      'button',
                      {
                        class: 'dsk-docs-copy-command',
                        type: 'button',
                        onClick: copy,
                        'aria-label': status.value,
                        title: status.value,
                      },
                      [
                        h(
                          'svg',
                          { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
                          status.value === 'Copied!'
                            ? [h('path', { d: 'm5 12 4 4L19 6' })]
                            : [
                                h('rect', {
                                  x: 8,
                                  y: 8,
                                  width: 12,
                                  height: 12,
                                  rx: 2,
                                }),
                                h('path', { d: 'M16 8V4H4v12h4' }),
                              ],
                        ),
                      ],
                    ),
                    h(
                      'span',
                      { class: 'dsk-docs-copy-status', role: 'status' },
                      status.value === 'Copy command' ? '' : status.value,
                    ),
                  ]),
                ],
              ),
            ]),
            h(
              'a',
              {
                class: 'dsk-docs-install-guide',
                href: withBase(
                  `${lang.value === 'ru' ? '/ru' : ''}/guide/installation`,
                ),
              },
              'Read the full quick start guide →',
            ),
          ]),
        ],
      );
  },
});
