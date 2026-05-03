describe('MarkLite - Tab Management', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should create a new tab with Ctrl+N', async () => {
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const tabs = await $$('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(1);
  });

  it('should show the editor when a tab is open', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.waitForExist({ timeout: 10000 });
    expect(await editor.isDisplayed()).toBe(true);
  });

  it('should create multiple tabs', async () => {
    const initialTabs = await $$('[role="tab"]');
    const initialCount = initialTabs.length;

    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const newTabs = await $$('[role="tab"]');
    expect(newTabs.length).toBe(initialCount + 1);
  });

  it('should switch between tabs with Ctrl+Tab', async () => {
    // Ensure we have at least 2 tabs
    const tabs = await $$('[role="tab"]');
    if (tabs.length < 2) {
      await browser.keys(['Control', 'n']);
      await browser.pause(1000);
    }

    // Type distinctive text in the current tab
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.keys('Tab B content');
    await browser.pause(500);

    // Switch to previous tab
    await browser.keys(['Control', 'Shift', 'Tab']);
    await browser.pause(1000);

    // Switch back
    await browser.keys(['Control', 'Tab']);
    await browser.pause(1000);

    const text = await editor.getText();
    expect(text).toContain('Tab B content');
  });

  it('should close a tab with Ctrl+W', async () => {
    const tabsBefore = await $$('[role="tab"]');
    const countBefore = tabsBefore.length;

    if (countBefore === 0) {
      await browser.keys(['Control', 'n']);
      await browser.pause(1000);
    }

    await browser.keys(['Control', 'w']);
    await browser.pause(1000);

    const tabsAfter = await $$('[role="tab"]');
    const expected = countBefore === 0 ? 0 : countBefore - 1;
    expect(tabsAfter.length).toBe(expected);
  });

  it('should show the tablist container', async () => {
    const tablist = await $('[role="tablist"]');
    await tablist.waitForExist({ timeout: 5000 });
    expect(await tablist.isDisplayed()).toBe(true);
  });
});
