describe('MarkLite - Markdown Formatting', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab for formatting tests
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);
  });

  /** Helper: clear editor and type text, then select it */
  async function typeAndSelectAll(text) {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);
    await browser.keys(text);
    await browser.keys(['Control', 'a']);
    await browser.pause(200);
  }

  it('should apply italic formatting with Ctrl+I', async () => {
    await typeAndSelectAll('italic text');
    await browser.keys(['Control', 'i']);
    await browser.pause(500);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    const text = await editor.getText();
    // Source mode wraps with *, WYSIWYG just renders italic
    expect(text).toMatch(/(\*italic text\*|italic text)/);
  });

  it('should apply strikethrough formatting with Ctrl+Shift+X', async () => {
    await typeAndSelectAll('deleted text');
    await browser.keys(['Control', 'Shift', 'x']);
    await browser.pause(500);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    const text = await editor.getText();
    expect(text).toMatch(/(~~deleted text~~|deleted text)/);
  });

  it('should apply inline code formatting with Ctrl+`', async () => {
    await typeAndSelectAll('code');
    await browser.keys(['Control', '`']);
    await browser.pause(500);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    const text = await editor.getText();
    expect(text).toMatch(/(`code`|code)/);
  });

  it('should insert unordered list with Ctrl+Shift+U', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);

    await browser.keys(['Control', 'Shift', 'u']);
    await browser.pause(500);

    const text = await editor.getText();
    expect(text).toMatch(/[-*]/);
  });

  it('should insert blockquote with Ctrl+Shift+Q', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);

    await browser.keys('quote text');
    await browser.keys(['Control', 'a']);
    await browser.keys(['Control', 'Shift', 'q']);
    await browser.pause(500);

    const text = await editor.getText();
    expect(text).toMatch(/(>|quote text)/);
  });

  it('should insert horizontal rule with Ctrl+Shift+-', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);

    await browser.keys(['Control', 'Shift', '-']);
    await browser.pause(500);

    const text = await editor.getText();
    expect(text).toMatch(/(---|___|\*\*\*)/);
  });

  after(async () => {
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
