import { expect, test, type Page } from '@playwright/test';
import type {
  DskColorEyedropper,
  EyeDropperPreviewDetail,
  EyeDropperSampleRequest,
} from '@flowscape-ui/dsk';

declare global {
  interface Window {
    customDropper: DskColorEyedropper;
    customCanvas: HTMLCanvasElement;
    customEvents: string[];
    customPreviews: string[];
    customPreview:
      { color: string; x: number; y: number; width: number } | undefined;
    canvasEvents: string[];
    sampleRequests: EyeDropperSampleRequest[];
    resolveSample: (() => void) | undefined;
    deferSample: boolean;
    invalidSample: boolean;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.body.replaceChildren();
    document.documentElement.style.cssText =
      'background:#f6f7f9;color-scheme:light';
    document.body.style.cssText =
      'margin:0;height:2400px;background:#f6f7f9;font:17px Georgia,serif';
    const surface = document.createElement('div');
    surface.innerHTML = `
      <canvas id="editor-canvas" width="640" height="320" style="position:absolute;left:120px;top:120px;width:400px;height:200px;border:8px solid #0000ff;box-sizing:content-box"></canvas>
      <div id="unchanged" style="position:absolute;left:650px;top:100px;width:360px;height:130px;border:1px solid #333;border-radius:12px;background:#fff;padding:16px">
        <strong style="font-size:23px">Original page typography</strong><p>Keep the live page exactly as rendered.</p>
      </div>
      <input id="outside-input" aria-label="Editor name" style="position:absolute;left:650px;top:300px;width:200px">
      <button id="outside-button" style="position:absolute;left:900px;top:300px">Editor action</button>`;
    document.body.append(surface);
    const canvas = document.querySelector('#editor-canvas');
    if (!(canvas instanceof HTMLCanvasElement))
      throw new Error('Missing canvas');
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 320, 320);
    context.fillStyle = '#00ff00';
    context.fillRect(320, 0, 320, 320);
    const picker = document.createElement('dsk-color-eyedropper');
    picker.mode = 'canvas';
    picker.style.cssText = 'position:fixed;left:24px;top:24px';
    document.body.append(picker);
    window.customDropper = picker;
    window.customCanvas = canvas;
    window.customEvents = [];
    window.customPreviews = [];
    window.customPreview = undefined;
    window.canvasEvents = [];
    window.sampleRequests = [];
    window.resolveSample = undefined;
    window.deferSample = false;
    window.invalidSample = false;
    for (const type of ['pickstart', 'input', 'change', 'cancel', 'pickerror'])
      picker.addEventListener(type, () => window.customEvents.push(type));
    picker.addEventListener('colorpreview', (event) => {
      const { color, x, y, pixels } = (
        event as CustomEvent<EyeDropperPreviewDetail>
      ).detail;
      window.customPreview = { color, x, y, width: pixels.width };
      window.customPreviews.push(color);
    });
    for (const type of ['pointerdown', 'pointerup', 'click', 'wheel']) {
      canvas.addEventListener(
        type,
        (event) => {
          window.canvasEvents.push(type);
          if (type === 'wheel' || (event as PointerEvent).button === 1)
            event.preventDefault();
        },
        { passive: false },
      );
    }
  });
});

function picker(page: Page) {
  return page.locator('dsk-color-eyedropper');
}
async function open(page: Page) {
  await picker(page).locator('[part="button"]').click();
  await expect
    .poll(() => page.evaluate(() => window.customDropper.picking))
    .toBe(true);
}
async function preview(page: Page, color: string) {
  await expect
    .poll(() => page.evaluate(() => window.customPreview?.color))
    .toBe(color);
  await expect(picker(page).locator('[part="magnifier"]')).toBeVisible();
}

test('reads live canvas pixels without native support or changing page typography and layout', async ({
  page,
}, testInfo) => {
  await page.evaluate(() =>
    Object.defineProperty(window, 'EyeDropper', {
      configurable: true,
      value: undefined,
    }),
  );
  const label = page.locator('#unchanged');
  const before = await label.screenshot();
  const original = await label.evaluate((node) => ({
    font: getComputedStyle(node).font,
    rect: node.getBoundingClientRect().toJSON(),
    background: getComputedStyle(document.body).backgroundColor,
    width: document.documentElement.clientWidth,
  }));
  expect(
    await page.evaluate(() => [
      window.customDropper.mode,
      window.customDropper.supported,
      window.customDropper.nativeSupported,
    ]),
  ).toEqual(['canvas', true, false]);
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await expect(picker(page).locator('[part="lens"]')).toHaveCSS(
    'border-radius',
    '50%',
  );
  await expect(page.locator('dialog, [inert], [part="snapshot"]')).toHaveCount(
    0,
  );
  expect(await label.screenshot()).toEqual(before);
  expect(
    await label.evaluate((node) => ({
      font: getComputedStyle(node).font,
      rect: node.getBoundingClientRect().toJSON(),
      background: getComputedStyle(document.body).backgroundColor,
      width: document.documentElement.clientWidth,
    })),
  ).toEqual(original);
  await page.screenshot({ path: testInfo.outputPath('live-magnifier.png') });
  expect(await page.evaluate(() => window.customDropper.color)).toBe('');
  await page.mouse.click(400, 160);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#00FF00');
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
  expect(await page.evaluate(() => window.canvasEvents)).toEqual([]);
});

test.describe('high-density and scaled canvas rendering', () => {
  test.use({ deviceScaleFactor: 2 });
  test('maps backing pixels through canvas borders, padding and CSS scaling', async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.customDropper.source = window.customCanvas;
      const canvas = window.customCanvas;
      canvas.style.padding = '10px';
      canvas.style.transform = 'scale(1.25)';
      canvas.style.transformOrigin = 'top left';
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#654321';
      context.fillRect(0, 0, 640, 320);
      context.fillStyle = '#123456';
      context.fillRect(320, 0, 320, 320);
    });
    await open(page);
    await page.mouse.move(300, 180);
    await preview(page, '#654321');
    await page.mouse.move(500, 180);
    await preview(page, '#123456');
    await page.mouse.move(125, 180);
    await expect(picker(page).locator('[part="magnifier"]')).not.toBeVisible();
    await page.mouse.click(125, 180);
    expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
    expect(await page.evaluate(() => window.customDropper.color)).toBe('');
    await page.mouse.click(500, 180);
    expect(await page.evaluate(() => window.customDropper.color)).toBe(
      '#123456',
    );
  });
});

test('refreshes stationary pixels and survives scroll, resize and canvas zoom', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.customDropper.setAttribute('source', '#editor-canvas'),
  );
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await page.evaluate(() => {
    const context = window.customCanvas.getContext('2d')!;
    context.fillStyle = '#2468ac';
    context.fillRect(0, 0, 640, 320);
  });
  await preview(page, '#2468AC');
  await page.evaluate(() => window.scrollTo(0, 80));
  await preview(page, '#2468AC');
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.evaluate(() => {
    window.customCanvas.style.width = '800px';
    window.customCanvas.style.height = '400px';
    const context = window.customCanvas.getContext('2d')!;
    context.fillStyle = '#ef1234';
    context.fillRect(320, 0, 320, 320);
  });
  await page.mouse.move(700, 200);
  await preview(page, '#EF1234');
  expect(await page.evaluate(() => window.customEvents)).toEqual(['pickstart']);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#EF1234');
  expect(await page.evaluate(() => window.scrollY)).toBe(80);
});

test('wheel, Space drag, middle drag and unrelated controls stay usable', async ({
  page,
}) => {
  await page.evaluate(() => {
    // An editor consumes its pan shortcut so Space does not scroll the page.
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement))
        event.preventDefault();
    });
  });
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => page.evaluate(() => window.canvasEvents.includes('wheel')))
    .toBe(true);
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(220, 170);
  await page.mouse.up();
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
  expect(await page.evaluate(() => window.canvasEvents)).toContain(
    'pointerdown',
  );
  expect(await page.evaluate(() => window.canvasEvents)).toContain('pointerup');
  await page.evaluate(() => {
    window.canvasEvents = [];
  });
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(240, 180);
  await page.mouse.up({ button: 'middle' });
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
  expect(await page.evaluate(() => window.canvasEvents)).toContain(
    'pointerdown',
  );
  expect(await page.evaluate(() => window.canvasEvents)).toContain('pointerup');
  const input = page.locator('#outside-input');
  await input.fill('Live editor');
  await input.press('Home');
  await input.press('ArrowRight');
  await input.press('Space');
  await expect(input).toHaveValue('L ive editor');
  await input.press('Enter');
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
  await page.locator('#outside-button').click();
  await expect(page.locator('#outside-button')).toBeFocused();
  expect(await page.evaluate(() => window.customDropper.color)).toBe('');
  await page.keyboard.press('Escape');
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'cancel',
  ]);
});

test('auto detection honors the topmost canvas and never samples through UI controls', async ({
  page,
}) => {
  await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 100;
    canvas.style.cssText =
      'position:absolute;left:350px;top:150px;width:160px;height:100px';
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ab34ef';
    context.fillRect(0, 0, 160, 100);
    const button = document.createElement('button');
    button.id = 'canvas-tool';
    button.textContent = 'Canvas tool';
    button.style.cssText =
      'position:absolute;left:140px;top:170px;width:130px;height:50px';
    document.body.append(canvas, button);
  });
  await open(page);
  await page.mouse.move(400, 180);
  await preview(page, '#AB34EF');
  await page.mouse.move(200, 190);
  await expect(picker(page).locator('[part="magnifier"]')).not.toBeVisible();
  await page.locator('#canvas-tool').click();
  await expect(page.locator('#canvas-tool')).toBeFocused();
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('');
  await page.mouse.click(400, 180);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#AB34EF');
});

test('selects a fresh sample instead of committing the previous preview', async ({
  page,
}) => {
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await page.evaluate(() => {
    const canvas = window.customCanvas;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#334455';
    context.fillRect(0, 0, 640, 320);
    const position = { bubbles: true, clientX: 200, clientY: 160, button: 0 };
    canvas.dispatchEvent(new PointerEvent('pointerdown', position));
    canvas.dispatchEvent(new PointerEvent('pointerup', position));
    canvas.dispatchEvent(new MouseEvent('click', position));
  });
  await expect
    .poll(() => page.evaluate(() => window.customDropper.color))
    .toBe('#334455');
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
});

test('sampler takes precedence over the source and null excludes an area', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.source = window.customCanvas;
    window.customDropper.sampler = (request) => {
      window.sampleRequests.push(request);
      if (request.x < 350 || request.x > 500 || request.y > 300) return null;
      const pixels = new ImageData(request.size, request.size);
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set([17, 34, 51, 255], offset);
      return pixels;
    };
  });
  await open(page);
  await page.mouse.move(400, 160);
  await preview(page, '#112233');
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[part="magnifier"]')).not.toBeVisible();
  await page.mouse.click(200, 160);
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(true);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('');
  await page.mouse.click(400, 160);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#112233');
});

test('legacy ImageData without colorSpace previews and selects as sRGB', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.sampler = ({ x, y, size }) => {
      if (x < 120 || y < 120 || y > 320) return null;
      const pixels = new ImageData(size, size);
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set([36, 104, 172, 255], offset);
      Object.defineProperty(pixels, 'colorSpace', { value: undefined });
      return pixels;
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#2468AC');
  await page.mouse.click(200, 160);
  await expect
    .poll(() => page.evaluate(() => window.customDropper.color))
    .toBe('#2468AC');
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
});

test('late asynchronous previews cannot overwrite a newer pointer position', async ({
  page,
}) => {
  await page.evaluate(() => {
    let first = true;
    window.customDropper.sampler = (request) => {
      if (request.x < 120 || request.y < 120 || request.y > 320) return null;
      window.sampleRequests.push(request);
      const pixels = new ImageData(request.size, request.size);
      const color = request.x < 350 ? [255, 0, 0, 255] : [0, 255, 0, 255];
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set(color, offset);
      if (first) {
        first = false;
        return new Promise<ImageData>((resolve) => {
          window.resolveSample = () => resolve(pixels);
        });
      }
      return pixels;
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await expect
    .poll(() => page.evaluate(() => !!window.resolveSample))
    .toBe(true);
  await page.mouse.move(400, 160);
  await page.evaluate(() => window.resolveSample?.());
  await preview(page, '#00FF00');
  expect(await page.evaluate(() => window.customPreviews)).not.toContain(
    '#FF0000',
  );
  await page.mouse.click(400, 160);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#00FF00');
});

test('a pending commit keeps the clicked pixel when the pointer moves', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.sampler = (request) => {
      if (request.x < 120 || request.y < 120 || request.y > 320) return null;
      const pixels = new ImageData(request.size, request.size);
      const color = request.x < 350 ? [255, 0, 0, 255] : [0, 255, 0, 255];
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set(color, offset);
      if (window.deferSample) {
        window.deferSample = false;
        return new Promise<ImageData>((resolve) => {
          window.resolveSample = () => resolve(pixels);
        });
      }
      return pixels;
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await page.evaluate(() => {
    const position = { bubbles: true, clientX: 200, clientY: 160, button: 0 };
    window.customCanvas.dispatchEvent(
      new PointerEvent('pointerdown', position),
    );
    window.customCanvas.dispatchEvent(new PointerEvent('pointerup', position));
    window.deferSample = true;
    window.customCanvas.dispatchEvent(new MouseEvent('click', position));
  });
  await expect
    .poll(() => page.evaluate(() => !!window.resolveSample))
    .toBe(true);
  await page.mouse.move(450, 180);
  await page.evaluate(() => window.resolveSample?.());
  await expect
    .poll(() => page.evaluate(() => window.customDropper.color))
    .toBe('#FF0000');
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
});

test('an invalid provider grid during commit reports an error and releases the picker', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => {
    window.customDropper.sampler = (request) => {
      if (request.x < 120 || request.y < 120 || request.y > 320) return null;
      if (window.invalidSample) return new ImageData(1, 1);
      const pixels = new ImageData(request.size, request.size);
      for (let offset = 0; offset < pixels.data.length; offset += 4)
        pixels.data.set([255, 0, 0, 255], offset);
      return pixels;
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await page.evaluate(() => {
    const position = { bubbles: true, clientX: 200, clientY: 160, button: 0 };
    window.customCanvas.dispatchEvent(
      new PointerEvent('pointerdown', position),
    );
    window.customCanvas.dispatchEvent(new PointerEvent('pointerup', position));
    window.invalidSample = true;
    window.customCanvas.dispatchEvent(new MouseEvent('click', position));
  });
  await expect
    .poll(() => page.evaluate(() => window.customEvents))
    .toEqual(['pickstart', 'pickerror']);
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(false);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('');
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('cancel aborts a pending provider and never reopens a stale magnifier', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.sampler = (request) => {
      if (request.x < 120 || request.y < 120) return null;
      window.sampleRequests.push(request);
      return new Promise<ImageData>((resolve) => {
        window.resolveSample = () =>
          resolve(new ImageData(request.size, request.size));
      });
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await expect
    .poll(() => page.evaluate(() => !!window.resolveSample))
    .toBe(true);
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() =>
      window.sampleRequests.every((request) => request.signal.aborted),
    ),
  ).toBe(true);
  await page.evaluate(() => window.resolveSample?.());
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.customPreviews)).toEqual([]);
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'cancel',
  ]);
  await page.evaluate(() => {
    window.customDropper.sampler = null;
  });
  await open(page);
  await page.mouse.click(400, 160);
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#00FF00');
});

test('provider errors release the picker and configuration changes cancel silently', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.sampler = ({ x, y }) => {
      if (x < 120 || y < 120) return null;
      throw new Error('Renderer is unavailable');
    };
  });
  await open(page);
  await page.mouse.move(200, 160);
  await expect
    .poll(() => page.evaluate(() => window.customEvents))
    .toEqual(['pickstart', 'pickerror']);
  await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
  await page.evaluate(() => {
    window.customDropper.sampler = undefined;
  });
  for (const change of ['source', 'sampler', 'disabled', 'mode'] as const) {
    await open(page);
    await page.evaluate((property) => {
      const element = window.customDropper;
      if (property === 'source') element.source = window.customCanvas;
      else if (property === 'sampler') element.sampler = () => null;
      else if (property === 'disabled') element.disabled = true;
      else element.mode = 'native';
    }, change);
    await expect(picker(page).locator('[part="overlay"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.customDropper.picking)).toBe(false);
    await page.evaluate(() => {
      window.customDropper.source = null;
      window.customDropper.sampler = null;
      window.customDropper.disabled = false;
      window.customDropper.mode = 'custom';
    });
  }
  expect(await page.evaluate(() => window.customEvents)).not.toContain(
    'cancel',
  );
});

test('keyboard selection and custom magnifier parts remain available', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    window.customDropper.magnifierPixels = 12;
    window.customDropper.style.setProperty(
      '--dsk-color-eyedropper-magnifier-size',
      '160px',
    );
    window.customDropper.style.setProperty(
      '--dsk-color-eyedropper-magnifier-radius',
      '12px',
    );
  });
  await open(page);
  await page.mouse.move(200, 160);
  await preview(page, '#FF0000');
  await expect
    .poll(() => page.evaluate(() => window.customPreview?.width))
    .toBe(13);
  await page.keyboard.press('Shift+ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.customPreview?.x))
    .toBeGreaterThan(200);
  await expect(picker(page).locator('[part="lens"]')).toHaveCSS(
    'border-radius',
    '12px',
  );
  await expect(picker(page).locator('[part="magnifier"]')).toHaveCSS(
    'width',
    '160px',
  );
  await page.screenshot({ path: testInfo.outputPath('custom-magnifier.png') });
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.customDropper.color)).toBe('#FF0000');
});

test('keyboard-only activation can reach a declared canvas and select a pixel', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.customDropper.source = window.customCanvas;
    const context = window.customCanvas.getContext('2d')!;
    context.fillStyle = '#2468ac';
    context.fillRect(
      0,
      0,
      window.customCanvas.width,
      window.customCanvas.height,
    );
  });
  await picker(page).locator('[part="button"]').focus();
  await page.keyboard.press('Enter');
  await preview(page, '#2468AC');
  const initialX = await page.evaluate(() => window.customPreview!.x);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.customPreview?.x))
    .toBeGreaterThan(initialX);
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.customDropper.color))
    .toBe('#2468AC');
  expect(await page.evaluate(() => window.customEvents)).toEqual([
    'pickstart',
    'input',
    'change',
  ]);
});

test('slots receive live pixels and disconnect removes listeners and the magnifier', async ({
  page,
}) => {
  await page.evaluate(() => {
    const label = document.createElement('span');
    label.slot = 'magnifier';
    label.style.cssText =
      'display:block;background:black;color:white;padding:12px';
    window.customDropper.append(label);
    window.customDropper.addEventListener('colorpreview', (event) => {
      label.textContent = (
        event as CustomEvent<EyeDropperPreviewDetail>
      ).detail.color;
    });
  });
  await open(page);
  await page.mouse.move(200, 160);
  await expect(picker(page).locator('[slot="magnifier"]')).toHaveText(
    '#FF0000',
  );
  await page.evaluate(() => {
    window.customDropper.remove();
    window.canvasEvents = [];
  });
  await page.mouse.click(200, 160);
  expect(await page.evaluate(() => window.customDropper.picking)).toBe(false);
  expect(await page.evaluate(() => window.customEvents)).toEqual(['pickstart']);
  expect(await page.evaluate(() => window.canvasEvents)).toEqual([
    'pointerdown',
    'pointerup',
    'click',
  ]);
});

test('playground exposes live canvas sampling and custom magnifier settings', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const settings = page.locator('#eyedropper-settings');
  const demo = page.locator('#eyedropper-demo');
  const defaultMode = await demo.evaluate((node) =>
    (node as DskColorEyedropper).nativeSupported ? 'native' : 'page',
  );
  await expect(settings.getByLabel('Picker mode')).toHaveValue(defaultMode);
  await settings.getByLabel('Picker mode').selectOption('canvas');
  await settings.getByLabel('Magnifier size (px)').fill('144');
  await settings.getByLabel('Magnifier shape').selectOption('square');
  await settings.getByLabel('Magnifier pixels', { exact: true }).fill('11');
  const sample = page.locator('#eyedropper-canvas');
  await sample.scrollIntoViewIfNeeded();
  const bounds = await sample.boundingBox();
  expect(bounds).not.toBeNull();
  const color = await sample.evaluate((node) => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
    const pixel = node
      .getContext('2d')!
      .getImageData(
        Math.floor(node.width / 2),
        Math.floor(node.height / 2),
        1,
        1,
      ).data;
    return (
      '#' +
      Array.from(pixel.subarray(0, 3), (value) =>
        value.toString(16).padStart(2, '0'),
      )
        .join('')
        .toUpperCase()
    );
  });
  await demo.locator('[part="button"]').click();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await expect(demo.locator('[part="magnifier"]')).toHaveCSS('width', '144px');
  await expect(demo.locator('[part="lens"]')).toHaveCSS(
    'border-radius',
    '12px',
  );
  await expect(demo.locator('[part="value"]')).toHaveText(color);
  await page.screenshot({
    path: testInfo.outputPath('playground-live-picker.png'),
  });
  await page.mouse.click(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await expect(page.locator('#eyedropper-color')).toHaveText(color);
  await expect(page.locator('#eyedropper-count')).toHaveText('1');
  await settings.getByLabel('Picker mode').selectOption('native');
  await expect(settings.getByLabel('Magnifier size (px)')).toBeDisabled();
  await expect(page.locator('#eyedropper-code')).toContainText('mode="native"');
  await page.locator('#eyedropper-reset').click();
  await expect(settings.getByLabel('Picker mode')).toHaveValue(defaultMode);
  await expect(settings.getByLabel('Magnifier size (px)')).toHaveValue('120');
  if (defaultMode === 'native')
    await expect(settings.getByLabel('Magnifier size (px)')).toBeDisabled();
  await settings.getByLabel('Picker mode').selectOption('canvas');
  await expect(settings.getByLabel('Magnifier size (px)')).toBeEnabled();
  await expect(settings.getByLabel('Magnifier shape')).toHaveValue('circle');
});

test('playground can zoom and pan its live canvas during selection', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = page.locator('#eyedropper-canvas');
  const demo = page.locator('#eyedropper-demo');
  await page.locator('#eyedropper-mode').selectOption('canvas');
  await canvas.scrollIntoViewIfNeeded();
  await demo.locator('[part="button"]').click();
  // Activation/focus may scroll the toolbar into view; locate the canvas after it.
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  await expect(demo.locator('[part="magnifier"]')).toBeVisible();
  await page.mouse.wheel(0, -120);
  await expect(page.locator('#eyedropper-zoom')).not.toHaveText('100%');
  const beforePan = await canvas.evaluate((node) =>
    (node as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.down('Space');
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 30, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect
    .poll(() =>
      canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(beforePan);
  expect(
    await demo.evaluate((node) => (node as DskColorEyedropper).picking),
  ).toBe(true);
  await expect(page.locator('#eyedropper-count')).toHaveText('0');
  await page.keyboard.press('Escape');
  await expect(demo.locator('[part="overlay"]')).toHaveCount(0);
});
