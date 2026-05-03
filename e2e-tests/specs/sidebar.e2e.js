describe('MarkLite - Sidebar & Activity Bar', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should toggle plugins panel with Alt+5', async () => {
    await browser.keys(['Alt', '5']);
    await browser.pause(1000);

    // Plugin panel should appear in the sidebar
    await browser.waitUntil(
      async () => {
        // Check for elements that are characteristic of the plugin panel
        const pluginPanelElements = await $$('.sidebar-resize-handle');
        return pluginPanelElements.length > 0;
      },
      { timeout: 5000, timeoutMsg: 'Sidebar did not appear after Alt+5' }
    );

    // Close it
    await browser.keys(['Alt', '5']);
    await browser.pause(500);
  });

  it('should toggle TOC panel with Alt+2', async () => {
    // First need an open document
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('# Heading 1');
    await browser.keys(['Enter']);
    await browser.keys('## Heading 2');
    await browser.keys(['Enter']);
    await browser.keys('### Heading 3');
    await browser.pause(500);

    await browser.keys(['Alt', '2']);
    await browser.pause(1000);

    // TOC sidebar should appear with headings
    const sidebar = await $$('.sidebar-resize-handle');
    expect(sidebar.length).toBeGreaterThan(0);

    // Close the TOC panel
    await browser.keys(['Alt', '2']);
    await browser.pause(500);
  });

  it('should toggle file tree panel with Alt+1', async () => {
    await browser.keys(['Alt', '1']);
    await browser.pause(1000);

    const sidebar = await $$('.sidebar-resize-handle');
    expect(sidebar.length).toBeGreaterThan(0);

    // Close it
    await browser.keys(['Alt', '1']);
    await browser.pause(500);
  });

  it('should toggle search panel with Alt+3', async () => {
    await browser.keys(['Alt', '3']);
    await browser.pause(1000);

    const sidebar = await $$('.sidebar-resize-handle');
    expect(sidebar.length).toBeGreaterThan(0);

    // Close it
    await browser.keys(['Alt', '3']);
    await browser.pause(500);
  });

  after(async () => {
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
