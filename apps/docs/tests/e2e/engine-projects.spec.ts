import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const engines = ['excalidraw', 'reactflow', 'three', 'konva', 'fabric'];
for (const prefix of ['', '/ru']) {
  for (const engine of engines) {
    test(`${engine} starts automatically and provides its project (${prefix || 'en'})`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.goto(`${prefix}/examples/${engine}`);
      const loader = page.locator(
        `.dsk-engine-loader[data-engine="${engine}"]`,
      );
      await expect(loader).toHaveAttribute('aria-busy', 'false', {
        timeout: 60_000,
      });
      await expect(loader.locator('.dsk-engine-example')).toHaveAttribute(
        'data-ready',
        'true',
      );
      await expect(loader.locator('.dsk-engine-loading')).toHaveCount(0);
      await expect(loader.locator('.dsk-engine-error')).toHaveCount(0);
      const sidebar = page.locator('.VPSidebar');
      const exampleLinks = sidebar.locator(`a[href^="${prefix}/examples/"]`);
      expect(
        await exampleLinks.evaluateAll((links) =>
          links.map((link) => link.getAttribute('href')?.split('/').pop()),
        ),
      ).toEqual(['tldraw', ...engines]);
      for (const icon of await exampleLinks.locator('img').all()) {
        await expect
          .poll(() =>
            icon.evaluate(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      const project = page.locator('.dsk-project');
      await expect(project).toHaveAttribute('data-ready', 'true');
      await project
        .locator(`button[title="src/${engine}/mount-example.ts"]`)
        .click();
      await expect(project.locator('.dsk-project-code')).toContainText(
        'createExampleShell',
      );
      await project.locator('button[title="package.json"]').click();
      await expect(project.locator('.dsk-project-code')).toContainText(
        'file:./vendor/flowscape-ui-dsk.tgz',
      );
      const downloadEvent = page.waitForEvent('download');
      await project.locator('.dsk-project-download').click();
      const download = await downloadEvent;
      expect(download.suggestedFilename()).toBe(`dsk-${engine}-example.zip`);
      const path = await download.path();
      if (!path) throw new Error('Missing project archive');
      const bytes = await readFile(path);
      expect(bytes.subarray(0, 4)).toEqual(
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      );
      expect(bytes.length).toBeGreaterThan(100_000);
    });
  }
}

test('the automatic loader stays visible until the engine chunk arrives', async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/mount-example-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/examples/konva', { waitUntil: 'domcontentloaded' });
    const loader = page.locator('.dsk-engine-loader');
    await expect(loader.locator('[role="status"]')).toBeVisible();
    await expect(loader).toHaveAttribute('aria-busy', 'true');
    release?.();
    await expect(loader).toHaveAttribute('aria-busy', 'false', {
      timeout: 60_000,
    });
    await expect(loader.locator('.dsk-engine-example')).toHaveAttribute(
      'data-ready',
      'true',
    );
  } finally {
    release?.();
  }
});
