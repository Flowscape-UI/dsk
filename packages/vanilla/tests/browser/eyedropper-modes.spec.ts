import { expect, test, type Page } from '@playwright/test';
import type {
  DskColorEyedropper,
  EyeDropperModeAdapter,
  EyeDropperModeContext,
  EyeDropperSession,
} from '@flowscape-ui/dsk';

declare global {
  interface Window {
    modeDropper: DskColorEyedropper;
    modeEvents: string[];
    modeDisposals: number;
    modeContext: EyeDropperModeContext | undefined;
    resolveModeSession: ((session: EyeDropperSession) => void) | undefined;
    modeSampleError: boolean;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.body.replaceChildren();
    document.documentElement.style.cssText =
      'background:white;color-scheme:light';
    document.body.style.cssText = 'margin:0;height:2400px;background:white';
    const swatch = document.createElement('div');
    swatch.id = 'dom-swatch';
    swatch.style.cssText =
      'position:absolute;left:120px;top:120px;width:200px;height:160px;background:#ab34ef;border:8px solid #123456;box-sizing:content-box';
    const source = document.createElement('canvas');
    source.id = 'mode-canvas';
    source.width = 200;
    source.height = 160;
    source.style.cssText =
      'position:absolute;left:400px;top:120px;width:200px;height:160px';
    const context = source.getContext('2d')!;
    context.fillStyle = '#00ff00';
    context.fillRect(0, 0, 200, 160);
    const picker = document.createElement('dsk-color-eyedropper');
    picker.mode = 'canvas';
    picker.id = 'mode-dropper';
    picker.style.cssText = 'position:fixed;left:24px;top:24px';
    document.body.append(swatch, source, picker);
    window.modeDropper = picker;
    window.modeEvents = [];
    window.modeDisposals = 0;
    window.modeContext = undefined;
    window.resolveModeSession = undefined;
    window.modeSampleError = false;
    for (const name of ['pickstart', 'input', 'change', 'cancel', 'pickerror'])
      picker.addEventListener(name, () => window.modeEvents.push(name));
  });
});

function picker(page: Page) {
  return page.locator('#mode-dropper');
}

async function open(page: Page) {
  await picker(page).locator('[part="button"]').click();
  await expect
    .poll(() => page.evaluate(() => window.modeDropper.picking))
    .toBe(true);
}

async function registerAdapter(page: Page) {
  await page.evaluate(() => {
    window.modeDropper.registerMode('editor-engine', {
      label: 'Editor engine',
      createSession: (context) => {
        window.modeContext = context;
        return {
          sample: ({ x, y, size }) => {
            if (x < 100 || y < 100) return null;
            if (window.modeSampleError) throw new Error('Engine read failed');
            const pixels = new ImageData(size, size);
            for (let offset = 0; offset < pixels.data.length; offset += 4)
              pixels.data.set([36, 104, 172, 255], offset);
            return pixels;
          },
          dispose: () => {
            window.modeDisposals++;
          },
        };
      },
    });
    window.modeDropper.mode = 'editor-engine';
  });
}

test('automatically chooses native or page while preserving every explicit mode', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const control = window.modeDropper;
    Object.defineProperty(window, 'EyeDropper', {
      configurable: true,
      writable: true,
      value: class NativePicker {},
    });
    control.removeAttribute('mode');
    const initial = control.mode;
    control.setAttribute('mode', '');
    const emptyNative = control.mode;
    const modes = control.modes;
    control.mode = 'custom';
    const alias = { mode: control.mode, supported: control.supported };
    control.mode = undefined;
    const resetNative = control.mode;
    Object.defineProperty(window, 'EyeDropper', {
      configurable: true,
      value: undefined,
    });
    control.removeAttribute('mode');
    const missingPage = control.mode;
    control.setAttribute('mode', '');
    const emptyPage = control.mode;
    const explicit = [
      'canvas',
      'page',
      'custom',
      'native',
      'missing-engine',
    ].map((mode) => {
      control.mode = mode;
      return { mode: control.mode, supported: control.supported };
    });
    control.mode = null;
    return {
      initial,
      emptyNative,
      modes,
      alias,
      resetNative,
      missingPage,
      emptyPage,
      explicit,
      reset: control.mode,
    };
  });
  expect(result.initial).toBe('native');
  expect(result.emptyNative).toBe('native');
  expect(result.resetNative).toBe('native');
  expect(result.missingPage).toBe('page');
  expect(result.emptyPage).toBe('page');
  expect(result.reset).toBe('page');
  expect(result.explicit).toEqual([
    { mode: 'canvas', supported: true },
    { mode: 'page', supported: true },
    { mode: 'custom', supported: true },
    { mode: 'native', supported: false },
    { mode: 'missing-engine', supported: false },
  ]);
  expect(result.alias).toEqual({ mode: 'custom', supported: true });
  expect(result.modes.map(({ id }) => id)).toEqual(
    expect.arrayContaining(['canvas', 'page', 'native']),
  );
  expect(
    result.modes.every(
      ({ label, supported }) =>
        label.length > 0 && typeof supported === 'boolean',
    ),
  ).toBe(true);
});

test('unknown modes stay unsupported instead of falling back to canvas or native', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.modeDropper.mode = 'missing-engine';
    window.modeDropper.sampler = ({ size }) => new ImageData(size, size);
  });
  expect(await page.evaluate(() => window.modeDropper.mode)).toBe(
    'missing-engine',
  );
  expect(await page.evaluate(() => window.modeDropper.supported)).toBe(false);
  await expect(picker(page).locator('[part="button"]')).toBeDisabled();
  expect(await page.evaluate(() => window.modeDropper.open())).toBeNull();
  expect(await page.evaluate(() => window.modeEvents)).toEqual(['pickerror']);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
});

test('sampler registrations are local to each component and use the shared magnifier', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const control = window.modeDropper;
    control.registerMode('renderer', ({ x, y, size }) => {
      if (x < 100 || y < 100) return null;
      const pixels = new ImageData(size, size);
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set([17, 34, 51, 255], offset);
      return pixels;
    });
    control.mode = 'renderer';
    const other = document.createElement('dsk-color-eyedropper');
    other.mode = 'renderer';
    document.body.append(other);
    return {
      first: control.supported,
      second: other.supported,
      otherModes: other.modes.map(({ id }) => id),
    };
  });
  expect(result.first).toBe(true);
  expect(result.second).toBe(false);
  expect(result.otherModes).not.toContain('renderer');
  await open(page);
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[part="value"]')).toHaveText('#112233');
  await page.mouse.click(200, 160);
  expect(await page.evaluate(() => window.modeDropper.color)).toBe('#112233');
});

test('invalid and reserved IDs cannot replace built-in adapters', async ({
  page,
}) => {
  const rejected = await page.evaluate(() => {
    const names = [
      '',
      'UPPER',
      'two words',
      '1engine',
      'canvas',
      'page',
      'native',
      'custom',
    ];
    return names.map((name) => {
      try {
        window.modeDropper.registerMode(name, () => null);
        return false;
      } catch (error: unknown) {
        return error instanceof TypeError;
      }
    });
  });
  expect(rejected).toEqual(Array<boolean>(8).fill(true));
  expect(await page.evaluate(() => window.modeDropper.mode)).toBe('canvas');
  expect(await page.evaluate(() => window.modeDropper.supported)).toBe(true);
});

test('capability checks can disable a registered mode without creating a session', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.modeDropper.registerMode('unavailable', {
      label: 'Unavailable engine',
      isSupported: () => false,
      createSession: (context) => {
        window.modeContext = context;
        return { sample: () => null };
      },
    });
    window.modeDropper.mode = 'unavailable';
  });
  await expect(picker(page).locator('[part="button"]')).toBeDisabled();
  expect(
    await page.evaluate(() =>
      window.modeDropper.modes.find(({ id }) => id === 'unavailable'),
    ),
  ).toEqual({
    id: 'unavailable',
    label: 'Unavailable engine',
    supported: false,
  });
  expect(await page.evaluate(() => window.modeDropper.open())).toBeNull();
  expect(await page.evaluate(() => window.modeContext === undefined)).toBe(
    true,
  );
});

test('session context supplies the host source and dispose runs once after selection', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.modeDropper.source =
      document.querySelector<HTMLCanvasElement>('#mode-canvas');
  });
  await registerAdapter(page);
  await open(page);
  expect(
    await page.evaluate(() => ({
      host: window.modeContext?.host === window.modeDropper,
      document: window.modeContext?.document === document,
      source:
        window.modeContext?.source === document.querySelector('#mode-canvas'),
      aborted: window.modeContext?.signal.aborted,
    })),
  ).toEqual({ host: true, document: true, source: true, aborted: false });
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[part="value"]')).toHaveText('#2468AC');
  await page.mouse.click(200, 160);
  await expect.poll(() => page.evaluate(() => window.modeDisposals)).toBe(1);
  await page.evaluate(() => {
    window.modeDropper.cancel();
    window.modeDropper.remove();
  });
  expect(await page.evaluate(() => window.modeDisposals)).toBe(1);
  expect(await page.evaluate(() => window.modeEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
});

for (const ending of ['cancel', 'error', 'unregister', 'replace'] as const) {
  test(`active adapter cleanup happens once on ${ending}`, async ({ page }) => {
    await registerAdapter(page);
    await open(page);
    await page.mouse.move(200, 160);
    await expect(picker(page).locator('[part="value"]')).toHaveText('#2468AC');
    await page.evaluate((reason) => {
      const control = window.modeDropper;
      if (reason === 'cancel') control.cancel();
      else if (reason === 'error') window.modeSampleError = true;
      else if (reason === 'unregister') control.unregisterMode('editor-engine');
      else control.registerMode('editor-engine', () => null);
    }, ending);
    await expect.poll(() => page.evaluate(() => window.modeDisposals)).toBe(1);
    await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.modeContext?.signal.aborted)).toBe(
      true,
    );
    expect(await page.evaluate(() => window.modeEvents)).toEqual(
      ending === 'cancel'
        ? ['pickstart', 'cancel']
        : ending === 'error'
          ? ['pickstart', 'pickerror']
          : ['pickstart'],
    );
    await page.evaluate(() => window.modeDropper.cancel());
    expect(await page.evaluate(() => window.modeDisposals)).toBe(1);
    if (ending === 'unregister') {
      expect(await page.evaluate(() => window.modeDropper.supported)).toBe(
        false,
      );
      expect(
        await page.evaluate(() =>
          window.modeDropper.unregisterMode('editor-engine'),
        ),
      ).toBe(false);
    }
  });
}

test('a canceled asynchronous setup disposes its late session without reopening', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.modeDropper.registerMode('delayed', {
      createSession: (context) => {
        window.modeContext = context;
        return new Promise<EyeDropperSession>((resolve) => {
          window.resolveModeSession = resolve;
        });
      },
    });
    window.modeDropper.mode = 'delayed';
  });
  await open(page);
  await expect
    .poll(() => page.evaluate(() => !!window.resolveModeSession))
    .toBe(true);
  await page.evaluate(() => window.modeDropper.cancel());
  expect(await page.evaluate(() => window.modeContext?.signal.aborted)).toBe(
    true,
  );
  await page.evaluate(() =>
    window.resolveModeSession?.({
      sample: () => null,
      dispose: () => {
        window.modeDisposals++;
      },
    }),
  );
  await expect.poll(() => page.evaluate(() => window.modeDisposals)).toBe(1);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.modeEvents)).toEqual([
    'pickstart',
    'cancel',
  ]);
});

test('asynchronous setup rejection reports one error and allows another mode to open', async ({
  page,
}) => {
  const unhandled: string[] = [];
  page.on('pageerror', (error) => unhandled.push(error.message));
  await page.evaluate(() => {
    window.modeDropper.registerMode('broken', {
      createSession: async () => {
        throw new Error('Engine initialization failed');
      },
    });
    window.modeDropper.mode = 'broken';
  });
  await picker(page).locator('[part="button"]').click();
  await expect
    .poll(() => page.evaluate(() => window.modeEvents))
    .toEqual(['pickstart', 'pickerror']);
  expect(await page.evaluate(() => window.modeDropper.picking)).toBe(false);
  await page.evaluate(() => {
    window.modeDropper.mode = 'canvas';
  });
  await open(page);
  await page.mouse.click(450, 160);
  expect(await page.evaluate(() => window.modeDropper.color)).toBe('#00FF00');
  expect(unhandled).toEqual([]);
});

test('page mode samples ordinary DOM colors and releases its frozen surface after selection', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.modeDropper.mode = 'page';
  });
  await open(page);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(1, {
    timeout: 15000,
  });
  await page.mouse.move(123, 160);
  await expect(picker(page).locator('[part="value"]')).toHaveText('#123456', {
    timeout: 15000,
  });
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[part="value"]')).toHaveText('#AB34EF');
  await page.mouse.click(200, 160);
  await expect
    .poll(() => page.evaluate(() => window.modeDropper.color))
    .toBe('#AB34EF');
  await expect(
    picker(page).locator('[part="overlay"], [part="snapshot"]'),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.modeEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
});

for (const change of ['escape', 'scroll', 'resize'] as const) {
  test(`page mode cancels and cleans up on ${change}`, async ({ page }) => {
    await page.evaluate(() => {
      window.modeDropper.mode = 'page';
    });
    await open(page);
    await expect(picker(page).locator('[part="overlay"]')).toHaveCount(1, {
      timeout: 15000,
    });
    await page.mouse.move(200, 160);
    await expect(picker(page).locator('[part="value"]')).toHaveText('#AB34EF', {
      timeout: 15000,
    });
    if (change === 'escape') await page.keyboard.press('Escape');
    else if (change === 'scroll')
      await page.evaluate(() => window.scrollTo(0, 50));
    else await page.setViewportSize({ width: 1200, height: 900 });
    await expect(
      picker(page).locator('[part="overlay"], [part="snapshot"]'),
    ).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.modeDropper.picking))
      .toBe(false);
    expect(await page.evaluate(() => window.modeEvents)).toEqual([
      'pickstart',
      'cancel',
    ]);
    expect(await page.evaluate(() => window.modeDropper.color)).toBe('');
  });
}

test('class adapters retain prototype methods and instance state', async ({
  page,
}) => {
  await page.evaluate(() => {
    class EditorAdapter implements EyeDropperModeAdapter {
      readonly label = 'Class renderer';
      private readonly enabled = true;
      private readonly channels = [128, 51, 85, 255];
      isSupported(): boolean {
        return this.enabled;
      }
      createSession(): EyeDropperSession {
        const channels = this.channels;
        return {
          sample: ({ x, y, size }) => {
            if (x < 100 || y < 100) return null;
            const pixels = new ImageData(size, size);
            for (let offset = 0; offset < pixels.data.length; offset += 4)
              pixels.data.set(channels, offset);
            return pixels;
          },
        };
      }
    }
    window.modeDropper.registerMode('class-renderer', new EditorAdapter());
    window.modeDropper.mode = 'class-renderer';
  });
  expect(await page.evaluate(() => window.modeDropper.supported)).toBe(true);
  await open(page);
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[part="value"]')).toHaveText('#803355');
  await page.mouse.click(200, 160);
  expect(await page.evaluate(() => window.modeDropper.color)).toBe('#803355');
});

test('a factory that cancels synchronously still disposes its returned session once', async ({
  page,
}) => {
  const unhandled: string[] = [];
  page.on('pageerror', (error) => unhandled.push(error.message));
  await page.evaluate(() => {
    window.modeDropper.registerMode('self-canceling', {
      createSession: (context) => {
        window.modeContext = context;
        (context.host as DskColorEyedropper).cancel();
        return {
          sample: () => null,
          dispose: () => {
            window.modeDisposals++;
          },
        };
      },
    });
    window.modeDropper.mode = 'self-canceling';
  });
  expect(await page.evaluate(() => window.modeDropper.open())).toBeNull();
  await expect.poll(() => page.evaluate(() => window.modeDisposals)).toBe(1);
  expect(await page.evaluate(() => window.modeContext?.signal.aborted)).toBe(
    true,
  );
  expect(await page.evaluate(() => window.modeDropper.picking)).toBe(false);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      window.modeEvents.filter((name) => name !== 'pickstart'),
    ),
  ).toEqual(['cancel']);
  await page.evaluate(() => {
    window.modeDropper.cancel();
    window.modeDropper.mode = 'canvas';
  });
  await open(page);
  await page.mouse.click(450, 160);
  expect(await page.evaluate(() => window.modeDropper.color)).toBe('#00FF00');
  expect(await page.evaluate(() => window.modeDisposals)).toBe(1);
  expect(unhandled).toEqual([]);
});

test.describe('scrolled page capture at display density', () => {
  test.use({ deviceScaleFactor: 2 });
  test('samples scrolled and fixed DOM positions and the background without changing live styles', async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.modeDropper.mode = 'page';
      document.documentElement.style.background = '#14171c';
      document.body.style.background = 'transparent';
      document.body.style.font = '19px Georgia, serif';
      const swatch = document.querySelector<HTMLElement>('#dom-swatch')!;
      swatch.style.top = '1320px';
      swatch.style.boxShadow = '0 3px 7px #0008';
      const fixed = document.createElement('div');
      fixed.id = 'page-fixed';
      fixed.style.cssText =
        'position:fixed;left:950px;top:100px;width:100px;height:100px;background:#2468ac;border-radius:12px';
      document.body.append(fixed);
      window.scrollTo(0, 1200);
    });
    const before = await page.evaluate(() => ({
      root: document.documentElement.getAttribute('style'),
      body: document.body.getAttribute('style'),
      font: getComputedStyle(document.body).font,
      nodes: Array.from(
        document.querySelectorAll('#dom-swatch, #page-fixed'),
        (node) => ({
          style: node.getAttribute('style'),
          bounds: node.getBoundingClientRect().toJSON(),
        }),
      ),
      scrollY: window.scrollY,
    }));
    await open(page);
    await expect(picker(page).locator('[part="overlay"]')).toHaveCount(1, {
      timeout: 15000,
    });
    for (const [x, y, color] of [
      [123, 160, '#123456'],
      [200, 160, '#AB34EF'],
      [1000, 150, '#2468AC'],
      [650, 700, '#14171C'],
    ] as const) {
      await page.mouse.move(x, y);
      await expect(picker(page).locator('[part="value"]')).toHaveText(color);
    }
    expect(
      await page.evaluate(() => ({
        root: document.documentElement.getAttribute('style'),
        body: document.body.getAttribute('style'),
        font: getComputedStyle(document.body).font,
        nodes: Array.from(
          document.querySelectorAll('#dom-swatch, #page-fixed'),
          (node) => ({
            style: node.getAttribute('style'),
            bounds: node.getBoundingClientRect().toJSON(),
          }),
        ),
        scrollY: window.scrollY,
      })),
    ).toEqual(before);
    await page.keyboard.press('Escape');
    await expect(
      picker(page).locator('[part="overlay"], [part="snapshot"]'),
    ).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(1200);
  });
});

test('playground registered editor mode samples its composite and can return to canvas', async ({
  page,
}) => {
  await page.goto('/');
  const mode = page.locator('#eyedropper-mode');
  const demo = page.locator('#eyedropper-demo');
  const foreground = page.locator('#eyedropper-foreground');
  await mode.selectOption('editor');
  await expect(foreground).toBeVisible();
  await expect(page.locator('#eyedropper-code')).toContainText(
    'registerMode("editor"',
  );
  const canvas = page.locator('#eyedropper-canvas');
  await demo.locator('[part="button"]').click();
  // Activation may scroll the toolbar; measure sampling coordinates afterward.
  await canvas.scrollIntoViewIfNeeded();
  const expected = await canvas.evaluate((node) => {
    const background = node as HTMLCanvasElement;
    const foreground = document.querySelector<HTMLCanvasElement>(
      '#eyedropper-foreground',
    )!;
    const bounds = background.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2 + 96;
    const y = bounds.top + bounds.height / 2;
    const pixelX = Math.floor(
      ((x - bounds.left) * background.width) / bounds.width,
    );
    const pixelY = Math.floor(
      ((y - bounds.top) * background.height) / bounds.height,
    );
    const base = background
      .getContext('2d')!
      .getImageData(pixelX, pixelY, 1, 1).data;
    const front = foreground
      .getContext('2d')!
      .getImageData(pixelX, pixelY, 1, 1).data;
    const alpha = front[3]! / 255;
    const composite = [0, 1, 2].map((channel) =>
      Math.round(front[channel]! * alpha + base[channel]! * (1 - alpha)),
    );
    const baseHex =
      '#' +
      Array.from(base.subarray(0, 3), (channel) =>
        channel.toString(16).padStart(2, '0'),
      )
        .join('')
        .toUpperCase();
    return { x, y, alpha, composite, baseHex };
  });
  expect(expected.alpha).toBeGreaterThan(0);
  expect(expected.alpha).toBeLessThan(1);
  await page.mouse.move(expected.x, expected.y);
  await expect(demo.locator('[part="value"]')).toHaveText(/^#[\dA-F]{6}$/);
  const preview = (await demo.locator('[part="value"]').textContent())!;
  expect(preview).not.toBe(expected.baseHex);
  const channels = [1, 3, 5].map((start) =>
    Number.parseInt(preview.slice(start, start + 2), 16),
  );
  channels.forEach((channel, index) =>
    expect(Math.abs(channel - expected.composite[index]!)).toBeLessThanOrEqual(
      1,
    ),
  );
  await page.mouse.click(expected.x, expected.y);
  await expect(page.locator('#eyedropper-color')).toHaveText(preview);
  await mode.selectOption('canvas');
  await expect(foreground).toBeHidden();
  await canvas.scrollIntoViewIfNeeded();
  await demo.locator('[part="button"]').click();
  await canvas.scrollIntoViewIfNeeded();
  const current = await canvas.boundingBox();
  expect(current).not.toBeNull();
  const x = current!.x + current!.width / 2 + 96;
  const y = current!.y + current!.height / 2;
  await page.mouse.move(x, y);
  await expect(demo.locator('[part="value"]')).toHaveText(expected.baseHex);
  await page.mouse.click(x, y);
  await expect(page.locator('#eyedropper-color')).toHaveText(expected.baseHex);
  await expect(page.locator('#eyedropper-count')).toHaveText('2');
});
