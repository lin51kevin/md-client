describe('MarkLite - Status Bar', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  it('should display the status bar', async () => {
    const statusBar = await $('[role="status"]');
    await statusBar.waitForExist({ timeout: 5000 });
    expect(await statusBar.isDisplayed()).toBe(true);
  });

  it('should show word count information', async () => {
    // Open a new tab and type content
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('Hello world from the E2E test');
    await browser.pause(1000);

    const statusBar = await $('[role="status"]');
    const statusText = await statusBar.getText();
    // Status bar should contain word count
    expect(statusText).toBeTruthy();
  });

  it('should show line and column position', async () => {
    const statusBar = await $('[role="status"]');
    const statusText = await statusBar.getText();
    // Status bar typically shows line:col format
    expect(statusText).toMatch(/\d+/);
  });

  it('should show dirty indicator when content is modified', async () => {
    // Type something to make the document dirty
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(' extra text');
    await browser.pause(500);

    const statusBar = await $('[role="status"]');
    const statusHTML = await statusBar.getHTML();
    // The dirty indicator is a ● character
    expect(statusHTML).toContain('●');
  });

  after(async () => {
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
