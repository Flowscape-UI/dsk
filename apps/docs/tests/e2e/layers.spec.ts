import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`layer examples rename, reorder, search and preserve protected groups (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/layers`);
    await expect(page.locator('.dsk-layer-example')).toHaveCount(5);
    const demo = page.locator('.dsk-layer-example[data-kind=basic]');
    const cover = demo.locator('dsk-list-value[data-layer=pink]');
    await cover.locator('[part=row]').click();
    await expect(demo.locator('.layer-shape[data-layer=pink]')).toHaveClass(
      /is-selected/,
    );
    await demo.locator('.dsk-example-panel-controls > button').click();
    await cover.locator('[part=editor]').fill('New cover');
    await cover.locator('[part=editor]').press('Enter');
    await expect(demo.locator('.layer-shape[data-layer=pink]')).toHaveText(
      'New cover',
    );
    await page.keyboard.press('Alt+ArrowDown');
    await expect
      .poll(() =>
        demo
          .locator('.layer-shape')
          .evaluateAll((nodes) =>
            nodes.map((node) => (node as HTMLElement).dataset.layer),
          ),
      )
      .toEqual(['violet', 'pink']);
    const search = page.locator('.dsk-layer-example[data-kind=search]');
    const field = search.locator('dsk-tree-search input');
    await field.fill(prefix ? 'Заголовок' : 'Title');
    await expect(
      search.locator('dsk-list-value[data-layer=pink]'),
    ).toBeHidden();
    await expect(
      search.locator(
        `dsk-list-value[label="${prefix ? 'Заголовок' : 'Title'}"]`,
      ),
    ).toBeVisible();
    await expect(search.locator('.layer-shape')).toHaveCount(2);
    await field.fill('');
    await expect(
      search.locator('dsk-list-value[data-layer=pink]'),
    ).toBeVisible();
    const custom = page.locator('.dsk-layer-example[data-kind=custom]');
    const group = custom.locator('dsk-layer-tree > dsk-list-value');
    await group.evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('F2');
    await group.locator('[part=editor]').first().fill('Renamed frame');
    await page.keyboard.press('Enter');
    await expect(group.locator('[data-dsk-name]')).toHaveText('Renamed frame');
    await expect(group.locator('small')).toHaveText('Frame');
    const protectedGroup = page.locator(
      '.dsk-layer-example[data-kind=disabled] dsk-list-value[disabled]',
    );
    const child = protectedGroup.locator('dsk-list-value').first();
    await child.evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(protectedGroup.locator('dsk-list-value')).toHaveCount(2);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
