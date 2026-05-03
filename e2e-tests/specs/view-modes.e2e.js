describe('MarkLite - View Modes', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Ensure we have an editor tab open
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    // Type some markdown content for preview testing
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys('# Test Heading');
    await browser.keys(['Enter']);
    await browser.keys('Some **bold** paragraph text.');
    await browser.keys(['Enter']);
    await browser.keys(['Enter']);
    await browser.keys('- List item 1');
    await browser.keys(['Enter']);
    await browser.keys('- List item 2');
    await browser.pause(500);
  });

  it('should start in edit mode (Ctrl+1)', async () => {
    await browser.keys(['Control', '1']);
    await browser.pause(500);

    const editor = await $('.cm-editor, .milkdown');
    await editor.waitForExist({ timeout: 5000 });
    expect(await editor.isDisplayed()).toBe(true);
  });

  it('should switch to split mode (Ctrl+2)', async () => {
    await browser.keys(['Control', '2']);
    await browser.pause(1000);

    // In split mode, both editor and preview should be visible
    const editor = await $('.cm-editor, .milkdown');
    expect(await editor.isDisplayed()).toBe(true);

    const preview = await $('.markdown-preview');
    await preview.waitForExist({ timeout: 5000 });
    expect(await preview.isDisplayed()).toBe(true);
  });

  it('should render markdown content in preview', async () => {
    // Should still be in split mode
    const preview = await $('.markdown-preview');
    await preview.waitForExist({ timeout: 5000 });

    const previewText = await preview.getText();
    expect(previewText).toContain('Test Heading');
    expect(previewText).toContain('bold');
  });

  it('should switch to preview-only mode (Ctrl+3)', async () => {
    await browser.keys(['Control', '3']);
    await browser.pause(1000);

    const preview = await $('.markdown-preview');
    await preview.waitForExist({ timeout: 5000 });
    expect(await preview.isDisplayed()).toBe(true);
  });

  it('should switch to mindmap mode (Ctrl+4)', async () => {
    await browser.keys(['Control', '4']);
    await browser.pause(1500);

    await browser.waitUntil(
      async () => {
        const mindmap = await $('[data-testid="mindmap-view"]');
        return await mindmap.isExisting();
      },
      { timeout: 5000, timeoutMsg: 'Mindmap view did not appear' }
    );
  });

  it('should return to edit mode (Ctrl+1)', async () => {
    await browser.keys(['Control', '1']);
    await browser.pause(500);

    const editor = await $('.cm-editor, .milkdown');
    await editor.waitForExist({ timeout: 5000 });
    expect(await editor.isDisplayed()).toBe(true);
  });

  after(async () => {
    // Clean up: return to edit mode and close the tab
    await browser.keys(['Control', '1']);
    await browser.pause(300);
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
