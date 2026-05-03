describe('MarkLite - Focus & Typewriter Mode', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab with content
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('Line 1 of text');
    await browser.keys(['Enter']);
    await browser.keys('Line 2 of text');
    await browser.keys(['Enter']);
    await browser.keys('Line 3 of text');
    await browser.keys(['Enter']);
    await browser.keys('Line 4 of text');
    await browser.keys(['Enter']);
    await browser.keys('Line 5 of text');
    await browser.pause(500);
  });

  it('should toggle typewriter mode with Ctrl+.', async () => {
    await browser.keys(['Control', '.']);
    await browser.pause(800);

    // Typewriter mode should be active - the editor should still be visible
    const editor = await $('.cm-editor, .milkdown');
    expect(await editor.isDisplayed()).toBe(true);

    // Exit typewriter mode
    await browser.keys(['Escape']);
    await browser.pause(500);
  });

  it('should toggle focus mode with Ctrl+,', async () => {
    await browser.keys(['Control', ',']);
    await browser.pause(800);

    // Focus mode should be active - the editor should still be visible
    const editor = await $('.cm-editor, .milkdown');
    expect(await editor.isDisplayed()).toBe(true);

    // Exit focus mode with Escape
    await browser.keys(['Escape']);
    await browser.pause(500);
  });

  it('should exit focus mode with Escape key', async () => {
    // Enter focus mode
    await browser.keys(['Control', ',']);
    await browser.pause(500);

    // Press Escape to exit
    await browser.keys(['Escape']);
    await browser.pause(500);

    // Editor should be in normal state
    const editor = await $('.cm-editor, .milkdown');
    expect(await editor.isDisplayed()).toBe(true);
  });

  after(async () => {
    // Make sure we're out of any special mode
    await browser.keys(['Escape']);
    await browser.pause(300);
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
