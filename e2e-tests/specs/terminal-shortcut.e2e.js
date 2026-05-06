/**
 * E2E tests — Terminal panel Ctrl+~ keyboard shortcut
 *
 * Verifies that:
 * 1. The terminal plugin is loaded and its activity-bar icon is present.
 * 2. Ctrl+~ opens the bottom terminal panel.
 * 3. A second Ctrl+~ closes it.
 * 4. The shortcut works even when the terminal panel is focused (xterm.js
 *    capture-phase fix).
 */
describe('MarkLite - Terminal panel Ctrl+~ shortcut', () => {
  /** Wait for the toolbar to confirm the app is ready. */
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });
    await browser.pause(2000); // let plugins initialise
  });

  /** Helper: is the bottom panel currently visible? */
  async function isBottomPanelVisible() {
    const panel = await $('[data-bottom-panel-id="active"]');
    return panel.isExisting();
  }

  /** Helper: find the terminal activity-bar button by title. */
  async function findTerminalActivityBarButton() {
    const buttons = await $$('button[title]');
    for (const btn of buttons) {
      const title = await btn.getAttribute('title');
      if (title && title.toLowerCase().includes('terminal')) {
        return btn;
      }
    }
    return null;
  }

  it('should have a terminal activity-bar button (plugin loaded)', async () => {
    const btn = await findTerminalActivityBarButton();
    expect(btn).not.toBeNull();
    if (btn) {
      expect(await btn.isDisplayed()).toBe(true);
    }
  });

  it('should open the terminal panel with Ctrl+~', async () => {
    // Ensure panel is closed first via activity bar button if it's open
    if (await isBottomPanelVisible()) {
      await browser.keys(['Control', '~']);
      await browser.pause(500);
    }

    // Press Ctrl+~ to open
    await browser.keys(['Control', '~']);
    await browser.pause(1000);

    const visible = await isBottomPanelVisible();
    expect(visible).toBe(true);
  });

  it('should show terminal content inside the bottom panel', async () => {
    // The terminal panel should now be open; check for xterm canvas or container
    await browser.waitUntil(
      async () => {
        const panel = await $('[data-bottom-panel-id="active"]');
        if (!(await panel.isExisting())) return false;
        // xterm renders a .xterm or canvas element
        const terminal = await panel.$('.xterm, canvas, [data-terminal]');
        return terminal.isExisting();
      },
      { timeout: 5000, timeoutMsg: 'Terminal content did not render inside the bottom panel' }
    );
  });

  it('should close the terminal panel with a second Ctrl+~', async () => {
    // Panel should currently be open. Click somewhere neutral (not on the terminal)
    // so focus is not inside xterm, then press the shortcut.
    // Because we use a capture-phase listener this should work even if xterm has focus.
    await browser.keys(['Control', '~']);
    await browser.pause(800);

    const visible = await isBottomPanelVisible();
    expect(visible).toBe(false);
  });

  it('should re-open the terminal panel when Ctrl+~ is pressed again', async () => {
    await browser.keys(['Control', '~']);
    await browser.pause(800);

    const visible = await isBottomPanelVisible();
    expect(visible).toBe(true);
  });

  it('should close the terminal panel even when it has focus (capture-phase fix)', async () => {
    // Click inside the terminal to give xterm focus, then toggle with Ctrl+~
    const panel = await $('[data-bottom-panel-id="active"]');
    if (await panel.isExisting()) {
      const terminal = await panel.$('.xterm-screen, canvas');
      if (await terminal.isExisting()) {
        await terminal.click();
        await browser.pause(300);
      }
    }

    // Ctrl+~ must close the panel even with xterm focused
    await browser.keys(['Control', '~']);
    await browser.pause(800);

    const visible = await isBottomPanelVisible();
    expect(visible).toBe(false);
  });

  it('should also toggle via the activity bar button', async () => {
    const btn = await findTerminalActivityBarButton();
    if (!btn) return; // skip if plugin not found

    // Open via button
    await btn.click();
    await browser.pause(600);
    expect(await isBottomPanelVisible()).toBe(true);

    // Close via button
    await btn.click();
    await browser.pause(600);
    expect(await isBottomPanelVisible()).toBe(false);
  });
});
