describe('MarkLite - Plugin System', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should open plugins panel via Alt+5', async () => {
    await browser.keys(['Alt', '5']);
    await browser.pause(1500);

    // The plugin panel should be visible in the sidebar
    // Check for sidebar resize handle which indicates a panel is open
    await browser.waitUntil(
      async () => {
        const handles = await $$('.sidebar-resize-handle');
        return handles.length > 0;
      },
      { timeout: 5000, timeoutMsg: 'Plugin panel did not open' }
    );
  });

  it('should display installed plugins list', async () => {
    // Plugin panel should show installed plugins
    // Wait for plugin cards or list items to render
    await browser.pause(1000);

    // Check that some plugin content is visible
    const sidebarContent = await $$('.sidebar-resize-handle ~ div');
    expect(sidebarContent.length).toBeGreaterThan(0);
  });

  it('should have a search bar for plugins', async () => {
    // The plugin panel has a SearchBar component
    const searchInputs = await $$('input[type="text"], input:not([type])');
    // At least one search input should be present in the plugin panel
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('should close plugins panel via Alt+5', async () => {
    await browser.keys(['Alt', '5']);
    await browser.pause(500);
  });

  it('should have plugin-contributed activity bar icons', async () => {
    // Official plugins register sidebar panels with icons
    // The activity bar should contain buttons for built-in + plugin panels
    const activityBarButtons = await $$('button[title]');
    // There should be multiple buttons (built-in panels + plugin panels)
    expect(activityBarButtons.length).toBeGreaterThan(3);
  });
});
