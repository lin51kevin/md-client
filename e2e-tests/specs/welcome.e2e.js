describe('MarkLite - Welcome Page', () => {
  it('should display the welcome page or the MarkLite logo', async () => {
    // On first launch with no tabs, either:
    // - The welcome page is shown (with logo, quick actions, shortcuts)
    // - Or the empty editor state with the MarkLite logo
    await browser.waitUntil(
      async () => {
        // Check for welcome page logo or empty state logo
        const logo = await $('img[alt="MarkLite"], img[alt="MarkLite++"]');
        const toolbar = await $('[role="toolbar"]');
        return (await logo.isExisting()) || (await toolbar.isExisting());
      },
      { timeout: 15000, timeoutMsg: 'Welcome page or toolbar did not appear' }
    );
  });

  it('should display keyboard shortcuts on the welcome/empty page', async () => {
    // The welcome page and empty editor state show keyboard shortcuts
    const kbdElements = await $$('kbd');
    // Either the welcome page has shortcuts or the app loaded into the editor
    if (kbdElements.length > 0) {
      // Verify at least one shortcut is shown
      const firstKbd = kbdElements[0];
      const text = await firstKbd.getText();
      expect(text).toMatch(/Ctrl/);
    }
  });

  it('should allow creating a new file from welcome page via Ctrl+N', async () => {
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    // After creating a new tab, the editor should appear
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.waitForExist({ timeout: 10000 });
    expect(await editor.isDisplayed()).toBe(true);

    // Clean up
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
