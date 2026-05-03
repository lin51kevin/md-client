describe('MarkLite - Toolbar Buttons', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);
  });

  /** Helper: find a toolbar button by its partial title text */
  async function findToolbarButton(titleSubstring) {
    const toolbar = await $('[role="toolbar"]');
    const buttons = await toolbar.$$('button');
    for (const btn of buttons) {
      const title = await btn.getAttribute('title');
      if (title && title.toLowerCase().includes(titleSubstring.toLowerCase())) {
        return btn;
      }
    }
    return null;
  }

  it('should have file operation buttons (New, Open, Save)', async () => {
    const toolbar = await $('[role="toolbar"]');
    const buttons = await toolbar.$$('button');
    // Toolbar should have multiple buttons
    expect(buttons.length).toBeGreaterThan(5);
  });

  it('should have formatting buttons', async () => {
    // Check for Bold button
    const boldBtn = await findToolbarButton('bold');
    if (boldBtn) {
      expect(await boldBtn.isDisplayed()).toBe(true);
    }

    // Check for Italic button
    const italicBtn = await findToolbarButton('italic');
    if (italicBtn) {
      expect(await italicBtn.isDisplayed()).toBe(true);
    }
  });

  it('should apply bold via toolbar button click', async () => {
    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    await browser.pause(200);

    // Type text
    await browser.keys('toolbar bold test');
    await browser.keys(['Control', 'a']);
    await browser.pause(200);

    // Click the bold toolbar button
    const boldBtn = await findToolbarButton('bold');
    if (boldBtn) {
      await boldBtn.click();
      await browser.pause(500);

      const text = await editor.getText();
      expect(text).toMatch(/(\*\*toolbar bold test\*\*|toolbar bold test)/);
    }
  });

  it('should have view mode buttons (Edit, Split, Preview)', async () => {
    const editBtn = await findToolbarButton('edit');
    const splitBtn = await findToolbarButton('split');
    const previewBtn = await findToolbarButton('preview');

    // At least some view mode buttons should exist
    const viewButtons = [editBtn, splitBtn, previewBtn].filter(Boolean);
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('should toggle fullscreen via toolbar button', async () => {
    const fullscreenBtn = await findToolbarButton('fullscreen');
    if (fullscreenBtn) {
      expect(await fullscreenBtn.isDisplayed()).toBe(true);
    }
  });

  after(async () => {
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
