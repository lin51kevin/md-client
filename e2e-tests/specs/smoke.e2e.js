describe('MarkLite - Smoke Test', () => {
  it('should display the toolbar', async () => {
    // Toolbar has role="toolbar" — wait for app to load
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
    expect(await toolbar.isDisplayed()).toBe(true);
  });

  it('should display the main content area', async () => {
    // Depending on state: editor (.cm-editor), welcome page (img alt="MarkLite"), or WYSIWYG (.ProseMirror)
    await browser.waitUntil(
      async () => {
        const el = await $$(
          '.cm-editor, .milkdown, .ProseMirror, img[alt="MarkLite"], [role="toolbar"] ~ div'
        );
        return el.length > 0;
      },
      { timeout: 15000, timeoutMsg: 'Main content area never appeared' }
    );
  });

  it('should display the activity bar', async () => {
    const activityBar = await $('[role="toolbar"] ~ div');
    await activityBar.waitForExist({ timeout: 5000 });
    expect(await activityBar.isDisplayed()).toBe(true);
  });

  it('should have the correct document title', async () => {
    // Wait for the app to set the title (may be async after init)
    await browser.waitUntil(
      async () => (await browser.getTitle()).includes('MarkLite'),
      { timeout: 10000, timeoutMsg: 'Title never set to MarkLite' }
    );
    const title = await browser.getTitle();
    expect(title).toMatch(/MarkLite/);
  });
});
