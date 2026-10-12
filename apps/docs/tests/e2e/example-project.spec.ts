import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`project explorer displays the downloadable sources (${prefix || 'en'})`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${prefix}/examples/tldraw`);
    const project = page.locator('.dsk-project');
    await expect(project).toHaveAttribute('data-ready', 'true');
    await project.scrollIntoViewIfNeeded();
    await expect(project.locator('.dsk-project-tab')).toContainText('main.ts');
    await expect(project.locator('.dsk-project-code')).toContainText(
      'import.meta.hot.dispose',
    );
    await project.locator('button[title="src/bind-dsk.ts"]').focus();
    await page.keyboard.press('Enter');
    await expect(project.locator('.dsk-project-code')).toContainText(
      'editor.rotateShapesBy',
    );
    await expect(
      project.locator('button[title="src/bind-dsk.ts"]'),
    ).toHaveAttribute('aria-current', 'true');
    await project.locator('.dsk-project-tab button').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      'export function bindDsk(',
    );
    await project.locator('button[title="package.json"]').click();
    await expect(project.locator('.dsk-project-code')).toContainText(
      'file:./vendor/flowscape-ui-dsk.tgz',
    );
    const downloadEvent = page.waitForEvent('download');
    await project.locator('.dsk-project-download').click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('dsk-tldraw-example.zip');
    const path = await download.path();
    if (!path) throw new Error('Missing ZIP download');
    const archive = await readFile(path);
    expect(archive.subarray(0, 4)).toEqual(
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    );
    expect(archive.length).toBeGreaterThan(100_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await project.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await project.locator('button[title="src/main.ts"]').click();
    await expect(project.locator('.dsk-project-code')).toContainText(
      'mountExample',
    );
    await project.screenshot({
      path: test.info().outputPath('project-mobile.png'),
    });
  });
}
