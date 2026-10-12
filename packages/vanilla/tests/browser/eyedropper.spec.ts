import { expect, test, type Page } from '@playwright/test';
import type {
  DskColorEyedropper,
  EyeDropperErrorDetail,
} from '@flowscape-ui/dsk';

interface MockSelection {
  signal?: AbortSignal;
  resolve: (result: { sRGBHex: string }) => void;
  reject: (error: Error) => void;
}

interface EyeDropperHarness {
  calls: MockSelection[];
  globalErrors: number;
  honorAbort: boolean;
  constructorError: string | null;
  openError: string | null;
}

interface EyeDropperEvent {
  type: string;
  color: string;
  bubbles: boolean;
  composed: boolean;
  hostTarget: boolean;
  errorName: string | null;
  errorMessage: string | null;
}

declare global {
  interface Window {
    testEyedropper: DskColorEyedropper;
    eyedropperHarness: EyeDropperHarness;
    eyedropperEvents: EyeDropperEvent[];
    eyedropperResult: Promise<string | null>;
    eyedropperCommits: string[];
  }
}

test.beforeEach(async ({ page }) => {
  // The operating system picker is outside the page. Exercise its asynchronous
  // boundary with a controllable replacement and real browser AbortSignals.
  await page.addInitScript(() => {
    const harness: EyeDropperHarness = {
      calls: [],
      globalErrors: 0,
      honorAbort: true,
      constructorError: null,
      openError: null,
    };
    window.eyedropperHarness = harness;
    window.addEventListener('error', () => {
      harness.globalErrors += 1;
    });
    class MockEyeDropper {
      constructor() {
        if (harness.constructorError) throw new Error(harness.constructorError);
      }

      open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }> {
        if (harness.openError) throw new Error(harness.openError);
        return new Promise((resolve, reject) => {
          const signal = options?.signal;
          harness.calls.push({ signal, resolve, reject });
          signal?.addEventListener(
            'abort',
            () => {
              if (harness.honorAbort)
                reject(new DOMException('Selection cancelled.', 'AbortError'));
            },
            { once: true },
          );
        });
      }
    }
    Object.defineProperty(window, 'EyeDropper', {
      configurable: true,
      writable: true,
      value: MockEyeDropper,
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-color-eyedropper');
    const picker = document.createElement('dsk-color-eyedropper');
    picker.mode = 'native';
    const demo = document.querySelector('dsk-color-eyedropper');
    if (demo) demo.mode = 'native';
    picker.id = 'eyedropper-under-test';
    picker.style.cssText =
      'position: fixed; left: 24px; top: 24px; z-index: 1000';
    window.testEyedropper = picker;
    window.eyedropperEvents = [];
    window.eyedropperCommits = [];
    picker.setAttribute(
      'onchange',
      'window.eyedropperCommits.push(this.color)',
    );
    for (const type of [
      'pickstart',
      'input',
      'change',
      'cancel',
      'pickerror',
    ]) {
      picker.addEventListener(type, (event) => {
        const error =
          event instanceof CustomEvent && type === 'pickerror'
            ? (event as CustomEvent<EyeDropperErrorDetail>).detail.error
            : null;
        if (error !== null && !(error instanceof Error))
          throw new Error('The error detail must contain an Error instance.');
        window.eyedropperEvents.push({
          type,
          color: picker.color,
          bubbles: event.bubbles,
          composed: event.composed,
          hostTarget: event.target === picker,
          errorName: error?.name ?? null,
          errorMessage: error?.message ?? null,
        });
      });
    }
    document.body.append(picker);
  });
});

function button(page: Page) {
  return page.locator('#eyedropper-under-test').locator('[part="button"]');
}

async function startOpen(page: Page) {
  await page.evaluate(() => {
    window.eyedropperResult = window.testEyedropper.open();
  });
}

async function resolveSelection(page: Page, color = '#a1b2c3', index = 0) {
  await page.evaluate(
    ({ color, index }) => {
      const selection = window.eyedropperHarness.calls[index];
      if (!selection) throw new Error('Missing native selection.');
      selection.resolve({ sRGBHex: color });
    },
    { color, index },
  );
}

async function eventTypes(page: Page) {
  return page.evaluate(() =>
    window.eyedropperEvents.map((event) => event.type),
  );
}

test('normalizes colors and exposes silent reflected properties', async ({
  page,
}) => {
  const values = await page.evaluate(() => {
    const picker = window.testEyedropper;
    const defaults = {
      color: picker.color,
      value: picker.value,
      size: picker.size,
      disabled: picker.disabled,
      picking: picker.picking,
      supported: picker.supported,
    };
    const colors: string[] = [];
    for (const value of ['#0af', 'aBc123', '#aabbcc', 'ff00ff']) {
      picker.color = value;
      colors.push(picker.color);
    }
    picker.value = '#abc';
    const alias = { color: picker.color, value: picker.value };
    picker.setAttribute('value', '#112233');
    const ignoredValueAttribute = picker.color;
    for (const value of ['red', '#1234', '#12345678', '#gggggg', '']) {
      picker.color = value;
      colors.push(picker.color);
    }
    picker.color = null;
    const removedColor = !picker.hasAttribute('color');
    picker.size = '48';
    const customSize = picker.size;
    picker.size = -10;
    const invalidSize = picker.size;
    picker.size = undefined;
    return {
      defaults,
      colors,
      alias,
      ignoredValueAttribute,
      removedColor,
      customSize,
      invalidSize,
      removedSize: !picker.hasAttribute('size'),
    };
  });
  expect(values).toEqual({
    defaults: {
      color: '',
      value: '',
      size: 32,
      disabled: false,
      picking: false,
      supported: true,
    },
    colors: ['#00AAFF', '#ABC123', '#AABBCC', '#FF00FF', '', '', '', '', ''],
    alias: { color: '#AABBCC', value: '#AABBCC' },
    ignoredValueAttribute: '#AABBCC',
    removedColor: true,
    customSize: 48,
    invalidSize: 32,
    removedSize: true,
  });
  expect(await eventTypes(page)).toEqual([]);
});

test('mouse selection emits host events and inline onchange receives the color', async ({
  page,
}) => {
  await button(page).click();
  await expect(button(page)).toBeDisabled();
  expect(await page.evaluate(() => window.testEyedropper.picking)).toBe(true);
  await resolveSelection(page);
  await expect(button(page)).toBeEnabled();
  const events = await page.evaluate(() => window.eyedropperEvents);
  expect(events.map((event) => event.type)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
  expect(events.slice(1).map((event) => event.color)).toEqual([
    '#A1B2C3',
    '#A1B2C3',
  ]);
  expect(
    events.every(
      (event) => event.bubbles && event.composed && event.hostTarget,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([
    '#A1B2C3',
  ]);
  expect(await page.evaluate(() => window.testEyedropper.picking)).toBe(false);

  await button(page).click();
  await resolveSelection(page, '#a1b2c3', 1);
  expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([
    '#A1B2C3',
    '#A1B2C3',
  ]);
});

test('native button supports Enter, Space, focus and blur', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.testEyedropper.focus({ preventScroll: true }),
  );
  await expect(button(page)).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.eyedropperHarness.calls.length)).toBe(
    1,
  );
  await resolveSelection(page);
  await page.evaluate(() => window.testEyedropper.focus());
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.eyedropperHarness.calls.length)).toBe(
    2,
  );
  await resolveSelection(page, '#ffffff', 1);
  await page.evaluate(() => {
    window.testEyedropper.focus();
    window.testEyedropper.blur();
  });
  await expect(button(page)).not.toBeFocused();
  expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([
    '#A1B2C3',
    '#FFFFFF',
  ]);
});

test('open returns the color and guards an already active selection', async ({
  page,
}) => {
  await startOpen(page);
  expect(await page.evaluate(() => window.testEyedropper.open())).toBeNull();
  expect(await page.evaluate(() => window.eyedropperHarness.calls.length)).toBe(
    1,
  );
  expect(await eventTypes(page)).toEqual(['pickstart']);
  await resolveSelection(page, '#098abc');
  expect(await page.evaluate(() => window.eyedropperResult)).toBe('#098ABC');
});

test('disabled and disconnected controls never start native selection', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const picker = window.testEyedropper;
    picker.disabled = true;
    const disabledResult = await picker.open();
    picker.disabled = false;
    picker.remove();
    const disconnectedResult = await picker.open();
    document.body.append(picker);
    return { disabledResult, disconnectedResult };
  });
  expect(result).toEqual({ disabledResult: null, disconnectedResult: null });
  expect(await page.evaluate(() => window.eyedropperHarness.calls.length)).toBe(
    0,
  );
  expect(await eventTypes(page)).toEqual([]);
  await expect(button(page)).toBeEnabled();
});

test('cancel aborts native work once and preserves the previous color', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testEyedropper.color = '#123';
  });
  await startOpen(page);
  const result = await page.evaluate(async () => {
    const signal = window.eyedropperHarness.calls[0]?.signal;
    window.testEyedropper.cancel();
    window.testEyedropper.cancel();
    return {
      hasSignal: signal instanceof AbortSignal,
      aborted: signal?.aborted,
      result: await window.eyedropperResult,
      color: window.testEyedropper.color,
      picking: window.testEyedropper.picking,
    };
  });
  expect(result).toEqual({
    hasSignal: true,
    aborted: true,
    result: null,
    color: '#112233',
    picking: false,
  });
  expect(await eventTypes(page)).toEqual(['pickstart', 'cancel']);
  await expect(button(page)).toBeEnabled();
});

test('native Escape cancellation emits cancel without a color change', async ({
  page,
}) => {
  await startOpen(page);
  await page.evaluate(() => {
    window.eyedropperHarness.calls[0]?.reject(
      new DOMException('The user pressed Escape.', 'AbortError'),
    );
  });
  expect(await page.evaluate(() => window.eyedropperResult)).toBeNull();
  expect(await eventTypes(page)).toEqual(['pickstart', 'cancel']);
  expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([]);
  await expect(button(page)).toBeEnabled();
});

test('native rejection dispatches an Error detail and permits retry', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await startOpen(page);
  await page.evaluate(() => {
    window.eyedropperHarness.calls[0]?.reject(
      new DOMException('Another picker is open.', 'InvalidStateError'),
    );
  });
  expect(await page.evaluate(() => window.eyedropperResult)).toBeNull();
  expect(await eventTypes(page)).toEqual(['pickstart', 'pickerror']);
  expect(await page.evaluate(() => window.eyedropperHarness.globalErrors)).toBe(
    0,
  );
  expect(
    await page.evaluate(() => window.eyedropperEvents.at(-1)),
  ).toMatchObject({
    errorName: 'InvalidStateError',
    errorMessage: 'Another picker is open.',
  });
  await button(page).click();
  await resolveSelection(page, '#fedcba', 1);
  expect(await page.evaluate(() => window.testEyedropper.color)).toBe(
    '#FEDCBA',
  );
  expect(pageErrors).toEqual([]);
});

for (const failure of ['constructorError', 'openError'] as const) {
  test(`synchronous ${failure} is reported without an unhandled rejection`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.evaluate((failure) => {
      window.eyedropperHarness[failure] = 'Native picker failed.';
    }, failure);
    expect(await page.evaluate(() => window.testEyedropper.open())).toBeNull();
    expect(
      await page.evaluate(() => window.eyedropperEvents.at(-1)),
    ).toMatchObject({
      type: 'pickerror',
      errorMessage: 'Native picker failed.',
    });
    expect(await page.evaluate(() => window.testEyedropper.picking)).toBe(
      false,
    );
    await expect(button(page)).toBeEnabled();
    expect(pageErrors).toEqual([]);
  });
}

for (const interruption of ['disabled', 'disconnect', 'color'] as const) {
  test(`${interruption} silently aborts and ignores a late native result`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.testEyedropper.color = '#123';
      window.eyedropperHarness.honorAbort = false;
    });
    await startOpen(page);
    const interrupted = await page.evaluate((interruption) => {
      const picker = window.testEyedropper;
      if (interruption === 'disabled') picker.disabled = true;
      if (interruption === 'disconnect') picker.remove();
      if (interruption === 'color') picker.value = '#fed';
      return {
        aborted: window.eyedropperHarness.calls[0]?.signal?.aborted,
        picking: picker.picking,
      };
    }, interruption);
    expect(interrupted).toEqual({ aborted: true, picking: false });
    expect(await page.evaluate(() => window.eyedropperResult)).toBeNull();
    await resolveSelection(page, '#000000');
    expect(await page.evaluate(() => window.eyedropperResult)).toBeNull();
    expect(await page.evaluate(() => window.testEyedropper.color)).toBe(
      interruption === 'color' ? '#FFEEDD' : '#112233',
    );
    expect(await eventTypes(page)).toEqual(['pickstart']);
    await page.evaluate(() => {
      const picker = window.testEyedropper;
      picker.disabled = false;
      document.body.append(picker);
    });
    await button(page).click();
    await resolveSelection(page, '#abcdef', 1);
    expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([
      '#ABCDEF',
    ]);
  });
}

test('an input listener replacement prevents a stale change event', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testEyedropper.addEventListener(
      'input',
      () => {
        window.testEyedropper.color = '#0f0';
      },
      { once: true },
    );
  });
  await startOpen(page);
  await resolveSelection(page);
  expect(await page.evaluate(() => window.eyedropperResult)).toBe('#A1B2C3');
  expect(await page.evaluate(() => window.testEyedropper.color)).toBe(
    '#00FF00',
  );
  expect(await eventTypes(page)).toEqual(['pickstart', 'input']);
  expect(await page.evaluate(() => window.eyedropperCommits)).toEqual([]);
});

test('reconnection does not duplicate activation listeners', async ({
  page,
}) => {
  await page.evaluate(() => {
    const picker = window.testEyedropper;
    for (let index = 0; index < 3; index++) {
      picker.remove();
      document.body.append(picker);
    }
  });
  await button(page).click();
  expect(await page.evaluate(() => window.eyedropperHarness.calls.length)).toBe(
    1,
  );
  await resolveSelection(page);
  expect(await eventTypes(page)).toEqual(['pickstart', 'input', 'change']);
});

test('a pickstart listener can cancel the native session before it settles', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.eyedropperHarness.honorAbort = false;
    window.testEyedropper.addEventListener(
      'pickstart',
      () => window.testEyedropper.cancel(),
      { once: true },
    );
  });
  expect(await page.evaluate(() => window.testEyedropper.open())).toBeNull();
  expect(
    await page.evaluate(
      () => window.eyedropperHarness.calls[0]?.signal?.aborted,
    ),
  ).toBe(true);
  await resolveSelection(page);
  expect(await eventTypes(page)).toEqual(['pickstart', 'cancel']);
  expect(await page.evaluate(() => window.testEyedropper.color)).toBe('');
  await expect(button(page)).toBeEnabled();
});

for (const unavailable of [
  'missing-constructor',
  'insecure-context',
] as const) {
  test(`${unavailable} disables the button and reports direct open errors`, async ({
    page,
  }) => {
    await page.evaluate((unavailable) => {
      const picker = window.testEyedropper;
      picker.remove();
      if (unavailable === 'missing-constructor') {
        Object.defineProperty(window, 'EyeDropper', {
          configurable: true,
          value: undefined,
        });
      } else {
        Object.defineProperty(window, 'isSecureContext', {
          configurable: true,
          value: false,
        });
      }
      document.body.append(picker);
    }, unavailable);
    expect(await page.evaluate(() => window.testEyedropper.supported)).toBe(
      false,
    );
    await expect(button(page)).toBeDisabled();
    expect(await page.evaluate(() => window.testEyedropper.open())).toBeNull();
    expect(await eventTypes(page)).toEqual(['pickerror']);
    expect(
      await page.evaluate(() => window.eyedropperHarness.calls.length),
    ).toBe(0);
    expect(
      await page.evaluate(() => window.eyedropperEvents[0]?.errorName),
    ).toBe('NotSupportedError');
  });
}

test('global attributes, custom label and dimensions remain usable', async ({
  page,
}) => {
  const control = page.locator('#eyedropper-under-test');
  await expect(button(page)).toHaveAccessibleName('Pick color from screen');
  const before = await button(page).boundingBox();
  expect(before?.width).toBe(32);
  expect(before?.height).toBe(32);
  await page.evaluate(() => {
    const picker = window.testEyedropper;
    picker.title = 'Sample an accent';
    picker.className = 'custom-eyedropper';
    picker.setAttribute('aria-label', 'Sample canvas color');
    picker.setAttribute('data-source', 'canvas');
    picker.size = 48;
  });
  await expect(control).toHaveAttribute('title', 'Sample an accent');
  await expect(control).toHaveClass('custom-eyedropper');
  await expect(control).toHaveAttribute('data-source', 'canvas');
  await expect(button(page)).toHaveAccessibleName('Sample canvas color');
  const sized = await button(page).boundingBox();
  expect(sized?.width).toBe(48);
  expect(sized?.height).toBe(48);
  await startOpen(page);
  const pending = await button(page).boundingBox();
  expect(pending?.width).toBe(48);
  expect(pending?.height).toBe(48);
  await resolveSelection(page);
  await page.evaluate(() => {
    window.testEyedropper.hidden = true;
  });
  await expect(control).toBeHidden();
  await page.evaluate(() => {
    window.testEyedropper.hidden = false;
    window.testEyedropper.style.setProperty(
      '--dsk-color-eyedropper-size',
      '40px',
    );
  });
  await expect(control).toBeVisible();
  const styled = await button(page).boundingBox();
  expect(styled?.width).toBe(40);
  expect(styled?.height).toBe(40);
});

test('playground settings, native selection, event log and reset stay synchronized', async ({
  page,
}, testInfo) => {
  const demo = page.locator('#eyedropper-demo');
  const settings = page.locator('#eyedropper-settings');
  await settings.getByLabel('Eyedropper color', { exact: true }).fill('#1af');
  await settings.getByLabel('Eyedropper size (px)', { exact: true }).fill('44');
  await expect(page.locator('#eyedropper-color')).toHaveText('#11AAFF');
  await expect(page.locator('#eyedropper-count')).toHaveText('0');
  await expect(page.locator('#eyedropper-code')).toContainText('size="44"');
  await demo.locator('[part="button"]').click();
  await expect(page.locator('#eyedropper-availability')).toContainText(
    'Select a screen pixel',
  );
  await resolveSelection(page, '#80abcd');
  await expect(page.locator('#eyedropper-color')).toHaveText('#80ABCD');
  await expect(page.locator('#eyedropper-count')).toHaveText('1');
  await expect(
    settings.getByLabel('Eyedropper color', { exact: true }),
  ).toHaveValue('#80ABCD');
  await expect(page.locator('#eyedropper-code')).toContainText(
    'color="#80ABCD"',
  );
  await expect(page.locator('#eyedropper-events .event-type')).toHaveText([
    'change',
    'input',
    'pickstart',
  ]);
  await settings.getByLabel('Eyedropper disabled', { exact: true }).check();
  await expect(demo.locator('[part="button"]')).toBeDisabled();
  await page.locator('#eyedropper-reset').click();
  await expect(settings.getByLabel('Picker mode')).toHaveValue('native');
  await expect(demo.locator('[part="button"]')).toBeEnabled();
  await expect(page.locator('#eyedropper-color')).toHaveText('Empty');
  await expect(page.locator('#eyedropper-count')).toHaveText('0');
  await expect(
    settings.getByLabel('Eyedropper color', { exact: true }),
  ).toHaveValue('');
  await expect(page.locator('#eyedropper-events .empty-log')).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
    }, theme);
    const screenshot = testInfo.outputPath(`eyedropper-${theme}.png`);
    await page.locator('.eyedropper-lab').screenshot({ path: screenshot });
    await testInfo.attach(`eyedropper-${theme}`, {
      path: screenshot,
      contentType: 'image/png',
    });
  }
});
