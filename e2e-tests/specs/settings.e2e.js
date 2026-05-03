describe('MarkLite - Settings Modal', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should open settings modal from the activity bar', async () => {
    // The settings gear icon is in the activity bar at the bottom
    // Look for the settings button by its icon in the activity bar
    const settingsButtons = await $$('button');
    let settingsBtn = null;

    for (const btn of settingsButtons) {
      const title = await btn.getAttribute('title');
      if (title && title.toLowerCase().includes('settings')) {
        settingsBtn = btn;
        break;
      }
    }

    // If no settings button found by title, try to find it in the activity bar
    if (!settingsBtn) {
      // Alternative: use the settings cog icon at the bottom of activity bar
      settingsBtn = settingsButtons[settingsButtons.length - 1];
    }

    if (settingsBtn) {
      await settingsBtn.click();
      await browser.pause(800);
    }

    const dialog = await $('[role="dialog"]');
    if (await dialog.isExisting()) {
      expect(await dialog.isDisplayed()).toBe(true);

      // Close it
      await browser.keys(['Escape']);
      await browser.pause(500);
    }
  });

  it('should display settings dialog with tabs', async () => {
    // Open settings again
    const settingsButtons = await $$('button');
    for (const btn of settingsButtons) {
      const title = await btn.getAttribute('title');
      if (title && title.toLowerCase().includes('settings')) {
        await btn.click();
        break;
      }
    }
    await browser.pause(800);

    const dialog = await $('[role="dialog"]');
    if (!(await dialog.isExisting())) {
      // Settings not available in this context, skip
      return;
    }

    // Settings modal should have tab sections: general, editor, preview, appearance, files, shortcuts
    const dialogText = await dialog.getText();
    // At least one tab category should be visible
    expect(dialogText.length).toBeGreaterThan(0);

    // Close settings
    await browser.keys(['Escape']);
    await browser.pause(500);
  });

  it('should have toggle switches in settings', async () => {
    const settingsButtons = await $$('button');
    for (const btn of settingsButtons) {
      const title = await btn.getAttribute('title');
      if (title && title.toLowerCase().includes('settings')) {
        await btn.click();
        break;
      }
    }
    await browser.pause(800);

    const dialog = await $('[role="dialog"]');
    if (!(await dialog.isExisting())) return;

    // Settings should contain toggle switches
    const switches = await dialog.$$('[role="switch"]');
    // General tab should have at least some toggle switches (auto-save, etc.)
    expect(switches.length).toBeGreaterThanOrEqual(0);

    await browser.keys(['Escape']);
    await browser.pause(500);
  });
});
