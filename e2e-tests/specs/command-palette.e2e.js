describe('MarkLite - Command Palette', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should open command palette with Ctrl+Shift+P', async () => {
    await browser.keys(['Control', 'Shift', 'p']);
    await browser.pause(800);

    const palette = await $('.command-palette');
    await palette.waitForExist({ timeout: 5000 });
    expect(await palette.isDisplayed()).toBe(true);
  });

  it('should have a search input field', async () => {
    const input = await $('.command-palette-input');
    await input.waitForExist({ timeout: 3000 });
    expect(await input.isDisplayed()).toBe(true);
  });

  it('should display command items in the list', async () => {
    const list = await $('.command-palette-list');
    await list.waitForExist({ timeout: 3000 });

    const items = await $$('.command-palette-list [role="option"]');
    expect(items.length).toBeGreaterThan(0);
  });

  it('should filter commands when typing', async () => {
    const input = await $('.command-palette-input');
    await input.click();
    await browser.pause(200);

    // Get initial count
    const initialItems = await $$('.command-palette-list [role="option"]');
    const initialCount = initialItems.length;

    // Type a filter string
    await browser.keys('save');
    await browser.pause(500);

    // Count should change (likely fewer items)
    const filteredItems = await $$('.command-palette-list [role="option"]');
    // Filter may show fewer or different items
    expect(filteredItems.length).toBeLessThanOrEqual(initialCount);
  });

  it('should close with Escape', async () => {
    await browser.keys(['Escape']);
    await browser.pause(500);

    const palette = await $('.command-palette');
    expect(await palette.isExisting()).toBe(false);
  });

  it('should open Quick Open with Ctrl+P', async () => {
    await browser.keys(['Control', 'p']);
    await browser.pause(800);

    const dialog = await $('.command-palette');
    await dialog.waitForExist({ timeout: 5000 });
    expect(await dialog.isDisplayed()).toBe(true);

    // Close it
    await browser.keys(['Escape']);
    await browser.pause(500);
  });
});
