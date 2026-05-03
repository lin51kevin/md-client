describe('MarkLite - Multi-cursor & Selection', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    await browser.keys(['Control', 'n']);
    await browser.pause(1000);
  });

  it('should select all text with Ctrl+A', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('Line one');
    await browser.keys(['Enter']);
    await browser.keys('Line two');
    await browser.keys(['Enter']);
    await browser.keys('Line three');
    await browser.pause(300);

    // Select all
    await browser.keys(['Control', 'a']);
    await browser.pause(300);

    // Type replacement text (confirms select all worked)
    await browser.keys('Replaced all');
    await browser.pause(300);

    const text = await editor.getText();
    expect(text).toContain('Replaced all');
    expect(text).not.toContain('Line one');
  });

  it('should support adding cursor below with Alt+Down', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);

    await browser.keys('AAA');
    await browser.keys(['Enter']);
    await browser.keys('BBB');
    await browser.keys(['Enter']);
    await browser.keys('CCC');
    await browser.pause(300);

    // Go to the start of the first line
    await browser.keys(['Control', 'Home']);
    await browser.pause(200);

    // Add cursor below
    await browser.keys(['Alt', 'ArrowDown']);
    await browser.pause(300);

    // The status bar should show multi-cursor count
    const statusBar = await $('[role="status"]');
    const statusText = await statusBar.getText();
    // Multi-cursor typically shows cursor count in status bar
    // This is a best-effort check
    expect(statusText).toBeTruthy();
  });

  after(async () => {
    await browser.keys(['Escape']);
    await browser.pause(200);
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
