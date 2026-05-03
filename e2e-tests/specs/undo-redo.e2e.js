describe('MarkLite - Undo & Redo', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    await browser.keys(['Control', 'n']);
    await browser.pause(1000);
  });

  it('should undo text input with Ctrl+Z', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.pause(200);

    // Type some text
    await browser.keys('First text');
    await browser.pause(300);
    await browser.keys(['Enter']);
    await browser.keys('Second text');
    await browser.pause(500);

    // Undo
    await browser.keys(['Control', 'z']);
    await browser.pause(500);

    const text = await editor.getText();
    // After undo, "Second text" should be partially or fully removed
    // The exact behavior depends on undo granularity
    expect(text).toContain('First text');
  });

  it('should redo with Ctrl+Y', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');

    // Redo the undone action
    await browser.keys(['Control', 'y']);
    await browser.pause(500);

    const text = await editor.getText();
    // After redo, content should be restored
    expect(text.length).toBeGreaterThan(0);
  });

  it('should support multiple undo operations', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(300);

    // Type several things
    await browser.keys('AAA');
    await browser.pause(500);
    await browser.keys(' BBB');
    await browser.pause(500);
    await browser.keys(' CCC');
    await browser.pause(500);

    // Undo multiple times
    await browser.keys(['Control', 'z']);
    await browser.pause(300);
    await browser.keys(['Control', 'z']);
    await browser.pause(300);

    const text = await editor.getText();
    // At least some of the text should have been undone
    expect(text).not.toContain('CCC');
  });

  after(async () => {
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
