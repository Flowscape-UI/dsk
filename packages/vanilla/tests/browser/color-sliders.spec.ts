import { expect, test } from '@playwright/test';
import type { DskColorHue, DskColorAlpha } from '@flowscape-ui/dsk';

type Slider = DskColorHue | DskColorAlpha;
declare global {
  interface Window {
    testSlider: Slider;
    sliderEvents: string[];
    sliderCommits: number;
  }
}

for (const [tag, maximum, label] of [
  ['dsk-color-hue', 360, 'Hue'],
  ['dsk-color-alpha', 100, 'Opacity'],
] as const) {
  test.describe(tag, () => {
    test.use({ deviceScaleFactor: 1.25, hasTouch: true });
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(async (tag) => {
        await customElements.whenDefined(tag);
        const slider = document.createElement(tag);
        slider.id = 'slider-under-test';
        slider.style.cssText =
          'position:fixed;left:20.375px;top:20.25px;z-index:1000';
        document.body.append(slider);
        window.testSlider = slider;
        window.sliderEvents = [];
        window.sliderCommits = 0;
        slider.setAttribute('onchange', 'window.sliderCommits++');
        for (const type of ['input', 'change']) {
          slider.addEventListener(type, (event) => {
            if (event.target !== slider || !event.bubbles || !event.composed)
              throw new Error(
                'Events must originate from the slider and bubble.',
              );
            window.sliderEvents.push(type);
          });
        }
      }, tag);
    });

    test('pointer capture, endpoints, stable marker and single commit', async ({
      page,
    }) => {
      await page.evaluate(() => {
        if ('alpha' in window.testSlider) window.testSlider.alpha = 0;
      });
      const control = page.locator('#slider-under-test');
      const box = await control.boundingBox();
      if (!box) throw new Error('Missing slider');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const value = await control.evaluate((slider: Slider) =>
        'hue' in slider ? slider.hue : slider.alpha,
      );
      expect(value).toBeCloseTo(maximum / 2, 2);
      for (let offset = 0; offset < 5; offset++) {
        await page.mouse.move(box.x + 60 + offset, box.y + box.height / 2);
        const marker = await control
          .locator('[part="marker"]')
          .evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const track = element.parentElement?.getBoundingClientRect();
            if (!track) throw new Error('Missing track');
            return {
              width: rect.width,
              height: rect.height,
              center: (rect.x + rect.width / 2) * devicePixelRatio,
              verticalOffset:
                rect.y + rect.height / 2 - track.y - track.height / 2,
            };
          });
        expect(marker.width).toBeCloseTo(14, 4);
        expect(marker.height).toBeCloseTo(14, 4);
        expect(marker.verticalOffset).toBeCloseTo(0, 4);
        expect(marker.center).toBeCloseTo(Math.round(marker.center), 2);
      }
      await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2);
      await expect(control.getByRole('slider', { name: label })).toHaveValue(
        String(maximum),
      );
      expect(await page.evaluate(() => window.sliderCommits)).toBe(0);
      await page.mouse.up();
      expect(await page.evaluate(() => window.sliderCommits)).toBe(1);
      const marker = await control.locator('[part="marker"]').boundingBox();
      if (!marker) throw new Error('Missing marker');
      expect(
        Math.abs(marker.x + marker.width - box.x - box.width),
      ).toBeLessThan(0.5);
      await page.mouse.click(box.x, box.y + box.height / 2);
      await expect(control.getByRole('slider', { name: label })).toHaveValue(
        '0',
      );
    });

    test('keyboard, readonly, disabled, cancellation and reconnect', async ({
      page,
    }) => {
      const control = page.locator('#slider-under-test');
      const input = control.getByRole('slider', { name: label });
      await page.evaluate(() => {
        window.testSlider.step = 0.5;
        window.testSlider.focus();
      });
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
      await expect(input).toHaveValue('0.5');
      await page.keyboard.press('Shift+ArrowRight');
      await expect(input).toHaveValue('5.5');
      await page.keyboard.press('End');
      await expect(input).toHaveValue(String(maximum));
      await page.evaluate(() => {
        window.testSlider.readOnly = true;
      });
      await page.keyboard.press('Home');
      await expect(input).toHaveValue(String(maximum));
      await page.evaluate(() => {
        window.testSlider.disabled = true;
      });
      await expect(input).toBeDisabled();
      await page.evaluate(() => {
        window.testSlider.disabled = false;
        window.testSlider.readOnly = false;
        window.sliderEvents = [];
      });
      const box = await control.boundingBox();
      if (!box) throw new Error('Missing slider');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(input).toHaveValue(String(maximum));
      expect(await page.evaluate(() => window.sliderEvents)).toEqual([
        'input',
        'input',
      ]);
      await page.evaluate(() => {
        window.testSlider.remove();
        document.body.append(window.testSlider);
        window.sliderEvents = [];
        window.testSlider.focus();
      });
      await page.keyboard.press('ArrowLeft');
      expect(await page.evaluate(() => window.sliderEvents)).toEqual([
        'input',
        'change',
      ]);
    });

    test('touch selection and active drag cleanup', async ({ page }) => {
      const control = page.locator('#slider-under-test');
      const box = await control.boundingBox();
      if (!box) throw new Error('Missing slider');
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      expect(await page.evaluate(() => window.sliderCommits)).toBe(1);
      await page.mouse.move(box.x + 40, box.y + box.height / 2);
      await page.mouse.down();
      await page.evaluate(() => {
        window.testSlider.disabled = true;
      });
      const stopped = await control.evaluate((slider: Slider) =>
        'hue' in slider ? slider.hue : slider.alpha,
      );
      await page.mouse.move(box.x + box.width + 40, box.y);
      await page.mouse.up();
      expect(
        await control.evaluate((slider: Slider) =>
          'hue' in slider ? slider.hue : slider.alpha,
        ),
      ).toBe(stopped);
      expect(await page.evaluate(() => window.sliderCommits)).toBe(1);
    });

    test('API updates are silent, styles and global attributes remain usable', async ({
      page,
    }) => {
      const control = page.locator('#slider-under-test');
      await page.evaluate(() => {
        const slider = window.testSlider;
        if ('hue' in slider) slider.hue = 720;
        else {
          slider.color = '#0af';
          slider.alpha = 150;
        }
        slider.width = 300;
        slider.height = 20;
        slider.title = 'Custom color slider';
        slider.className = 'custom-slider';
      });
      await expect(control).toHaveCSS('width', '300px');
      await expect(control).toHaveCSS('height', '20px');
      await expect(control).toHaveAttribute('title', 'Custom color slider');
      await expect(control).toHaveClass('custom-slider');
      await expect(control.getByRole('slider', { name: label })).toHaveValue(
        String(maximum),
      );
      expect(await page.evaluate(() => window.sliderEvents)).toEqual([]);
      await page.evaluate(() => {
        window.testSlider.hidden = true;
      });
      await expect(control).toBeHidden();
      await page.evaluate(() => {
        window.testSlider.hidden = false;
        window.testSlider.style.width = '180px';
      });
      await expect(control).toBeVisible();
      await expect(control).toHaveCSS('width', '180px');
    });
  });
}

test('hue endpoint stays red and alpha RGB updates preserve opacity', async ({
  page,
}) => {
  await page.goto('/');
  const values = await page.evaluate(() => {
    const hue = document.createElement('dsk-color-hue');
    const alpha = document.createElement('dsk-color-alpha');
    hue.hue = 360;
    alpha.color = '#0af';
    alpha.alpha = 50;
    const first = [hue.hue, hue.color, alpha.color, alpha.rgba];
    alpha.color = '00FF00';
    const next = [alpha.alpha, alpha.rgba];
    alpha.alpha = 0;
    return [first, next, alpha.rgba];
  });
  expect(values).toEqual([
    [360, '#FF0000', '#00AAFF', '#00AAFF80'],
    [50, '#00FF0080'],
    '#00FF0000',
  ]);
});

test('alpha marker uses its own checkerboard and selected opacity', async ({
  page,
}) => {
  await page.goto('/');
  const marker = page.locator('#alpha-demo [part="marker"]');
  for (const [alpha, expected] of [
    [0, 'rgba(0, 170, 255, 0)'],
    [50, 'rgba(0, 170, 255, 0.5)'],
    [100, 'rgb(0, 170, 255)'],
  ] as const) {
    await page
      .locator('#alpha-demo')
      .evaluate((slider: DskColorAlpha, alpha) => {
        slider.color = '#00AAFF';
        slider.alpha = alpha;
      }, alpha);
    await expect(marker).toHaveCSS('background-color', expected);
    const layers = await marker.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    );
    expect(layers).toContain('conic-gradient');
    expect(layers).toContain(expected);
    await expect(marker).toHaveCSS('border-top-color', 'rgb(255, 255, 255)');
  }
});

test('playground links hue, area and alpha without event feedback', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.locator('#slider-hue').fill('210');
  await page.locator('#slider-alpha').fill('50');
  await expect(page.locator('#linked-area')).toHaveAttribute('hue', '210');
  await expect(page.locator('#alpha-demo')).toHaveAttribute('alpha', '50');
  const alpha = page.locator('#alpha-demo');
  await expect(alpha.locator('[part="track"]')).toHaveCSS(
    'background-size',
    '100% 100%, 8px 8px',
  );
  await alpha.evaluate((slider: DskColorAlpha) => slider.focus());
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#slider-alpha')).toHaveValue('49');
  await expect(page.locator('#slider-count')).toHaveText('1');
  await page
    .locator('.slider-lab')
    .screenshot({ path: testInfo.outputPath('color-sliders.png') });
});
