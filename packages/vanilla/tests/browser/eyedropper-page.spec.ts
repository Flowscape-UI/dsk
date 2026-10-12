import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { DskColorEyedropper } from '@flowscape-ui/dsk';

declare global {
  interface Window {
    pageDropper: DskColorEyedropper;
    pageSerialization: string;
  }
}

test.beforeEach(async ({ page }) => {
  // These renderer regressions must not depend on the playground's remote fonts.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

async function fixture(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((node) => node.remove());
    document.body.replaceChildren();
    document.documentElement.style.cssText =
      'background:white;color-scheme:light;font:16px Arial,sans-serif';
    document.body.style.cssText = 'margin:0;background:white;height:1000px';
    const picker = document.createElement('dsk-color-eyedropper');
    picker.id = 'page-dropper';
    picker.mode = 'page';
    picker.style.cssText = 'position:fixed;left:24px;top:24px';
    document.body.append(picker);
    window.pageDropper = picker;
  });
}

async function capture(page: Page) {
  await page.locator('#page-dropper').locator('[part="button"]').click();
  await expect(
    page.locator('#page-dropper').locator('[part="snapshot"]'),
  ).toHaveCount(1, { timeout: 15000 });
}

test('page skips offscreen resources and preserves scrolled flow and fixed descendants', async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    const serialize = XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString = function (root: Node): string {
      const xml = serialize.call(this, root);
      if (xml.includes('viewport-target')) window.pageSerialization = xml;
      return xml;
    };
    const before = document.createElement('section');
    before.style.cssText = 'height:2000px';
    before.innerHTML =
      '<div id="expensive-offscreen" style="height:1500px;font:1px/1px Arial">' +
      '<span style="display:block">Offscreen content</span>'.repeat(1500) +
      '</div>';
    const canvas = document.createElement('canvas');
    canvas.toDataURL = () => {
      throw new Error('Offscreen canvas must not be read');
    };
    before.append(canvas);
    const fixed = document.createElement('div');
    fixed.id = 'visible-fixed';
    fixed.style.cssText =
      'position:fixed;left:500px;top:200px;width:80px;height:80px;background:rgb(0,255,0)';
    // Its parent is entirely outside the viewport, but the fixed child is not.
    const parent = document.createElement('div');
    parent.append(fixed);
    before.append(parent);
    const target = document.createElement('div');
    target.id = 'viewport-target';
    target.style.cssText = 'width:300px;height:300px;background:rgb(255,0,0)';
    const after = before.cloneNode(true);
    if (after instanceof HTMLElement) after.style.marginTop = '2000px';
    document.body.append(before, target, after);
    window.scrollTo(0, 1900);
  });
  await capture(page);
  const result = await page.evaluate(() => {
    const canvas =
      window.pageDropper.shadowRoot!.querySelector<HTMLCanvasElement>(
        '[part="snapshot"]',
      )!;
    const context = canvas.getContext('2d')!;
    return {
      xml: window.pageSerialization,
      red: Array.from(context.getImageData(150, 200, 1, 1).data),
      green: Array.from(context.getImageData(520, 220, 1, 1).data),
    };
  });
  expect(result.xml).not.toContain('expensive-offscreen');
  expect(result.xml).not.toContain('Offscreen content');
  expect(result.red).toEqual([255, 0, 0, 255]);
  expect(result.green).toEqual([0, 255, 0, 255]);
});

test('page captures current form properties instead of stale defaults on every capture', async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    window.pageSerialization = '';
    const serialize = XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString = function (root: Node): string {
      const xml = serialize.call(this, root);
      if (xml.includes('id="actual-textarea"')) window.pageSerialization = xml;
      return xml;
    };
    for (const [prefix, left] of [
      ['actual', 120],
      ['reference', 500],
    ] as const) {
      const group = document.createElement('section');
      group.style.cssText = `position:absolute;left:${left}px;top:120px;width:260px`;
      group.innerHTML = `
        <select id="${prefix}-select"><optgroup label="First"><option value="original" selected>Original choice</option><option value="first">Current choice</option></optgroup><optgroup label="Second"><option value="second">Latest choice</option></optgroup></select>
        <input id="${prefix}-text" value="Original text">
        <textarea id="${prefix}-textarea">Original textarea</textarea>
        <input id="${prefix}-checkbox" type="checkbox">
        <input id="${prefix}-radio" type="radio" name="${prefix}-radio">`;
      for (const control of group.querySelectorAll<HTMLElement>(
        'select, input, textarea',
      )) {
        control.style.cssText =
          'display:block;box-sizing:border-box;margin:0 0 14px;padding:4px;border:1px solid #888;border-radius:0;width:240px;height:42px;font:18px/24px Arial,sans-serif;color:#111;background:#fff';
        if (
          control instanceof HTMLInputElement &&
          ['checkbox', 'radio'].includes(control.type)
        ) {
          control.style.cssText =
            'display:block;box-sizing:border-box;margin:0 0 14px;width:28px;height:28px;accent-color:#147a4d';
        }
      }
      document.body.append(group);
    }
  });
  for (const pass of [0, 1]) {
    await page.evaluate((index) => {
      const value = index === 0 ? 'first' : 'second';
      const text =
        index === 0 ? 'Changed <b>text</b>' : 'Updated & literal <i>';
      const checked = index === 0;
      const actualSelect =
        document.querySelector<HTMLSelectElement>('#actual-select')!;
      const referenceSelect =
        document.querySelector<HTMLSelectElement>('#reference-select')!;
      actualSelect.value = value;
      for (const option of referenceSelect.options)
        option.toggleAttribute('selected', option.value === value);
      const actualText =
        document.querySelector<HTMLInputElement>('#actual-text')!;
      const referenceText =
        document.querySelector<HTMLInputElement>('#reference-text')!;
      actualText.value = text;
      referenceText.setAttribute('value', text);
      document.querySelector<HTMLTextAreaElement>('#actual-textarea')!.value =
        text;
      document.querySelector<HTMLTextAreaElement>(
        '#reference-textarea',
      )!.textContent = text;
      for (const type of ['checkbox', 'radio']) {
        document.querySelector<HTMLInputElement>(`#actual-${type}`)!.checked =
          checked;
        document
          .querySelector<HTMLInputElement>(`#reference-${type}`)!
          .toggleAttribute('checked', checked);
      }
    }, pass);
    expect(await page.locator('#actual-text').getAttribute('value')).toBe(
      'Original text',
    );
    expect(await page.locator('#actual-textarea').textContent()).toBe(
      'Original textarea',
    );
    await capture(page);
    const literalTextarea = await page.evaluate(() => {
      const document = new DOMParser().parseFromString(
        window.pageSerialization,
        'image/svg+xml',
      );
      const textarea = document.querySelector('#actual-textarea');
      return {
        text: textarea?.textContent,
        elements: textarea?.childElementCount,
      };
    });
    expect(literalTextarea).toEqual({
      text: pass === 0 ? 'Changed <b>text</b>' : 'Updated & literal <i>',
      elements: 0,
    });
    const comparisons = await page.evaluate(() => {
      const snapshot =
        window.pageDropper.shadowRoot!.querySelector<HTMLCanvasElement>(
          '[part="snapshot"]',
        )!;
      const context = snapshot.getContext('2d')!;
      const ratioX = snapshot.width / window.innerWidth;
      const ratioY = snapshot.height / window.innerHeight;
      return ['select', 'text', 'textarea', 'checkbox', 'radio'].map((kind) => {
        const sample = (prefix: string) => {
          const bounds = document
            .querySelector(`#${prefix}-${kind}`)!
            .getBoundingClientRect();
          return context.getImageData(
            Math.round(bounds.left * ratioX),
            Math.round(bounds.top * ratioY),
            Math.round(bounds.width * ratioX),
            Math.round(bounds.height * ratioY),
          ).data;
        };
        const actual = sample('actual');
        const reference = sample('reference');
        let different = 0;
        let ink = 0;
        for (let offset = 0; offset < actual.length; offset += 4) {
          if (
            [0, 1, 2].some(
              (channel) =>
                Math.abs(
                  actual[offset + channel]! - reference[offset + channel]!,
                ) > 10,
            )
          )
            different++;
          if (reference[offset]! < 160) ink++;
        }
        return { kind, fraction: different / (actual.length / 4), ink };
      });
    });
    for (const comparison of comparisons) {
      expect(
        comparison.ink,
        `${comparison.kind} should contain visible pixels`,
      ).toBeGreaterThan(0);
      expect(
        comparison.fraction,
        `${comparison.kind} should display the current value in capture ${pass + 1}`,
      ).toBeLessThan(0.005);
    }
    await page.keyboard.press('Escape');
    await expect(
      page.locator('#page-dropper').locator('[part="snapshot"]'),
    ).toHaveCount(0);
  }
});

test('playground page mode is serialized as the currently selected option', async ({
  page,
}) => {
  const mode = page.locator('#eyedropper-mode');
  await mode.selectOption('page');
  await page.evaluate(() => {
    window.pageSerialization = '';
    const serialize = XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString = function (root: Node): string {
      const xml = serialize.call(this, root);
      if (xml.includes('id="eyedropper-mode"')) window.pageSerialization = xml;
      return xml;
    };
  });
  const demo = page.locator('#eyedropper-demo');
  await demo.locator('[part="button"]').click();
  await expect(demo.locator('[part="snapshot"]')).toHaveCount(1, {
    timeout: 15000,
  });
  const captured = await page.evaluate(() => {
    const document = new DOMParser().parseFromString(
      window.pageSerialization,
      'image/svg+xml',
    );
    return Array.from(
      document.querySelectorAll('#eyedropper-mode option[selected]'),
      (option) => option.getAttribute('value'),
    );
  });
  expect(captured).toEqual(['page']);
  await page.keyboard.press('Escape');
  await expect(mode).toHaveValue('page');
});

test('page capture embeds imported fonts and refreshes changed stylesheets on later captures', async ({
  page,
}) => {
  const font = fileURLToPath(
    new URL('./fixtures/fonts/Ahem.ttf', import.meta.url),
  );
  const fontOrigin = 'http://eyedropper-font.example.test';
  await page.route(`${fontOrigin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (path === '/Ahem.ttf') {
      await route.fulfill({ path: font, contentType: 'font/ttf', headers });
      return;
    }
    const second = path.includes('second');
    const name = second ? 'second' : 'first';
    const family = second ? 'CaptureSecond' : 'CaptureFirst';
    const css = path.endsWith('-face.css')
      ? `@font-face { font-family: "${family}"; src: url("./Ahem.ttf") format("truetype"); font-style: normal; font-weight: 400; }`
      : `@import url("./${name}-face.css");`;
    await route.fulfill({ contentType: 'text/css', body: css, headers });
  });
  await fixture(page);
  await page.evaluate(() => {
    const text = document.createElement('div');
    text.id = 'font-sample';
    text.textContent = 'XXXXX';
    text.style.cssText =
      'position:absolute;left:120px;top:120px;width:max-content;letter-spacing:0;font-synthesis:none';
    const link = document.createElement('link');
    link.id = 'font-stylesheet';
    link.rel = 'stylesheet';
    document.head.append(link);
    document.body.append(text);
  });
  for (const pass of [0, 1]) {
    const size = pass === 0 ? 40 : 28;
    const color = pass === 0 ? [23, 77, 135] : [138, 33, 55];
    await page.evaluate(
      async ({ pass, size, color, fontOrigin }) => {
        const text = document.querySelector<HTMLElement>('#font-sample')!;
        const family = pass === 0 ? 'CaptureFirst' : 'CaptureSecond';
        text.style.font = `${size}px/${size}px "${family}", serif`;
        text.style.color = `rgb(${color.join(',')})`;
        const link =
          document.querySelector<HTMLLinkElement>('#font-stylesheet')!;
        await new Promise<void>((resolve, reject) => {
          link.onload = () => resolve();
          link.onerror = () =>
            reject(new Error('Fixture stylesheet failed to load'));
          link.href = `${fontOrigin}/${pass === 0 ? 'first' : 'second'}.css`;
        });
        await document.fonts.load(`${size}px "${family}"`, 'XXXXX');
        await document.fonts.ready;
      },
      { pass, size, color, fontOrigin },
    );
    const width = await page
      .locator('#font-sample')
      .evaluate((node) => node.getBoundingClientRect().width);
    // Linux font metrics can round max-content up by one Blink layout unit.
    // Keep this below a physical pixel; glyph coverage is checked separately.
    expect(Math.abs(width - size * 5)).toBeLessThanOrEqual(1 / 64);
    await capture(page);
    const coverage = await page.evaluate(
      ({ size, color }) => {
        const snapshot =
          window.pageDropper.shadowRoot!.querySelector<HTMLCanvasElement>(
            '[part="snapshot"]',
          )!;
        const bounds = document
          .querySelector('#font-sample')!
          .getBoundingClientRect();
        const ratio = snapshot.width / window.innerWidth;
        let matching = 0;
        let sampled = 0;
        for (let glyph = 0; glyph < 5; glyph++) {
          // Exclude every glyph boundary, where rasterizers can antialias seams.
          const pixels = snapshot
            .getContext('2d')!
            .getImageData(
              Math.round((bounds.left + glyph * size + 4) * ratio),
              Math.round((bounds.top + 4) * ratio),
              Math.round((size - 8) * ratio),
              Math.round((size - 8) * ratio),
            ).data;
          sampled += pixels.length / 4;
          for (let offset = 0; offset < pixels.length; offset += 4)
            if (
              [0, 1, 2].every(
                (channel) =>
                  Math.abs(pixels[offset + channel]! - color[channel]!) <= 2,
              )
            )
              matching++;
        }
        return matching / sampled;
      },
      { size, color },
    );
    // Ahem's X glyph is a solid square; fallback text cannot fill this region.
    expect(
      coverage,
      `capture ${pass + 1} must embed the current imported font`,
    ).toBeGreaterThan(0.98);
    await page.keyboard.press('Escape');
  }
});

async function resolutionPixels(page: Page, screenshot: string | null = null) {
  return page.evaluate(async (encoded) => {
    let source: HTMLCanvasElement;
    if (encoded) {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      source = document.createElement('canvas');
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      source.getContext('2d')!.drawImage(image, 0, 0);
    } else {
      source =
        window.pageDropper.shadowRoot!.querySelector<HTMLCanvasElement>(
          '[part="snapshot"]',
        )!;
    }
    const context = source.getContext('2d')!;
    const ratio = window.devicePixelRatio;
    const vertical = document
      .querySelector('#resolution-vertical')!
      .getBoundingClientRect();
    const horizontal = document
      .querySelector('#resolution-horizontal')!
      .getBoundingClientRect();
    const text = document
      .querySelector('#resolution-text')!
      .getBoundingClientRect();
    const nativeText = document
      .querySelector('#resolution-native-text')!
      .getBoundingClientRect();
    const nativePixels = context.getImageData(
      Math.round(nativeText.left * ratio) - 2,
      Math.round(nativeText.top * ratio) - 2,
      Math.round(nativeText.width * ratio) + 4,
      Math.round(nativeText.height * ratio) + 4,
    ).data;
    let fringePixels = 0;
    let inkPixels = 0;
    for (let offset = 0; offset < nativePixels.length; offset += 4) {
      const channels = [
        nativePixels[offset]!,
        nativePixels[offset + 1]!,
        nativePixels[offset + 2]!,
      ];
      if (Math.max(...channels) - Math.min(...channels) > 10) fringePixels++;
      if ((channels[0]! + channels[1]! + channels[2]!) / 3 < 200) inkPixels++;
    }
    const profile = (x: number, y: number, width: number, height: number) => {
      const pixels = context.getImageData(x, y, width, height).data;
      return Array.from({ length: width * height }, (_, index) =>
        Math.round(
          (pixels[index * 4]! +
            pixels[index * 4 + 1]! +
            pixels[index * 4 + 2]!) /
            3,
        ),
      );
    };
    const runs = (samples: number[]) => {
      const intervals: number[][] = [];
      let start = -1;
      for (let index = 0; index <= samples.length; index++) {
        if ((samples[index] ?? 255) < 128) {
          if (start === -1) start = index;
        } else if (start !== -1) {
          intervals.push([start, index]);
          start = -1;
        }
      }
      return intervals;
    };
    return {
      width: source.width,
      height: source.height,
      nativeText: { fringePixels, inkPixels },
      devicePixelRatio: ratio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bounds: {
        vertical: vertical.toJSON(),
        horizontal: horizontal.toJSON(),
        text: text.toJSON(),
      },
      background: {
        root: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
      },
      vertical: profile(
        Math.round(vertical.left * ratio) - 3,
        Math.round((vertical.top + vertical.height / 2) * ratio),
        7,
        1,
      ),
      horizontal: profile(
        Math.round((horizontal.left + horizontal.width / 2) * ratio),
        Math.round(horizontal.top * ratio) - 3,
        1,
        7,
      ),
      textHorizontal: runs(
        profile(
          Math.round(text.left * ratio) - 2,
          Math.round((text.top + text.height / 2) * ratio),
          Math.round(text.width * ratio) + 4,
          1,
        ),
      ),
      textVertical: runs(
        profile(
          Math.round((text.left + 6) * ratio),
          Math.round(text.top * ratio) - 2,
          1,
          Math.round(text.height * ratio) + 4,
        ),
      ),
    };
  }, screenshot);
}

for (const ratio of [1.25, 1.5, 2]) {
  test.describe(`page rasterization at DPR ${ratio}`, () => {
    test.use({ deviceScaleFactor: ratio });

    test('preserves physical-pixel line edges and imported glyph positions', async ({
      page,
    }) => {
      const font = fileURLToPath(
        new URL('./fixtures/fonts/Ahem.ttf', import.meta.url),
      );
      const origin = 'http://resolution-font.example.test';
      await page.route(`${origin}/**`, async (route) => {
        const path = new URL(route.request().url()).pathname;
        const headers = { 'Access-Control-Allow-Origin': '*' };
        if (path === '/Ahem.ttf') {
          await route.fulfill({ path: font, contentType: 'font/ttf', headers });
        } else {
          const body =
            path === '/sheet.css'
              ? '@import url("./face.css");'
              : '@font-face { font-family: ResolutionAhem; src: url("./Ahem.ttf") format("truetype"); font-weight: 400; font-style: normal; }';
          await route.fulfill({ contentType: 'text/css', body, headers });
        }
      });
      await fixture(page);
      await page.evaluate(async (origin) => {
        const size = 1 / window.devicePixelRatio;
        const vertical = document.createElement('div');
        vertical.id = 'resolution-vertical';
        vertical.style.cssText = `position:absolute;left:120px;top:120px;width:1px;height:64px;background:#000;transform:scaleX(${size});transform-origin:0 0`;
        const horizontal = document.createElement('div');
        horizontal.id = 'resolution-horizontal';
        horizontal.style.cssText = `position:absolute;left:200px;top:200px;width:64px;height:1px;background:#000;transform:scaleY(${size});transform-origin:0 0`;
        const text = document.createElement('div');
        text.id = 'resolution-text';
        text.textContent = 'XX XX';
        text.style.cssText =
          'position:absolute;left:400px;top:120px;width:max-content;font:12px/16px ResolutionAhem,serif;letter-spacing:0;color:#000;font-synthesis:none';
        const nativeText = document.createElement('div');
        nativeText.id = 'resolution-native-text';
        nativeText.textContent = 'Live editor color picker';
        nativeText.style.cssText =
          'position:absolute;left:400px;top:220px;width:max-content;font:400 28px/40px Arial,sans-serif;color:#000;background:#fff;font-synthesis:none';
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        document.body.append(vertical, horizontal, text, nativeText);
        await new Promise<void>((resolve, reject) => {
          link.onload = () => resolve();
          link.onerror = () =>
            reject(new Error('Resolution font stylesheet failed'));
          link.href = `${origin}/sheet.css`;
          document.head.append(link);
        });
        await document.fonts.load('12px ResolutionAhem', 'XX XX');
        await document.fonts.ready;
      }, origin);
      const width = await page
        .locator('#resolution-text')
        .evaluate((node) => node.getBoundingClientRect().width);
      // Allow one layout unit of font-metric rounding across platforms.
      // The capture must still preserve physical-pixel edges and glyph positions.
      expect(Math.abs(width - 60)).toBeLessThanOrEqual(1 / 64);
      const screenshot = await page.screenshot({ scale: 'device' });
      const baseline = await resolutionPixels(
        page,
        screenshot.toString('base64'),
      );
      // Transform a 1px box: Blink rounds an untransformed subpixel box to 1 CSS px.
      // The resulting lines occupy one physical pixel at fractional display scales.
      const baselineDiagnostic = JSON.stringify(baseline);
      for (const axis of ['vertical', 'horizontal'] as const) {
        const profile = baseline[axis];
        expect(
          profile[3],
          `${axis} baseline center: ${baselineDiagnostic}`,
        ).toBeLessThanOrEqual(12);
        expect(
          profile
            .filter((_, index) => index !== 3)
            .every((value) => value >= 243),
          `${axis} baseline neighbors: ${baselineDiagnostic}`,
        ).toBe(true);
      }
      await capture(page);
      const snapshot = await resolutionPixels(page);
      expect(snapshot.width).toBe(1280 * ratio);
      expect(snapshot.height).toBe(1000 * ratio);
      expect([snapshot.width, snapshot.height]).toEqual([
        baseline.width,
        baseline.height,
      ]);
      expect(baseline.nativeText.inkPixels).toBeGreaterThan(100);
      expect(snapshot.nativeText.inkPixels).toBeGreaterThanOrEqual(
        baseline.nativeText.inkPixels * 0.85,
      );
      expect(snapshot.nativeText.inkPixels).toBeLessThanOrEqual(
        baseline.nativeText.inkPixels * 1.15,
      );
      if (baseline.nativeText.fringePixels > 20) {
        // Black-on-white LCD glyphs contain RGB fringes; transparent canvases lose them.
        // Platforms using grayscale text still run the glyph coverage and edge checks.
        expect(
          snapshot.nativeText.fringePixels,
          `native Arial LCD pixels must survive capture: ${JSON.stringify({ baseline: baseline.nativeText, snapshot: snapshot.nativeText })}`,
        ).toBeGreaterThanOrEqual(baseline.nativeText.fringePixels * 0.9);
      }
      for (const axis of ['vertical', 'horizontal'] as const) {
        snapshot[axis].forEach((value, index) => {
          expect(
            Math.abs(value - baseline[axis][index]!),
            `${axis} edge pixel ${index} must be rasterized at device resolution`,
          ).toBeLessThanOrEqual(12);
        });
      }
      for (const axis of ['textHorizontal', 'textVertical'] as const) {
        expect(baseline[axis].length).toBeGreaterThan(0);
        expect(snapshot[axis]).toHaveLength(baseline[axis].length);
        snapshot[axis].forEach((range, index) => {
          range.forEach((edge, side) => {
            expect(
              Math.abs(edge - baseline[axis][index]![side]!),
              `${axis} glyph boundary must match the live page`,
            ).toBeLessThanOrEqual(1);
          });
        });
      }
      await page.keyboard.press('Escape');
    });
  });
}
