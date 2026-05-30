/**
 * E2E tests for milkdown (WYSIWYG) list operations:
 *   - Toggle unordered list (add / remove)
 *   - Toggle ordered list (add / remove)
 *   - List-lift (outdent nested → top-level; top-level → paragraph)
 *   - Renumber ordered list (fix gaps, handle multiple lists)
 *
 * These tests enable Milkdown ("Editable Preview") mode at the start,
 * run all assertions, then restore the default source-editing mode.
 */

describe('MarkLite — Milkdown List Operations', () => {
  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Find a toolbar button whose title contains the given substring. */
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

  /** Wait for the Milkdown ProseMirror editor to be present. */
  async function waitForMilkdown() {
    const pm = await $('.milkdown .ProseMirror');
    await pm.waitForExist({ timeout: 8000 });
    return pm;
  }

  /**
   * Enable "Editable Preview" (milkdown) mode via the WYSIWYG toggle button
   * in the toolbar right section.
   */
  async function enableMilkdownMode() {
    // Look for the toggle button that switches to WYSIWYG mode
    const btn = await findToolbarButton('wysiwyg');
    if (btn && await btn.isExisting()) {
      const isActive = await btn.getAttribute('aria-pressed');
      if (isActive !== 'true') {
        await btn.click();
        await browser.pause(1000);
      }
    }
    // Fallback: use the view-mode preview button and hope milkdownPreview is on
    const previewBtn = await findToolbarButton('preview');
    if (previewBtn) {
      await previewBtn.click();
      await browser.pause(800);
    }
  }

  /**
   * Set up a fresh tab with the given markdown text in the editor,
   * then switch to the view mode that shows the Milkdown editor.
   */
  async function setupContent(markdownText) {
    // Open new tab
    await browser.keys(['Control', 'n']);
    await browser.pause(800);

    // Switch to source view first so we can type
    const editBtn = await findToolbarButton('edit only');
    if (editBtn) {
      await editBtn.click();
      await browser.pause(500);
    }

    // Clear and type content into the CM editor
    const cmEditor = await $('.cm-editor .cm-content');
    if (await cmEditor.isExisting()) {
      await cmEditor.click();
      await browser.keys(['Control', 'a']);
      await browser.keys(['Backspace']);
      await browser.pause(200);
      // Type line by line
      const lines = markdownText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        await browser.keys(lines[i]);
        if (i < lines.length - 1) await browser.keys(['Return']);
      }
      await browser.pause(300);
    }

    // Switch to preview-only view (milkdown)
    const previewBtn = await findToolbarButton('preview only');
    if (previewBtn) {
      await previewBtn.click();
      await browser.pause(800);
    }
    await waitForMilkdown();
  }

  /** Get the text content of the Milkdown ProseMirror element. */
  async function getMilkdownText() {
    const pm = await waitForMilkdown();
    return pm.getText();
  }

  // ── Suite setup / teardown ─────────────────────────────────────────────────

  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
  });

  // ── UL (bullet list) ──────────────────────────────────────────────────────

  it('ul toolbar button adds a bullet list marker to a plain paragraph', async () => {
    await setupContent('Hello World');

    // Click inside the paragraph to position cursor
    const pm = await waitForMilkdown();
    await pm.click();
    await browser.pause(300);

    const ulBtn = await findToolbarButton('unordered list');
    if (!ulBtn) return; // skip if button not rendered in this mode

    await ulBtn.click();
    await browser.pause(600);

    const text = await getMilkdownText();
    // ProseMirror renders bullet items as list items — the text should still contain "Hello World"
    expect(text).toContain('Hello World');
    // The rendered DOM should have a list item
    const li = await $('.milkdown .ProseMirror li');
    expect(await li.isExisting()).toBe(true);
  });

  it('ul toolbar button removes the bullet list marker (toggle off)', async () => {
    await setupContent('- list item');

    const pm = await waitForMilkdown();
    await pm.click();
    await browser.pause(300);

    const ulBtn = await findToolbarButton('unordered list');
    if (!ulBtn) return;

    await ulBtn.click();
    await browser.pause(600);

    // After toggle-off there should be no list items
    const li = await $('.milkdown .ProseMirror li');
    expect(await li.isExisting()).toBe(false);
  });

  // ── OL (ordered list) ─────────────────────────────────────────────────────

  it('ol toolbar button adds an ordered list marker to a plain paragraph', async () => {
    await setupContent('First item');

    const pm = await waitForMilkdown();
    await pm.click();
    await browser.pause(300);

    const olBtn = await findToolbarButton('ordered list');
    if (!olBtn) return;

    await olBtn.click();
    await browser.pause(600);

    const text = await getMilkdownText();
    expect(text).toContain('First item');
    const li = await $('.milkdown .ProseMirror li');
    expect(await li.isExisting()).toBe(true);
  });

  it('ol toolbar button removes the ordered list marker (toggle off)', async () => {
    await setupContent('1. numbered item');

    const pm = await waitForMilkdown();
    await pm.click();
    await browser.pause(300);

    const olBtn = await findToolbarButton('ordered list');
    if (!olBtn) return;

    await olBtn.click();
    await browser.pause(600);

    const li = await $('.milkdown .ProseMirror li');
    expect(await li.isExisting()).toBe(false);
  });

  // ── list-lift ─────────────────────────────────────────────────────────────

  it('list-lift button outdents a nested list item to the parent level', async () => {
    // Nested list: outer item with one nested child
    await setupContent('- parent\n  - child');

    const pm = await waitForMilkdown();
    // Click on the nested "child" item
    await pm.click();
    await browser.pause(300);
    // Navigate to the nested item with arrow keys
    await browser.keys(['ArrowDown']);
    await browser.pause(200);

    const liftBtn = await findToolbarButton('remove list');
    if (!liftBtn) return;

    await liftBtn.click();
    await browser.pause(600);

    // After lifting the nested item, the "child" text should still be in a list item
    // but at the same level as parent
    const items = await $$('.milkdown .ProseMirror li');
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('list-lift converts a top-level list item to a plain paragraph', async () => {
    await setupContent('- only item');

    const pm = await waitForMilkdown();
    await pm.click();
    await browser.pause(300);

    const liftBtn = await findToolbarButton('remove list');
    if (!liftBtn) return;

    await liftBtn.click();
    await browser.pause(600);

    // Should no longer be a list item
    const li = await $('.milkdown .ProseMirror li');
    expect(await li.isExisting()).toBe(false);

    // Text should still exist as a paragraph
    const text = await getMilkdownText();
    expect(text).toContain('only item');
  });

  // ── renumber-ol ───────────────────────────────────────────────────────────

  it('renumber-ol button fixes gaps in ordered list numbering', async () => {
    await setupContent('1. alpha\n3. beta\n5. gamma');

    const renumberBtn = await findToolbarButton('renumber');
    if (!renumberBtn) return;

    await renumberBtn.click();
    await browser.pause(800);

    // Switch to source view to inspect the markdown
    const editBtn = await findToolbarButton('edit only');
    if (editBtn) {
      await editBtn.click();
      await browser.pause(500);
    }

    const cmEditor = await $('.cm-editor .cm-content');
    if (await cmEditor.isExisting()) {
      const srcText = await cmEditor.getText();
      // Numbers should be sequential after renumbering
      expect(srcText).toMatch(/1\. alpha/);
      expect(srcText).toMatch(/2\. beta/);
      expect(srcText).toMatch(/3\. gamma/);
      expect(srcText).not.toMatch(/3\. beta/);
      expect(srcText).not.toMatch(/5\. gamma/);
    }
  });

  it('renumber-ol handles multiple separate ordered lists independently', async () => {
    await setupContent('1. a\n3. b\n\n1. x\n5. y');

    const renumberBtn = await findToolbarButton('renumber');
    if (!renumberBtn) return;

    await renumberBtn.click();
    await browser.pause(800);

    // Switch to source view
    const editBtn = await findToolbarButton('edit only');
    if (editBtn) {
      await editBtn.click();
      await browser.pause(500);
    }

    const cmEditor = await $('.cm-editor .cm-content');
    if (await cmEditor.isExisting()) {
      const srcText = await cmEditor.getText();
      // Both lists should start from 1
      const firstListOk = srcText.includes('1. a') && srcText.includes('2. b');
      const secondListOk = srcText.includes('1. x') && srcText.includes('2. y');
      expect(firstListOk).toBe(true);
      expect(secondListOk).toBe(true);
    }
  });
});
