describe('MarkLite - Search & Replace', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab with searchable content
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('Hello world');
    await browser.keys(['Enter']);
    await browser.keys('The quick brown fox jumps over the lazy dog.');
    await browser.keys(['Enter']);
    await browser.keys('Hello again, hello world!');
    await browser.pause(500);
  });

  it('should open search panel with Ctrl+F', async () => {
    await browser.keys(['Control', 'f']);
    await browser.pause(800);

    // CodeMirror uses its own search panel (.cm-search) or the app uses a custom panel
    await browser.waitUntil(
      async () => {
        // Check for either CodeMirror native search or the app's custom search
        const cmSearch = await $('.cm-search');
        const appSearch = await $('input[placeholder]');
        return (await cmSearch.isExisting()) || (await appSearch.isExisting());
      },
      { timeout: 5000, timeoutMsg: 'Search panel did not appear' }
    );
  });

  it('should close search with Escape', async () => {
    await browser.keys(['Escape']);
    await browser.pause(500);
  });

  after(async () => {
    await browser.keys(['Escape']);
    await browser.pause(300);
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
