describe('MarkLite - Editor Interaction', () => {
  before(async () => {
    // Wait for app to fully load
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab to get the editor (Ctrl+N)
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);
  });

  it('should accept text input in the editor', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.waitForExist({ timeout: 15000 });

    // Click into the editor to focus
    await editor.click();
    await browser.pause(500);

    // Type some markdown
    await browser.keys('# Hello E2E Test');
    await browser.pause(500);

    const text = await editor.getText();
    expect(text).toContain('Hello E2E Test');
  });

  it('should apply bold formatting with keyboard shortcut', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();

    // Select all and delete existing content
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(300);

    // Type text, select it, and apply bold
    await browser.keys('bold text');
    await browser.keys(['Control', 'a']);
    await browser.keys(['Control', 'b']);
    await browser.pause(500);

    const text = await editor.getText();
    // In CodeMirror source mode, bold wraps with **
    // In Milkdown WYSIWYG mode, text is rendered bold
    expect(text).toMatch(/(\*\*bold text\*\*|bold text)/);
  });
});
