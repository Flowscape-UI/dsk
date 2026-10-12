import { test, expect, type Page } from '@playwright/test';
import type { DskInput, Progression } from '@flowscape-ui/dsk';

interface ObservedEvent {
  type: string;
  value: string;
  target: string;
}

declare global {
  interface Window {
    observedEvents: ObservedEvent[];
    detachedDemo?: DskInput;
    dragPointerId?: number;
    getDemo: () => DskInput;
  }
}

const progressions = [
  'linear',
  'exponential',
  'logarithmic',
] as const satisfies readonly Progression[];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#demo input')).toHaveValue('40');
  await page.evaluate(() => {
    window.observedEvents = [];
    window.getDemo = () => {
      const demo = document.querySelector<DskInput>('#demo');
      if (!demo) throw new Error('The demo input is missing.');
      return demo;
    };
    const demo = window.getDemo();
    demo.oninput = (event) => {
      const target = event.target;
      if (target !== demo) throw new Error('Input event must target the host.');
      window.observedEvents.push({
        type: event.type,
        value: demo.value,
        target: demo.id,
      });
    };
    demo.setAttribute(
      'onchange',
      'window.observedEvents.push({ type: event.type, value: this.value, target: event.target.id })',
    );
  });
});

async function handleBox(page: Page) {
  const box = await page.locator('#demo [part="handle"]').boundingBox();
  if (!box) throw new Error('The drag handle must have a bounding box.');
  return box;
}

async function drag(page: Page, distance: number): Promise<void> {
  const box = await handleBox(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + distance, y, { steps: 8 });
  await page.mouse.up();
}

test('positioning updates text alignment with a center fallback and preserves editing', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await expect(input).toHaveCSS('text-align', 'center');
  for (const positioning of ['left', 'right', 'center'] as const) {
    await page.locator('[name="positioning"]').selectOption(positioning);
    await expect(input).toHaveCSS('text-align', positioning);
    expect(await page.evaluate(() => window.getDemo().positioning)).toBe(
      positioning,
    );
  }
  await input.fill('12.');
  await page.evaluate(() => {
    window.observedEvents = [];
    window.getDemo().positioning = 'right';
  });
  await expect(page.locator('#demo')).toHaveAttribute('positioning', 'right');
  await expect(input).toHaveCSS('text-align', 'right');
  await expect(input).toHaveValue('12.');
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  for (const value of ['', 'invalid', null]) {
    await page.evaluate((value) => {
      const demo = window.getDemo();
      if (value === null) demo.removeAttribute('positioning');
      else demo.setAttribute('positioning', value);
    }, value);
    await expect(input).toHaveCSS('text-align', 'center');
    expect(await page.evaluate(() => window.getDemo().positioning)).toBe(
      'center',
    );
  }
  await page.locator('[name="positioning"]').selectOption('left');
  await page.locator('#reset').click();
  await expect(page.locator('[name="positioning"]')).toHaveValue('center');
  await expect(input).toHaveCSS('text-align', 'center');
});

test('tags follow value width, alignment and prefix/suffix gap without changing the value', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  const tag = page.locator('#demo [part="tag"]');
  await expect(tag).toBeHidden();
  await page.locator('[name="tag"]').fill('%');
  await expect(tag).toHaveText('%');
  for (const positioning of ['left', 'center', 'right'] as const) {
    await page.locator('[name="positioning"]').selectOption(positioning);
    for (const side of ['left', 'right'] as const) {
      await page.locator('[name="tag-position"]').selectOption(side);
      await page.locator('[name="tag-gap"]').fill('8');
      // Read one layout snapshot so asynchronously loaded fonts cannot mix sizes.
      const { fieldBox, inputBox, tagBox, areaBox } = await page.evaluate(
        () => {
          const root = window.getDemo().shadowRoot;
          const box = (selector: string) => {
            const element = root?.querySelector(selector);
            if (!element) throw new Error('Missing tag layout');
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          };
          return {
            fieldBox: box('.dsk-input-mirror'),
            inputBox: box('input'),
            tagBox: box('[part="tag"]'),
            areaBox: box('.dsk-input-text'),
          };
        },
      );
      expect(inputBox?.x).toBeCloseTo(areaBox.x, 0);
      expect(inputBox?.width).toBeCloseTo(areaBox.width, 0);
      expect(inputBox?.height).toBeCloseTo(areaBox.height, 0);
      for (const offset of [2, areaBox.width - 2]) {
        const point = {
          x: areaBox.x + offset,
          y: areaBox.y + areaBox.height / 2,
        };
        expect(
          await page.evaluate(({ x, y }) => {
            const root = window.getDemo().shadowRoot;
            return root?.elementFromPoint(x, y)?.matches('input');
          }, point),
        ).toBe(true);
        await page.mouse.click(point.x, point.y);
        await expect(input).toBeFocused();
      }
      const gap =
        side === 'left'
          ? fieldBox.x - tagBox.x - tagBox.width
          : tagBox.x - fieldBox.x - fieldBox.width;
      expect(gap).toBeCloseTo(8, 0);
      const left = Math.min(fieldBox.x, tagBox.x);
      const right = Math.max(
        fieldBox.x + fieldBox.width,
        tagBox.x + tagBox.width,
      );
      if (positioning === 'left') expect(left).toBeCloseTo(areaBox.x + 8, 0);
      else if (positioning === 'right')
        expect(right).toBeCloseTo(areaBox.x + areaBox.width - 8, 0);
      else
        expect((left + right) / 2).toBeCloseTo(
          areaBox.x + areaBox.width / 2,
          0,
        );
    }
  }
  await input.fill('1');
  const small = await page.locator('#demo .dsk-input-mirror').boundingBox();
  await input.fill('12.34');
  const large = await page.locator('#demo .dsk-input-mirror').boundingBox();
  expect(large?.width).toBeGreaterThan(small?.width ?? Infinity);
  await expect(tag).toHaveCSS('pointer-events', 'none');
  await expect(tag).toHaveCSS('user-select', 'none');
  const labelBox = await tag.boundingBox();
  if (!labelBox) throw new Error('Missing tag bounds');
  const labelPoint = {
    x: labelBox.x + labelBox.width / 2,
    y: labelBox.y + labelBox.height / 2,
  };
  expect(
    await page.evaluate(({ x, y }) => {
      const root = window.getDemo().shadowRoot;
      return (
        root?.elementFromPoint(x, y) === root?.querySelector('[part="tag"]')
      );
    }, labelPoint),
  ).toBe(false);
  await page.mouse.click(labelPoint.x, labelPoint.y);
  await expect(input).toBeFocused();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('13.34');
  await drag(page, 40);
  expect(Number(await input.inputValue())).toBeGreaterThan(13.34);
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.tagGap = 'invalid';
    demo.tagPosition = 'left';
    demo.tag = '<b>%</b>';
    demo.name = 'amount';
    const form = document.createElement('form');
    demo.before(form);
    form.append(demo);
  });
  await expect(tag).toHaveText('<b>%</b>');
  await expect(tag.locator('b')).toHaveCount(0);
  await expect(page.locator('#demo .dsk-input-value')).toHaveCSS(
    'column-gap',
    '4px',
  );
  expect(
    await page.evaluate(() => {
      const demo = window.getDemo();
      const form = demo.closest('form');
      return form && new FormData(form).get('amount') === demo.value;
    }),
  ).toBe(true);
  await page.evaluate(() => (window.getDemo().tag = ''));
  await expect(tag).toBeHidden();
  await expect(input).not.toHaveAttribute('aria-describedby');
});

test('tags handle placeholders, long text and live updates without emitting edits', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.value = '';
    demo.placeholder = 'Enter amount';
    demo.tag = 'px';
    demo.tagGap = '0.5em';
  });
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('placeholder', 'Enter amount');
  await expect(input).toHaveAttribute('aria-describedby', 'dsk-input-tag');
  const box = await input.boundingBox();
  expect(box?.width).toBeGreaterThan(40);
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.style.width = '140px';
    demo.tag = 'A very long custom label that should not overflow';
  });
  const hostBox = await page.locator('#demo').boundingBox();
  const tagBox = await page.locator('#demo [part="tag"]').boundingBox();
  if (!hostBox || !tagBox) throw new Error('Missing tag bounds');
  expect(tagBox.x + tagBox.width).toBeLessThanOrEqual(
    hostBox.x + hostBox.width,
  );
  await page.locator('#reset').click();
  await expect(page.locator('#demo [part="tag"]')).toBeHidden();
  await expect(page.locator('[name="tag-position"]')).toHaveValue('right');
  await expect(page.locator('[name="tag-gap"]')).toHaveValue('4px');
});

test('expressions commit on Enter and blur, respect bounds and recover from invalid input', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await input.fill('(20 + 5) * 2');
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await input.press('Enter');
  await expect(input).toHaveValue('50');
  await input.fill('0.1 + 0.2');
  await input.press('Tab');
  await expect(input).toHaveValue('0.3');
  await input.fill('1920 / 2');
  await input.press('Enter');
  await expect(input).toHaveValue('100');
  for (const invalid of ['1 / 0', '1+', 'globalThis.alert(1)']) {
    await input.fill(invalid);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.press('Enter');
    await expect(input).toHaveValue('100');
  }
  await input.fill('20 / 2');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('11');
});

test('select-on-focus selects on first mouse or keyboard focus but permits later caret placement', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  const selection = () =>
    input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]);
  await page.locator('[name="select-on-focus"]').check();
  await input.click();
  expect(await selection()).toEqual([0, 2]);
  await input.pressSequentially('72');
  await expect(input).toHaveValue('72');
  await input.click();
  const [start, end] = await selection();
  expect(start).toBe(end);
  await page.evaluate(() => window.getDemo().blur());
  await input.focus();
  expect(await selection()).toEqual([0, 2]);
  await page.evaluate(() => {
    window.getDemo().blur();
    window.getDemo().setAttribute('select-on-focus', 'false');
  });
  await input.click();
  const [disabledStart, disabledEnd] = await selection();
  expect(disabledStart).toBe(disabledEnd);
});

test('history groups typing and drag, restores drafts and truncates redo after a new edit', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await input.fill('20 + 5');
  await input.press('Control+z');
  await expect(input).toHaveValue('40');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('20 + 5');
  await input.press('Enter');
  await expect(input).toHaveValue('25');
  await input.fill('60');
  await input.press('Enter');
  await input.press('Control+z');
  await expect(input).toHaveValue('25');
  await input.press('Control+z');
  await expect(input).toHaveValue('40');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('25');
  await input.fill('30');
  await input.press('Enter');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('30');
  await drag(page, 40);
  await expect(input).toHaveValue('40');
  await page.evaluate(() => (window.observedEvents = []));
  await input.press('Control+z');
  await expect(input).toHaveValue('30');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('40');
  expect(
    await page.evaluate(() => window.observedEvents.map((event) => event.type)),
  ).toEqual(['input', 'change', 'input', 'change']);
  await page.evaluate(() => (window.getDemo().value = 15));
  await input.press('Control+z');
  await expect(input).toHaveValue('15');
});

test('history is isolated per field and readonly prevents restoration', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await input.press('ArrowUp');
  await page.evaluate(() => {
    const other = document.createElement('dsk-input');
    other.id = 'other-history';
    other.value = 10;
    window.getDemo().after(other);
  });
  const other = page.locator('#other-history input');
  await other.press('ArrowUp');
  await other.press('Control+z');
  await expect(other).toHaveValue('10');
  await expect(input).toHaveValue('41');
  await input.press('Control+z');
  await expect(input).toHaveValue('40');
  await page.evaluate(() => (window.getDemo().readOnly = true));
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('40');
  await page.evaluate(() => (window.getDemo().readOnly = false));
  await input.evaluate((element) =>
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'historyRedo',
        cancelable: true,
        bubbles: true,
      }),
    ),
  );
  await expect(input).toHaveValue('41');
});

test('manual input emits host events and commits once on Enter then blur', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await input.fill('72');
  expect(await page.evaluate(() => window.observedEvents)).toEqual([
    { type: 'input', value: '72', target: 'demo' },
  ]);
  await input.press('Enter');
  await page.getByRole('heading', { name: 'Properties', exact: true }).click();
  expect(
    await page.evaluate(() =>
      window.observedEvents.filter((e) => e.type === 'change'),
    ),
  ).toEqual([{ type: 'change', value: '72', target: 'demo' }]);
  await expect(page.locator('#change-count')).toHaveText('1');
});

test('manual commit clamps bounds, invalid draft reverts, Escape cancels', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await input.fill('150');
  await input.press('Tab');
  await expect(input).toHaveValue('100');
  await input.fill('not a number');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.press('Enter');
  await expect(input).toHaveValue('100');
  await input.fill('12');
  await input.press('Escape');
  await expect(input).toHaveValue('100');
  await expect(input).not.toBeFocused();
});

test('focused arrow keys use independent decimal steps, update live and respect bounds', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.min = 0;
    demo.max = 1;
    demo.step = 0.1;
    demo.value = 0.2;
    demo.setAttribute('key-horizontal-step', '0.03');
    demo.setAttribute('key-vertical-step', '0.2');
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('0.23');
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('0.2');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('0.4');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('0.2');
  expect(
    await page.evaluate(() => window.observedEvents.map((event) => event.type)),
  ).toEqual([
    'input',
    'change',
    'input',
    'change',
    'input',
    'change',
    'input',
    'change',
  ]);
  await input.press('PageUp');
  await expect(input).toHaveValue('1');
  await input.press('PageDown');
  await expect(input).toHaveValue('0');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.keyHorizontalStep = 0.125;
    demo.keyVerticalStep = '0.25';
    window.observedEvents = [];
  });
  await expect(page.locator('#demo')).toHaveAttribute(
    'key-horizontal-step',
    '0.125',
  );
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  await input.press('ArrowRight');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('0.375');
  await page.evaluate(() =>
    window.getDemo().setAttribute('key-horizontal-step', '0.05'),
  );
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('0.325');
  await input.press('ArrowUp');
  await input.press('ArrowUp');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('1');
  const eventsAtMaximum = await page.evaluate(
    () => window.observedEvents.length,
  );
  await input.press('ArrowRight');
  expect(await page.evaluate(() => window.observedEvents.length)).toBe(
    eventsAtMaximum,
  );
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('0.95');
});

test('missing or invalid keyboard steps independently fall back to the effective ordinary step', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  for (const value of [null, '', ' ', 'invalid', '0', '-2', 'Infinity']) {
    await page.evaluate((value) => {
      const demo = window.getDemo();
      demo.value = 0;
      demo.step = 0.125;
      demo.keyHorizontalStep = value;
      demo.keyVerticalStep = 0.5;
    }, value);
    await input.press('ArrowRight');
    await expect(input).toHaveValue('0.125');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('0.625');
    await page.evaluate((value) => {
      const demo = window.getDemo();
      demo.keyHorizontalStep = 0.25;
      demo.keyVerticalStep = value;
    }, value);
    await input.press('ArrowDown');
    await expect(input).toHaveValue('0.5');
    await input.press('ArrowLeft');
    await expect(input).toHaveValue('0.25');
  }
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.keyHorizontalStep = null;
    demo.keyVerticalStep = undefined;
    demo.step = 'invalid';
    demo.value = 0;
  });
  await expect(page.locator('#demo')).not.toHaveAttribute(
    'key-horizontal-step',
  );
  await expect(page.locator('#demo')).not.toHaveAttribute('key-vertical-step');
  await input.press('ArrowRight');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('2');
});

test('keyboard adjustment follows focus between fields and Escape deactivates without committing a draft', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.evaluate(() => {
    const second = document.createElement('dsk-input');
    second.id = 'second-input';
    second.value = 10;
    second.keyHorizontalStep = 2;
    second.keyVerticalStep = 5;
    window.getDemo().after(second);
  });
  const secondInput = page.locator('#second-input input');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await expect(input).toHaveValue('40');
  await expect(secondInput).toHaveValue('10');
  await input.press('ArrowRight');
  await expect(input).toHaveValue('41');
  await expect(secondInput).toHaveValue('10');
  await secondInput.press('ArrowUp');
  await expect(secondInput).toHaveValue('15');
  await expect(input).toHaveValue('41');
  await input.fill('99');
  await page.evaluate(() => {
    window.observedEvents = [];
    window.getDemo().keyHorizontalStep = 0.5;
    window.getDemo().keyVerticalStep = 2;
  });
  await expect(input).toHaveValue('99');
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  await input.press('Escape');
  await expect(input).toHaveValue('41');
  await expect(input).not.toBeFocused();
  await page.evaluate(() => window.getDemo().blur());
  expect(await page.evaluate(() => window.observedEvents)).toEqual([
    { type: 'input', value: '41', target: 'demo' },
  ]);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveValue('41');
  await expect(secondInput).toHaveValue('15');
  // A keyboard event addressed to an inactive editor must not adjust it.
  await input.dispatchEvent('keydown', { key: 'ArrowUp' });
  await expect(input).toHaveValue('41');
  await page.evaluate(() => (window.getDemo().readOnly = true));
  await input.focus();
  await input.press('ArrowLeft');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('41');
  await input.press('Escape');
  await expect(input).not.toBeFocused();
});

test('modified arrows preserve native editing and keyboard steps do not affect dragging', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.step = 0.25;
    demo.keyHorizontalStep = 2;
    demo.keyVerticalStep = 5;
  });
  await input.focus();
  await input.press('End');
  await input.press('Shift+ArrowLeft');
  expect(
    await input.evaluate((element: HTMLInputElement) => ({
      start: element.selectionStart,
      end: element.selectionEnd,
    })),
  ).toEqual({ start: 1, end: 2 });
  expect(
    await input.evaluate((element) => {
      const handled: boolean[] = [];
      for (const modifier of ['shiftKey', 'altKey', 'ctrlKey', 'metaKey']) {
        for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
          const event = new KeyboardEvent('keydown', {
            key,
            [modifier]: true,
            bubbles: true,
            cancelable: true,
          });
          element.dispatchEvent(event);
          handled.push(event.defaultPrevented);
        }
      }
      return handled.some(Boolean);
    }),
  ).toBe(false);
  await expect(input).toHaveValue('40');
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  await drag(page, 40);
  await expect(input).toHaveValue('42.5');
});

test('loop flags wrap keyboard steps independently and reset in the playground', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.locator('[name="loopafter-max"]').check();
  await page.locator('[name="loopafter-min"]').check();
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.step = 2;
    demo.value = 100;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('2');
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('0');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('98');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.keyVerticalStep = 205;
    demo.value = 100;
  });
  await input.press('ArrowUp');
  await expect(input).toHaveValue('5');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.setAttribute('loopafter-max', 'false');
    demo.value = 100;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('100');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.loopAfterMin = false;
    demo.loopAfterMax = true;
    demo.value = 0;
  });
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('0');
  await input.fill('150');
  await input.press('Enter');
  await expect(input).toHaveValue('100');
  await page.locator('#reset').click();
  expect(
    await page.evaluate(() => [
      window.getDemo().loopAfterMin,
      window.getDemo().loopAfterMax,
    ]),
  ).toEqual([false, false]);
  await expect(page.locator('[name="loopafter-max"]')).not.toBeChecked();
});

test('shared loop flag enables both directions and preserves individual settings when disabled', async ({
  page,
}) => {
  const input = page.locator('#demo input');
  await page.locator('[name="loopafter"]').check();
  await expect(page.locator('#code')).toContainText('loopafter');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.step = 2;
    demo.value = 100;
    demo.setAttribute('loopafter-min', 'false');
    demo.setAttribute('loopafter-max', 'false');
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('2');
  await input.press('ArrowLeft');
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('98');
  await page.evaluate(() => {
    const demo = window.getDemo();
    demo.loopAfterMin = true;
    demo.setAttribute('loopafter', 'false');
    demo.value = 100;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('100');
  await page.evaluate(() => (window.getDemo().value = 0));
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('98');
  await page.evaluate(() => (window.getDemo().loopAfter = true));
  await expect(page.locator('#demo')).toHaveAttribute('loopafter', 'true');
  await page.locator('#reset').click();
  expect(await page.evaluate(() => window.getDemo().loopAfter)).toBe(false);
  await expect(page.locator('[name="loopafter"]')).not.toBeChecked();
});

for (const progression of progressions) {
  test(`looping drag preserves reversal and Escape (${progression})`, async ({
    page,
  }) => {
    await page.evaluate((progression) => {
      const demo = window.getDemo();
      demo.step = 2;
      demo.value = 100;
      demo.loopAfterMin = true;
      demo.loopAfterMax = true;
      demo.progression = progression;
      if (progression === 'linear') {
        demo.loopAfterMin = false;
        demo.loopAfterMax = false;
        demo.loopAfter = true;
      }
    }, progression);
    const box = await handleBox(page);
    await page.mouse.move(box.x + 15, box.y + 15);
    await page.mouse.down();
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement?.id))
      .toBe('demo');
    const move = async (dx: number) =>
      page.evaluate((dx) => {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            movementX: dx,
            buttons: 1,
          }),
        );
      }, dx);
    const input = page.locator('#demo input');
    await move(4);
    await expect(input).toHaveValue('2');
    await move(4);
    await expect(input).toHaveValue('4');
    await move(-4);
    await expect(input).toHaveValue('2');
    await move(-4);
    await expect(input).toHaveValue('0');
    await move(-4);
    await expect(input).toHaveValue('98');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(input).toHaveValue('100');
    expect(
      await page.evaluate(() =>
        window.observedEvents.filter((event) => event.type === 'change'),
      ),
    ).toEqual([]);
  });
}

test('handle drag changes value and commits exactly once beyond handle bounds', async ({
  page,
}) => {
  await drag(page, 40);
  await expect(page.locator('#demo input')).toHaveValue('50');
  expect(
    await page.evaluate(() =>
      window.observedEvents.filter((e) => e.type === 'change'),
    ),
  ).toEqual([{ type: 'change', value: '50', target: 'demo' }]);
  await drag(page, -240);
  await expect(page.locator('#demo input')).toHaveValue('0');
});

test('fractional steps and keyboard increments stay precise', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Decimals', exact: true }).click();
  const input = page.locator('#demo input');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('0.51');
  await input.press('PageDown');
  await expect(input).toHaveValue('0.41');
  await drag(page, 40);
  await expect(input).toHaveValue('0.51');
});

test('progression changes drag sensitivity and supports negative unbounded values', async ({
  page,
}) => {
  const values: Record<Progression, number> = {
    linear: 0,
    exponential: 0,
    logarithmic: 0,
  };
  for (const progression of progressions) {
    await page.getByRole('button', { name: 'Unbounded', exact: true }).click();
    await page.locator('[name="progression"]').selectOption(progression);
    await drag(page, 80);
    values[progression] = Number(
      await page.locator('#demo input').inputValue(),
    );
  }
  expect(values.exponential).toBeGreaterThan(values.linear);
  expect(values.linear).toBeGreaterThan(values.logarithmic);
  await page.getByRole('button', { name: 'Unbounded', exact: true }).click();
  await drag(page, -40);
  await expect(page.locator('#demo input')).toHaveValue('-10');
});

test('live properties, placeholder, disabled and readonly controls work', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Placeholder', exact: true }).click();
  const input = page.locator('#demo input');
  await expect(input).toHaveAttribute('placeholder', 'Enter a number');
  await page.locator('#settings [name="value"]').fill('25');
  await expect(input).toHaveValue('25');
  await page.locator('#settings [name="max"]').fill('20');
  await expect(input).toHaveValue('20');
  expect(await page.evaluate(() => window.observedEvents)).toEqual([]);
  await page
    .locator('#settings')
    .getByLabel('Disabled', { exact: true })
    .check();
  await expect(input).toBeDisabled();
  await drag(page, -40);
  await expect(input).toHaveValue('20');
  await page
    .locator('#settings')
    .getByLabel('Disabled', { exact: true })
    .uncheck();
  await page
    .locator('#settings')
    .getByLabel('Read only', { exact: true })
    .check();
  await expect(input).toHaveAttribute('readonly', '');
  await input.press('ArrowDown');
  await drag(page, -40);
  await expect(input).toHaveValue('20');
});

test('custom icon loads, failed icon falls back, image cannot start native drag', async ({
  page,
}) => {
  const icon =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="red"/></svg>',
    );
  await page.locator('#settings [name="src"]').fill(icon);
  const image = page.locator('#demo img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('draggable', 'false');
  await page.route('**/missing-icon.png', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.locator('#settings [name="src"]').fill('/missing-icon.png');
  await expect(image).toBeHidden();
  await expect(page.locator('#demo svg')).toBeVisible();
});

test('Escape cancels an active drag without change and reconnect does not duplicate listeners', async ({
  page,
}) => {
  const handle = await handleBox(page);
  await page.mouse.move(handle.x + 15, handle.y + 15);
  await page.mouse.down();
  await page.mouse.move(handle.x + 55, handle.y + 15);
  await expect(page.locator('#demo input')).toHaveValue('50');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#demo input')).toHaveValue('40');
  await expect(page.locator('#demo input')).not.toBeFocused();
  expect(
    await page.evaluate(() =>
      window.observedEvents.filter((e) => e.type === 'change'),
    ),
  ).toEqual([]);
  await page.evaluate(() => {
    const demo = window.getDemo();
    const parent = demo.parentElement;
    if (!parent) throw new Error('The demo input must have a parent.');
    demo.remove();
    parent.append(demo);
    window.observedEvents = [];
  });
  await page.locator('#demo input').press('ArrowUp');
  expect(
    await page.evaluate(() => window.observedEvents.map((e) => e.type)),
  ).toEqual(['input', 'change']);
});

test('native form submission, reset and disabled fieldset work', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const form = document.createElement('form');
    form.innerHTML =
      '<fieldset><dsk-input name="amount" value="5" min="0" aria-label="Amount"></dsk-input></fieldset>';
    document.body.append(form);
    const input = form.querySelector('dsk-input');
    if (!input) throw new Error('The form input is missing.');
    input.value = '12';
    const current = new FormData(form).get('amount');
    form.reset();
    const reset = input.value;
    const fieldset = form.querySelector('fieldset');
    if (!fieldset) throw new Error('The disabled fieldset is missing.');
    fieldset.disabled = true;
    const editor = input.shadowRoot?.querySelector('input');
    if (!editor) throw new Error('The form input editor is missing.');
    return {
      current,
      reset,
      omitted: new FormData(form).get('amount'),
      disabled: editor.disabled,
    };
  });
  expect(result).toEqual({
    current: '12',
    reset: '5',
    omitted: null,
    disabled: true,
  });
});

test('layout fits narrow viewports and the custom input is keyboard accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('spinbutton', { name: 'Preview value', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('spinbutton', { name: 'Preview value', exact: true })
    .press('ArrowDown');
  await expect(page.locator('#current-value')).toHaveText('39');
});

async function startVisibleDrag(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Unbounded', exact: true }).click();
  const box = await handleBox(page);
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('demo');
  await expect(page.locator('.dsk-drag-cursor')).toBeVisible();
}

test('visible cursor wraps and value changes only with relative mouse motion', async ({
  page,
}) => {
  await startVisibleDrag(page);
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const origin = await page
    .locator('.dsk-drag-cursor')
    .evaluate((el) => parseFloat(el.style.left));
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: 2600,
        movementY: 0,
        clientX: 100,
        buttons: 1,
      }),
    ),
  );
  await expect(page.locator('#demo input')).toHaveValue('650');
  const wrapped = await page
    .locator('.dsk-drag-cursor')
    .evaluate((el) => parseFloat(el.style.left));
  expect(wrapped).toBeCloseTo((origin + 2600) % 1280);
  const count = await page.evaluate(() => window.observedEvents.length);
  await page.clock.runFor(3000);
  await expect(page.locator('#demo input')).toHaveValue('650');
  expect(await page.evaluate(() => window.observedEvents.length)).toBe(count);
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: -40,
        movementY: 0,
        clientX: 100,
        buttons: 1,
      }),
    ),
  );
  await expect(page.locator('#demo input')).toHaveValue('640');
  await page.mouse.up();
  await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement))
    .toBeNull();
  expect(
    await page.evaluate(
      () => window.observedEvents.filter((e) => e.type === 'change').length,
    ),
  ).toBe(1);
});

for (const action of ['escape', 'blur', 'disabled', 'remove', 'unlock']) {
  test(
    'virtual cursor and lock are cleaned up on ' + action,
    async ({ page }) => {
      await startVisibleDrag(page);
      await page.evaluate(() =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            movementX: 40,
            buttons: 1,
          }),
        ),
      );
      await expect(page.locator('#demo input')).toHaveValue('10');
      if (action === 'escape') await page.keyboard.press('Escape');
      else
        await page.evaluate((action) => {
          const demo = window.getDemo();
          window.detachedDemo = demo;
          if (action === 'blur') window.dispatchEvent(new Event('blur'));
          if (action === 'disabled') demo.disabled = true;
          if (action === 'remove') demo.remove();
          if (action === 'unlock') document.exitPointerLock();
        }, action);
      await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
      await expect
        .poll(() => page.evaluate(() => document.pointerLockElement))
        .toBeNull();
      expect(
        await page.evaluate(() => {
          const demo =
            document.querySelector<DskInput>('#demo') || window.detachedDemo;
          if (!demo) throw new Error('The demo input is missing.');
          return demo.value;
        }),
      ).toBe('0');
      expect(
        await page.evaluate(
          () => window.observedEvents.filter((e) => e.type === 'change').length,
        ),
      ).toBe(0);
      await page.mouse.up();
    },
  );
}

test('denied lock keeps ordinary dragging without automatic edge changes', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.getDemo().requestPointerLock = () =>
      Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.getByRole('button', { name: 'Unbounded', exact: true }).click();
  const box = await handleBox(page);
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(1279, box.y + 15);
  const value = await page.locator('#demo input').inputValue();
  await page.clock.install();
  await page.clock.runFor(3000);
  await expect(page.locator('#demo input')).toHaveValue(value);
  await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
  await page.mouse.up();
});

for (const progression of progressions) {
  for (const locked of [true, false]) {
    test(`reversing at bounds discards overshoot (${progression}, locked=${locked})`, async ({
      page,
    }) => {
      await page.evaluate(
        ({ progression, locked }) => {
          const demo = window.getDemo();
          demo.min = '0';
          demo.max = '10';
          demo.step = '0.25';
          demo.value = '5';
          demo.progression = progression;
          if (!locked) {
            Object.defineProperty(demo, 'requestPointerLock', {
              configurable: true,
              value: undefined,
            });
          }
          demo.addEventListener(
            'pointerdown',
            (event) => {
              window.dragPointerId = event.pointerId;
            },
            { once: true },
          );
        },
        { progression, locked },
      );
      const box = await handleBox(page);
      await page.mouse.move(box.x + 15, box.y + 15);
      await page.mouse.down();
      if (locked)
        await expect
          .poll(() => page.evaluate(() => document.pointerLockElement?.id))
          .toBe('demo');
      let x = box.x + 15;
      async function move(dx: number): Promise<void> {
        x += dx;
        await page.evaluate(
          ({ locked, dx, x }) => {
            if (locked)
              document.dispatchEvent(
                new PointerEvent('pointermove', {
                  pointerType: 'mouse',
                  movementX: dx,
                  buttons: 1,
                }),
              );
            else {
              const handle = window
                .getDemo()
                .shadowRoot?.querySelector('[part="handle"]');
              if (!handle) throw new Error('The drag handle is missing.');
              const pointerId = window.dragPointerId;
              if (pointerId === undefined)
                throw new Error('The drag pointer is missing.');
              handle.dispatchEvent(
                new PointerEvent('pointermove', {
                  pointerId,
                  pointerType: 'mouse',
                  isPrimary: true,
                  buttons: 1,
                  clientX: x,
                }),
              );
            }
          },
          { locked, dx, x },
        );
      }
      const input = page.locator('#demo input');
      await move(-4000);
      await move(-4000);
      await expect(input).toHaveValue('0');
      // Even tiny movements into a bound must not accumulate hidden distance.
      for (let i = 0; i < 5; i++) await move(-1);
      await move(4);
      await expect(input).toHaveValue('0.25');
      await move(4000);
      await move(4000);
      await expect(input).toHaveValue('10');
      for (let i = 0; i < 5; i++) await move(1);
      await move(-4);
      await expect(input).toHaveValue('9.75');
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(input).toHaveValue('5');
      await expect(input).not.toBeFocused();
      expect(
        await page.evaluate(() =>
          window.observedEvents.filter((event) => event.type === 'change'),
        ),
      ).toEqual([]);
    });
  }
}
