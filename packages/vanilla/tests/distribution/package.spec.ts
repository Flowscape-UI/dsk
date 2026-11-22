import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

for (const format of ['esm', 'iife']) {
  test(`${format} runs directly in a browser with its bundled assets`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://dsk.test/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') {
        await route.fulfill({
          contentType: 'text/html',
          body: `<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body class="dsk-theme">
            <dsk-input value="10" aria-label="Width"></dsk-input>
            <dsk-panel style="width:200px;height:100px" min-size="150" max-size="250">Inspector</dsk-panel>
            <dsk-transform-box x="12" y="20"><span>Transform me</span></dsk-transform-box>
            <dsk-color-eyedropper mode="page"></dsk-color-eyedropper>
            <script ${format === 'esm' ? 'type="module"' : ''} src="/${format === 'esm' ? 'index.js' : 'dsk.global.js'}"></script>
          </body></html>`,
        });
        return;
      }
      if (!/^\/[\w.-]+\.(?:js|css)$/.test(path)) {
        await route.abort();
        return;
      }
      await route.fulfill({
        contentType: path.endsWith('.css') ? 'text/css' : 'text/javascript',
        body: await readFile(
          fileURLToPath(new URL(`../../dist${path}`, import.meta.url)),
        ),
      });
    });
    await page.goto('http://dsk.test/');
    const input = page.locator('dsk-input input');
    await expect(input).toHaveValue('10');
    const tags = [
      'dsk-dock',
      'dsk-dock-zone',
      'dsk-dock-item',
      'dsk-input',
      'dsk-input-group',
      'dsk-input-hex',
      'dsk-input-color',
      'dsk-input-upload',
      'dsk-color-area',
      'dsk-color-hue',
      'dsk-color-alpha',
      'dsk-color-eyedropper',
      'dsk-angle',
      'dsk-curve',
      'dsk-layer-tree',
      'dsk-list-value',
      'dsk-list-header',
      'dsk-list-footer',
      'dsk-tree-search',
      'dsk-pan-zoom',
      'dsk-ruler',
      'dsk-canvas-marker',
      'dsk-panel',
      'dsk-transform-box',
      'dsk-transform-header',
      'dsk-transform-content',
      'dsk-transform-box-handle-rotate',
      'dsk-transform-box-handle-resize',
      'dsk-timeline',
    ];
    expect(
      await page.evaluate(
        (names) => names.filter((name) => !customElements.get(name)),
        tags,
      ),
    ).toEqual([]);
    const panel = page.locator('dsk-panel');
    await panel.locator('[part=handle]').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(panel).toHaveCSS('width', '210px');
    await page.keyboard.press('Control+z');
    await expect(panel).toHaveCSS('width', '200px');
    const transform = page.locator('dsk-transform-box');
    await transform.focus();
    await page.keyboard.press('ArrowRight');
    await expect(transform).toHaveJSProperty('x', 13);
    await input.fill('32');
    await input.press('Enter');
    await expect(page.locator('dsk-input')).toHaveJSProperty('value', '32');
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(240, 241, 243)');
    if (format === 'iife')
      expect(await page.evaluate(() => Reflect.has(window, 'DSK'))).toBe(true);
    // Exercise the page renderer as well as the initial entry chunk.
    await page.locator('dsk-color-eyedropper button').click();
    await expect(page.locator('dsk-color-eyedropper')).toHaveJSProperty(
      'picking',
      true,
    );
    await expect(
      page.locator('dsk-color-eyedropper [part="overlay"]'),
    ).toHaveCount(1, { timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('dsk-color-eyedropper')).toHaveJSProperty(
      'picking',
      false,
    );
    expect(errors).toEqual([]);
  });
}
