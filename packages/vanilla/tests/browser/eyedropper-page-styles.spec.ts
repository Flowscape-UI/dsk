import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import type { DskColorEyedropper } from '@flowscape-ui/dsk';

declare global {
  interface Window {
    styleDropper: DskColorEyedropper;
    styleSerialization: string;
    styleFilterCalls: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document
      .querySelectorAll('style, link[rel="stylesheet"]')
      .forEach((node) => node.remove());
    document.body.replaceChildren();
    document.documentElement.style.cssText =
      'background:white;color-scheme:light;font:16px Arial,sans-serif';
    document.body.style.cssText = 'margin:0;background:white;height:1000px';
    const picker = document.createElement('dsk-color-eyedropper');
    picker.id = 'style-dropper';
    picker.mode = 'page';
    picker.style.cssText = 'position:fixed;left:24px;top:24px';
    document.body.append(picker);
    window.styleDropper = picker;
    window.styleSerialization = '';
    window.styleFilterCalls = [];
    const serialize = XMLSerializer.prototype.serializeToString;
    XMLSerializer.prototype.serializeToString = function (root: Node): string {
      const xml = serialize.call(this, root);
      if (xml.includes('id="style-dropper"')) window.styleSerialization = xml;
      return xml;
    };
  });
});

async function capture(page: Page) {
  await page.locator('#style-dropper').locator('[part="button"]').click();
  await expect(
    page.locator('#style-dropper').locator('[part="snapshot"]'),
  ).toHaveCount(1, { timeout: 15000 });
}

interface PixelSample {
  id: string;
  colors: number[][];
  inset?: number;
}

async function pixelCoverage(
  page: Page,
  samples: PixelSample[],
  screenshot?: string,
) {
  return page.evaluate(
    async ({ samples, screenshot }) => {
      let canvas: HTMLCanvasElement;
      if (screenshot) {
        const image = new Image();
        image.src = `data:image/png;base64,${screenshot}`;
        await image.decode();
        canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')!.drawImage(image, 0, 0);
      } else {
        canvas =
          window.styleDropper.shadowRoot!.querySelector<HTMLCanvasElement>(
            '[part="snapshot"]',
          )!;
      }
      const context = canvas.getContext('2d')!;
      const ratio = window.devicePixelRatio;
      return samples.map(({ id, colors, inset = 0 }) => {
        const element =
          document.getElementById(id) ??
          document
            .getElementById('style-shadow-host')!
            .shadowRoot!.getElementById(id)!;
        const bounds = element.getBoundingClientRect();
        const width = Math.round((bounds.width - inset * 2) * ratio);
        const height = Math.round((bounds.height - inset * 2) * ratio);
        const pixels = context.getImageData(
          Math.round((bounds.left + inset) * ratio),
          Math.round((bounds.top + inset) * ratio),
          width,
          height,
        ).data;
        return {
          id,
          colors: colors.map((color) => {
            let count = 0;
            let left = width;
            let top = height;
            let right = -1;
            let bottom = -1;
            for (let offset = 0; offset < pixels.length; offset += 4) {
              if (
                ![0, 1, 2].every(
                  (channel) =>
                    Math.abs(pixels[offset + channel]! - color[channel]!) <= 4,
                )
              )
                continue;
              count++;
              const x = (offset / 4) % width;
              const y = Math.floor(offset / 4 / width);
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
            return { count, bounds: [left, top, right, bottom] };
          }),
        };
      });
    },
    { samples, screenshot },
  );
}

function expectMatchingCoverage(
  baseline: Awaited<ReturnType<typeof pixelCoverage>>,
  actual: Awaited<ReturnType<typeof pixelCoverage>>,
) {
  for (const [index, sample] of baseline.entries()) {
    for (const [colorIndex, color] of sample.colors.entries()) {
      const captured = actual[index]!.colors[colorIndex]!;
      const label = `${sample.id}, color ${colorIndex}`;
      expect(color.count, `${label}: native pixels`).toBeGreaterThan(25);
      expect(
        captured.count,
        `${label}: captured pixels`,
      ).toBeGreaterThanOrEqual(color.count * 0.8);
      expect(captured.count, `${label}: captured pixels`).toBeLessThanOrEqual(
        color.count * 1.2,
      );
      for (const [edge, value] of color.bounds.entries())
        expect(
          Math.abs(captured.bounds[edge]! - value),
          `${label}: ink boundary ${edge}`,
        ).toBeLessThanOrEqual(1);
    }
  }
}

test('captures browser, authored and shadow placeholders with their current computed appearance', async ({
  page,
}) => {
  const samples = await page.evaluate(() => {
    const sheet = document.createElement('style');
    sheet.id = 'placeholder-sheet';
    sheet.textContent =
      '#styled-placeholder::placeholder { color: rgb(24, 88, 152); opacity: .5; font: bold italic 24px Arial; }';
    document.head.append(sheet);
    for (const [id, top, tag] of [
      ['browser-placeholder', 120, 'input'],
      ['styled-placeholder', 200, 'input'],
      ['textarea-placeholder', 280, 'textarea'],
    ] as const) {
      const input = document.createElement(tag);
      input.id = id;
      input.placeholder = 'Current placeholder';
      input.style.cssText = `position:absolute;left:120px;top:${top}px;box-sizing:border-box;width:360px;height:60px;padding:8px;border:1px solid black;color:white;background:white;font:24px Arial;resize:none`;
      document.body.append(input);
    }
    const shadowHost = document.createElement('div');
    shadowHost.id = 'style-shadow-host';
    shadowHost.style.cssText =
      'position:absolute;left:120px;top:360px;width:360px;height:60px';
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<style>input {box-sizing:border-box;width:360px;height:60px;padding:8px;border:1px solid black;color:white;background:white;font:24px Arial} input::placeholder {color:rgb(166,45,93);opacity:1;font-weight:bold}</style><input id="shadow-placeholder" placeholder="Shadow placeholder">';
    document.body.append(shadowHost);
    return [
      document.getElementById('browser-placeholder')!,
      document.getElementById('styled-placeholder')!,
      document.getElementById('textarea-placeholder')!,
      shadow.getElementById('shadow-placeholder')!,
    ].map((element) => {
      const computed = getComputedStyle(element, '::placeholder');
      const rgb = computed.color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
      const opacity = Number(computed.opacity);
      return {
        id: element.id,
        inset: 3,
        colors: [
          rgb.map((channel) =>
            Math.round(channel * opacity + 255 * (1 - opacity)),
          ),
        ],
      };
    });
  });
  const baseline = await pixelCoverage(
    page,
    samples,
    (await page.screenshot({ scale: 'device' })).toString('base64'),
  );
  await capture(page);
  expectMatchingCoverage(baseline, await pixelCoverage(page, samples));
  await page.keyboard.press('Escape');

  // CSSOM mutations do not update the stylesheet's textContent or source HTML.
  await page.evaluate(() => {
    const sheet =
      document.querySelector<HTMLStyleElement>('#placeholder-sheet')!.sheet!;
    const rule = sheet.cssRules[0]!;
    if (!(rule instanceof CSSStyleRule)) throw new Error('Expected style rule');
    rule.style.color = 'rgb(33, 131, 75)';
    rule.style.opacity = '1';
    rule.style.fontSize = '30px';
    document.querySelector<HTMLInputElement>(
      '#styled-placeholder',
    )!.placeholder = 'Updated by JavaScript';
  });
  const updated = [
    { id: 'styled-placeholder', inset: 3, colors: [[33, 131, 75]] },
  ];
  const updatedBaseline = await pixelCoverage(
    page,
    updated,
    (await page.screenshot({ scale: 'device' })).toString('base64'),
  );
  await capture(page);
  expectMatchingCoverage(updatedBaseline, await pixelCoverage(page, updated));
  expect(await page.evaluate(() => window.styleSerialization)).toContain(
    'Updated by JavaScript',
  );
});

test('preserves generated text, list markers and first-letter and first-line styles', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    const sheet = document.createElement('style');
    sheet.textContent = `
      #generated-style::before { content:"Before "; color:rgb(172,35,82); }
      #generated-style::after { content:" After"; color:rgb(29,91,173); }
      #marker-style::marker { content:"MMMM "; color:rgb(33,131,75); font-size:28px; }
      #first-letter-style::first-letter { color:rgb(144,50,172); font-size:42px; }
      #first-line-style::first-line { color:rgb(190,79,22); font-weight:bold; }
      #explicit-fill-style::first-letter { color:rgb(144,50,172); font-size:42px; }
      #explicit-first-letter-style::first-line { color:rgb(29,91,173); }
      #explicit-first-letter-style::first-letter { color:rgb(190,20,20); }
      #cascade-style { color:rgb(11,109,163)!important; }
    `;
    document.head.append(sheet);
    for (const [id, text, top] of [
      ['generated-style', 'Text', 120],
      ['first-letter-style', 'Moon', 280],
      ['first-line-style', 'Current first line', 360],
      ['cascade-style', 'Computed cascade', 440],
      ['explicit-fill-style', 'Fixed text fill', 520],
      ['explicit-first-letter-style', 'Explicit first letter', 600],
    ] as const) {
      const element = document.createElement('div');
      element.id = id;
      element.textContent = text;
      element.style.cssText = `position:absolute;left:120px;top:${top}px;width:440px;height:64px;font:28px/60px Arial;color:rgb(190,20,20);background:white`;
      if (id === 'explicit-fill-style')
        element.style.setProperty('-webkit-text-fill-color', 'rgb(190,20,20)');
      document.body.append(element);
    }
    const marker = document.createElement('li');
    marker.id = 'marker-style';
    marker.textContent = 'Marker item';
    marker.style.cssText =
      'position:absolute;left:120px;top:200px;list-style-position:inside;width:440px;height:64px;font:28px/60px Arial;color:black';
    document.body.append(marker);
  });
  const samples = [
    {
      id: 'generated-style',
      colors: [
        [172, 35, 82],
        [29, 91, 173],
      ],
    },
    { id: 'marker-style', colors: [[33, 131, 75]] },
    { id: 'first-letter-style', colors: [[144, 50, 172]] },
    { id: 'first-line-style', colors: [[190, 79, 22]] },
    { id: 'cascade-style', colors: [[11, 109, 163]] },
    { id: 'explicit-fill-style', colors: [[190, 20, 20]] },
    {
      id: 'explicit-first-letter-style',
      colors: [
        [190, 20, 20],
        [29, 91, 173],
      ],
    },
  ];
  const baseline = await pixelCoverage(
    page,
    samples,
    (await page.screenshot({ scale: 'device' })).toString('base64'),
  );
  await capture(page);
  const captured = await pixelCoverage(page, samples);
  await testInfo.attach('pseudo-pixels.json', {
    body: JSON.stringify({ baseline, captured }, null, 2),
    contentType: 'application/json',
  });
  await testInfo.attach('page.svg', {
    body: await page.evaluate(() => window.styleSerialization),
    contentType: 'image/svg+xml',
  });
  expectMatchingCoverage(baseline, captured);
});

test('page style options replace allowlists, apply filters to pseudos and reset to full capture', async ({
  page,
}) => {
  await page.evaluate(() => {
    const sheet = document.createElement('style');
    sheet.textContent =
      '#options-sample::before {content:"Generated";color:rgb(21,84,147);background:rgb(201,211,221)} #options-sample::after {content:"After";color:rgb(47,94,141)}';
    document.head.append(sheet);
    const sample = document.createElement('div');
    sample.id = 'options-sample';
    sample.textContent = 'Options sample';
    sample.style.cssText =
      'position:absolute;left:120px;top:120px;width:300px;height:60px;color:rgb(17,34,51);background:rgb(221,231,241);font:24px Arial';
    const excluded = document.createElement('div');
    excluded.id = 'options-excluded';
    excluded.textContent = 'Excluded node';
    document.body.append(sample, excluded);
    const properties = ['color', 'content'];
    const pseudos = ['::before'];
    window.styleDropper.pageOptions = {
      embedFonts: false,
      inlineImages: false,
      preserveScroll: false,
      styleProperties: properties,
      pseudoElements: pseudos,
      filter: (node) =>
        !(node instanceof Element && node.id === 'options-excluded'),
      filterStyles: (element, property, pseudo) => {
        if (element.id === 'options-sample') {
          window.styleFilterCalls.push(`${pseudo ?? 'element'}:${property}`);
          return property !== 'color';
        }
        return true;
      },
    };
    // Mutating the caller's arrays must not change options already assigned.
    properties.push('background-color');
    pseudos.push('::after');
  });
  await capture(page);
  const filtered = await page.evaluate(() => {
    const parsed = new DOMParser().parseFromString(
      window.styleSerialization,
      'image/svg+xml',
    );
    return {
      style:
        parsed.getElementById('options-sample')?.getAttribute('style') ?? '',
      styles: Array.from(
        parsed.querySelectorAll('style'),
        (style) => style.textContent,
      ).join('\n'),
      excluded: Boolean(parsed.getElementById('options-excluded')),
      calls: window.styleFilterCalls,
    };
  });
  expect(filtered.excluded).toBe(false);
  expect(filtered.style).not.toMatch(
    /(?:^|;)\s*(?:color|background-color)\s*:/,
  );
  expect(filtered.styles).toContain('::before');
  expect(filtered.styles).not.toContain('::after');
  expect(filtered.styles).not.toContain('rgb(21, 84, 147)');
  expect(filtered.styles).not.toContain('rgb(201, 211, 221)');
  expect(filtered.calls).toContain('element:color');
  expect(filtered.calls).toContain('::before:color');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.styleDropper.pageOptions = {
      pseudoElements: [],
      styleProperties: [],
    };
  });
  await capture(page);
  const empty = await page.evaluate(() => {
    const parsed = new DOMParser().parseFromString(
      window.styleSerialization,
      'image/svg+xml',
    );
    return {
      style:
        parsed.getElementById('options-sample')?.getAttribute('style') ?? '',
      styles: Array.from(
        parsed.querySelectorAll('style'),
        (style) => style.textContent,
      ).join('\n'),
    };
  });
  expect(empty.style).not.toMatch(/(?:^|;)\s*(?:color|background-color)\s*:/);
  expect(empty.styles).not.toMatch(/::(?:before|after)/);
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.styleDropper.pageOptions = null;
  });
  await capture(page);
  const reset = await page.evaluate(() => {
    const parsed = new DOMParser().parseFromString(
      window.styleSerialization,
      'image/svg+xml',
    );
    return {
      style:
        parsed.getElementById('options-sample')?.getAttribute('style') ?? '',
      styles: Array.from(
        parsed.querySelectorAll('style'),
        (style) => style.textContent,
      ).join('\n'),
      excluded: Boolean(parsed.getElementById('options-excluded')),
    };
  });
  expect(reset.style).toContain('rgb(17, 34, 51)');
  expect(reset.style).toContain('rgb(221, 231, 241)');
  expect(reset.styles).toContain('::before');
  expect(reset.styles).toContain('::after');
  expect(reset.excluded).toBe(true);
  await page.evaluate(() => {
    window.styleDropper.pageOptions = undefined;
  });
  await expect(
    page.locator('#style-dropper').locator('[part="snapshot"]'),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.styleDropper.picking)).toBe(false);
});

test('embeds images in pseudo styles and fonts by default with independent opt-outs', async ({
  page,
}) => {
  const origin = 'http://page-resources.example.test';
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 8;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(27,111,173)';
    context.fillRect(0, 0, 8, 8);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  const font = fileURLToPath(
    new URL('./fixtures/fonts/Ahem.ttf', import.meta.url),
  );
  await page.route(`${origin}/**`, async (route) => {
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (new URL(route.request().url()).pathname.endsWith('.ttf'))
      await route.fulfill({ path: font, contentType: 'font/ttf', headers });
    else
      await route.fulfill({
        body: Buffer.from(image, 'base64'),
        contentType: 'image/png',
        headers,
      });
  });
  await page.evaluate(async (origin) => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {font-family:SnapshotResourceFont;src:url("${origin}/Ahem.ttf") format("truetype")}
      #resource-pseudo::before {content:"";display:block;width:72px;height:48px;background-image:url("${origin}/pixel(blue).png")}
    `;
    const pseudo = document.createElement('div');
    pseudo.id = 'resource-pseudo';
    pseudo.style.cssText =
      'position:absolute;left:120px;top:120px;width:72px;height:48px';
    const background = document.createElement('div');
    background.id = 'resource-background';
    background.style.cssText = `position:absolute;left:240px;top:120px;width:72px;height:48px;background-image:url("${origin}/pixel(blue).png")`;
    const text = document.createElement('div');
    text.id = 'resource-font';
    text.textContent = 'XXXX';
    text.style.cssText =
      'position:absolute;left:120px;top:220px;width:200px;height:60px;font:28px/40px SnapshotResourceFont,serif;color:rgb(141,42,97);font-synthesis:none';
    const image = document.createElement('img');
    image.id = 'resource-image';
    image.src = `${origin}/pixel(blue).png`;
    image.style.cssText =
      'position:absolute;left:360px;top:120px;width:72px;height:48px';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'resource-svg-image';
    svg.setAttribute('viewBox', '0 0 72 48');
    svg.style.cssText =
      'position:absolute;left:480px;top:120px;width:72px;height:48px';
    const svgImage = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'image',
    );
    svgImage.setAttribute('href', `${origin}/pixel(blue).png`);
    svgImage.setAttribute('width', '72');
    svgImage.setAttribute('height', '48');
    svgImage.setAttribute('preserveAspectRatio', 'none');
    svg.append(svgImage);
    document.head.append(style);
    document.body.append(pseudo, background, text, image, svg);
    const bitmap = new Image();
    bitmap.src = `${origin}/pixel(blue).png`;
    await Promise.all([
      bitmap.decode(),
      image.decode(),
      document.fonts.load('28px SnapshotResourceFont', 'XXXX'),
    ]);
    await document.fonts.ready;
  }, origin);
  const samples = [
    { id: 'resource-pseudo', colors: [[27, 111, 173]] },
    { id: 'resource-background', colors: [[27, 111, 173]] },
    { id: 'resource-font', colors: [[141, 42, 97]] },
    { id: 'resource-image', colors: [[27, 111, 173]] },
    { id: 'resource-svg-image', colors: [[27, 111, 173]] },
  ];
  const baseline = await pixelCoverage(
    page,
    samples,
    (await page.screenshot({ scale: 'device' })).toString('base64'),
  );
  await capture(page);
  expectMatchingCoverage(baseline, await pixelCoverage(page, samples));
  const defaults = await page.evaluate(() => window.styleSerialization);
  expect(defaults).toContain('data:image/png;base64,');
  expect(defaults).toContain('@font-face');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.styleDropper.pageOptions = { inlineImages: false };
  });
  await capture(page);
  const withoutImages = await page.evaluate(() => window.styleSerialization);
  expect(withoutImages).not.toContain('data:image/png;base64,');
  expect(withoutImages).toContain(`${origin}/pixel(blue).png`);
  expect(withoutImages).toContain('@font-face');
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.styleDropper.pageOptions = { embedFonts: false };
  });
  await capture(page);
  const withoutFonts = await page.evaluate(() => window.styleSerialization);
  expect(withoutFonts).toContain('data:image/png;base64,');
  expect(withoutFonts).not.toContain('@font-face');
});

test('retains dark browser placeholder colors and file-selector-button styling', async ({
  page,
}) => {
  const samples = await page.evaluate(() => {
    document.documentElement.style.colorScheme = 'dark';
    const input = document.createElement('input');
    input.id = 'dark-browser-placeholder';
    input.placeholder = 'Browser theme placeholder';
    input.style.cssText =
      'position:absolute;left:120px;top:120px;width:420px;height:60px;box-sizing:border-box;padding:8px;border:0;font:bold 24px Arial';
    const file = document.createElement('input');
    file.id = 'file-selector-style';
    file.type = 'file';
    file.style.cssText =
      'position:absolute;left:120px;top:220px;width:500px;height:64px;font:24px Arial';
    const style = document.createElement('style');
    style.textContent =
      '#file-selector-style::file-selector-button {appearance:none;border:2px solid rgb(134,51,79);border-radius:0;padding:8px;color:rgb(18,104,62);background:rgb(222,235,244);font:bold 24px Arial}';
    document.head.append(style);
    document.body.append(input, file);
    const placeholder = getComputedStyle(input, '::placeholder');
    const color = placeholder.color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number);
    const background = getComputedStyle(input)
      .backgroundColor.match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number);
    const opacity = Number(placeholder.opacity);
    return [
      {
        id: input.id,
        inset: 3,
        colors: [
          color.map((channel, index) =>
            Math.round(channel * opacity + background[index]! * (1 - opacity)),
          ),
        ],
      },
      {
        id: file.id,
        colors: [
          [18, 104, 62],
          [222, 235, 244],
          [134, 51, 79],
        ],
      },
    ];
  });
  const baseline = await pixelCoverage(
    page,
    samples,
    (await page.screenshot({ scale: 'device' })).toString('base64'),
  );
  await capture(page);
  expectMatchingCoverage(baseline, await pixelCoverage(page, samples));
});
