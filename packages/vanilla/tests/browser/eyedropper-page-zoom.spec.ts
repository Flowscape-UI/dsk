import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DskColorEyedropper } from '@flowscape-ui/dsk';

async function pixels(page: Page, screenshot: string | null) {
  return page.evaluate(async (encoded) => {
    let canvas: HTMLCanvasElement;
    if (encoded) {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
    } else {
      canvas = document
        .querySelector('#zoom-picker')!
        .shadowRoot!.querySelector<HTMLCanvasElement>('[part="snapshot"]')!;
    }
    const context = canvas.getContext('2d')!;
    const ratio = devicePixelRatio;
    const line = document.querySelector('#zoom-line')!.getBoundingClientRect();
    const edge = context.getImageData(
      Math.round(line.left * ratio) - 2,
      Math.round((line.top + line.height / 2) * ratio),
      5,
      1,
    ).data;
    const textBands = (selector: string) => {
      const text = document.querySelector(selector)!.getBoundingClientRect();
      const width = Math.ceil(text.width * ratio) + 4;
      const height = Math.ceil(text.height * ratio) + 4;
      const glyphs = context.getImageData(
        Math.floor(text.left * ratio) - 2,
        Math.floor(text.top * ratio) - 2,
        width,
        height,
      ).data;
      const bands: Array<[number, number]> = [];
      let start = -1;
      for (let y = 0; y <= height; y++) {
        let ink = false;
        for (let x = 0; y < height && x < width; x++) {
          const offset = (y * width + x) * 4;
          if (
            (glyphs[offset]! + glyphs[offset + 1]! + glyphs[offset + 2]!) / 3 <
            100
          ) {
            ink = true;
            break;
          }
        }
        if (ink && start < 0) start = y;
        if (!ink && start >= 0) {
          bands.push([start, y]);
          start = -1;
        }
      }
      return bands;
    };
    return {
      width: canvas.width,
      height: canvas.height,
      ratio,
      edge: Array.from({ length: 5 }, (_, index) =>
        Math.round(
          (edge[index * 4]! + edge[index * 4 + 1]! + edge[index * 4 + 2]!) / 3,
        ),
      ),
      textBands: textBands('#zoom-text'),
      wrappedBands: textBands('#zoom-wrapped'),
    };
  }, screenshot);
}

for (const zoom of [0.9, 1.1, 1.25]) {
  test(`page keeps physical resolution and text wrapping at real browser zoom ${zoom}`, async ({
    browserName,
    playwright,
    channel,
    launchOptions,
    baseURL,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome profile zoom regression.');
    const profile = testInfo.outputPath('zoom-profile');
    await mkdir(path.join(profile, 'Default'), { recursive: true });
    // This changes browser zoom itself, independently of DPR emulation or pinch.
    await writeFile(
      path.join(profile, 'Default', 'Preferences'),
      JSON.stringify({
        partition: {
          default_zoom_level: { x: Math.log(zoom) / Math.log(1.2) },
        },
      }),
    );
    const context = await playwright.chromium.launchPersistentContext(profile, {
      ...launchOptions,
      channel,
      headless: true,
      viewport: null,
      ignoreDefaultArgs: ['--hide-scrollbars'],
      args: [...(launchOptions.args ?? []), '--window-size=1103,1003'],
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.route('https://fonts.googleapis.com/**', (route) =>
        route.fulfill({ contentType: 'text/css', body: '' }),
      );
      await page.goto(baseURL ?? 'http://127.0.0.1:5183', {
        waitUntil: 'domcontentloaded',
      });
      const layout = await page.evaluate(async () => {
        document
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((node) => node.remove());
        document.body.replaceChildren();
        document.documentElement.style.cssText =
          'background:white;color-scheme:light;font:14px Arial,sans-serif';
        document.body.style.cssText =
          'margin:0;background:white;min-height:1400px';
        const picker = document.createElement('dsk-color-eyedropper');
        picker.id = 'zoom-picker';
        picker.mode = 'page';
        picker.style.cssText = 'position:fixed;left:24px;top:24px';
        const line = document.createElement('div');
        line.id = 'zoom-line';
        // A positive hairline border snaps to one layout pixel at browser zoom.
        // Transforming a 1px box instead can shrink an already-snapped box.
        line.style.cssText =
          'position:absolute;left:100px;top:100px;width:0;height:64px;border-left:0.0001px solid #000';
        const text = document.createElement('div');
        text.id = 'zoom-text';
        text.textContent = 'Change events 0';
        text.style.cssText =
          'position:absolute;left:240px;top:200px;box-sizing:border-box;border:1px solid transparent;padding:0;width:max-content;height:72px;white-space:nowrap;font:14px/24px Arial,sans-serif;color:#000';
        const wrapped = document.createElement('div');
        wrapped.id = 'zoom-wrapped';
        wrapped.textContent = 'Change events 0 several words';
        wrapped.style.cssText =
          'position:absolute;left:450px;top:200px;width:80px;height:120px;white-space:normal;font:14px/24px Arial,sans-serif;color:#000';
        document.body.append(picker, line, text, wrapped);
        await document.fonts.ready;
        const range = document.createRange();
        range.selectNodeContents(text);
        const measured = range.getBoundingClientRect().width;
        const border = parseFloat(getComputedStyle(text).borderLeftWidth);
        // At 125% Chrome computes the 1px border as .8px. A clone laid out
        // at 100% rounds it back to 1px and incorrectly wraps the last word.
        text.style.width = `${measured + 2 * border + 0.05}px`;
        text.style.whiteSpace = 'normal';
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return {
          border,
          measured,
          ratio: devicePixelRatio,
          width: innerWidth,
          height: innerHeight,
          textLines: Array.from(range.getClientRects(), (rect) =>
            rect.toJSON(),
          ),
        };
      });
      const cdp = await context.newCDPSession(page);
      const browserLayout = await cdp.send('Page.getLayoutMetrics');
      expect(browserLayout.cssVisualViewport.zoom).toBeCloseTo(zoom, 5);
      expect(layout.textLines).toHaveLength(1);
      // Playwright's screenshot clipping rescales real browser zoom. Read the
      // compositor viewport directly, without a CSS clip or viewport override.
      const before = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const baseline = await pixels(page, before.data);
      expect(
        baseline.textBands,
        JSON.stringify({ layout, baseline }),
      ).toHaveLength(1);
      const baselineDiagnostic = JSON.stringify({ layout, baseline });
      expect(baseline.wrappedBands.length, baselineDiagnostic).toBeGreaterThan(
        1,
      );
      expect(baseline.edge[2], baselineDiagnostic).toBeLessThanOrEqual(12);
      expect(
        baseline.edge
          .filter((_, index) => index !== 2)
          .every((value) => value >= 243),
        baselineDiagnostic,
      ).toBe(true);
      await page.evaluate(() => {
        void document.querySelector<DskColorEyedropper>('#zoom-picker')!.open();
      });
      await page.locator('#zoom-picker').locator('[part="snapshot"]').waitFor();
      const snapshot = await pixels(page, null);
      // Keep the magnifier and its shadow away from both pixel probes.
      await page.mouse.move(700, 500);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const after = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const displayed = await pixels(page, after.data);
      await testInfo.attach('before-browser-zoom.png', {
        body: Buffer.from(before.data, 'base64'),
        contentType: 'image/png',
      });
      await testInfo.attach('after-browser-zoom.png', {
        body: Buffer.from(after.data, 'base64'),
        contentType: 'image/png',
      });
      const diagnostic = JSON.stringify({
        layout,
        baseline,
        snapshot,
        displayed,
      });
      expect([snapshot.width, snapshot.height], diagnostic).toEqual([
        baseline.width,
        baseline.height,
      ]);
      for (const [kind, result] of Object.entries({ snapshot, displayed })) {
        for (const key of ['textBands', 'wrappedBands'] as const) {
          expect(result[key], `${kind} ${key}: ${diagnostic}`).toHaveLength(
            baseline[key].length,
          );
          result[key].forEach((band, lineIndex) => {
            band.forEach((boundary, index) => {
              expect(
                Math.abs(boundary - baseline[key][lineIndex]![index]!),
                `${kind} ${key} line ${lineIndex}: ${diagnostic}`,
              ).toBeLessThanOrEqual(1);
            });
          });
        }
        result.edge.forEach((value, index) => {
          expect(
            Math.abs(value - baseline.edge[index]!),
            `${kind} edge ${index}: ${diagnostic}`,
          ).toBeLessThanOrEqual(12);
        });
      }
      await page.keyboard.press('Escape');
    } finally {
      await context.close();
    }
  });
}
