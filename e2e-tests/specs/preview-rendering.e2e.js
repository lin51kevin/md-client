describe('MarkLite - Preview Rendering', () => {
  before(async () => {
    const toolbar = await $('[role="toolbar"]');
    await toolbar.waitForExist({ timeout: 15000 });

    // Create a new tab with rich markdown content
    await browser.keys(['Control', 'n']);
    await browser.pause(1000);

    const editor = await $('.cm-editor .cm-content, .milkdown .ProseMirror');
    await editor.click();

    // Type markdown with various elements
    const content = [
      '# Main Title',
      '',
      '## Sub Section',
      '',
      'A paragraph with **bold**, *italic*, and `inline code`.',
      '',
      '- Bullet item 1',
      '- Bullet item 2',
      '- Bullet item 3',
      '',
      '1. Numbered one',
      '2. Numbered two',
      '',
      '> A blockquote with important info.',
      '',
      '```javascript',
      'const hello = "world";',
      'console.log(hello);',
      '```',
      '',
      '| Header 1 | Header 2 |',
      '|----------|----------|',
      '| Cell A   | Cell B   |',
      '',
      '---',
      '',
      '- [x] Completed task',
      '- [ ] Pending task',
    ];

    for (const line of content) {
      await browser.keys(line);
      await browser.keys(['Enter']);
    }
    await browser.pause(500);
  });

  it('should render headings in preview', async () => {
    // Switch to split mode to see preview
    await browser.keys(['Control', '2']);
    await browser.pause(1500);

    const preview = await $('.markdown-preview');
    await preview.waitForExist({ timeout: 5000 });

    // Check for heading elements
    const h1 = await preview.$('h1');
    expect(await h1.isExisting()).toBe(true);
    expect(await h1.getText()).toContain('Main Title');
  });

  it('should render formatted text in preview', async () => {
    const preview = await $('.markdown-preview');
    const text = await preview.getText();

    expect(text).toContain('bold');
    expect(text).toContain('italic');
    expect(text).toContain('inline code');
  });

  it('should render lists in preview', async () => {
    const preview = await $('.markdown-preview');

    // Check for unordered list
    const ul = await preview.$('ul');
    expect(await ul.isExisting()).toBe(true);

    // Check for ordered list
    const ol = await preview.$('ol');
    expect(await ol.isExisting()).toBe(true);
  });

  it('should render code blocks in preview', async () => {
    const preview = await $('.markdown-preview');

    // Code blocks are rendered as <pre><code>
    const codeBlock = await preview.$('pre');
    expect(await codeBlock.isExisting()).toBe(true);

    const codeText = await codeBlock.getText();
    expect(codeText).toContain('hello');
  });

  it('should render blockquotes in preview', async () => {
    const preview = await $('.markdown-preview');

    const blockquote = await preview.$('blockquote');
    expect(await blockquote.isExisting()).toBe(true);
    expect(await blockquote.getText()).toContain('important info');
  });

  it('should render tables in preview', async () => {
    const preview = await $('.markdown-preview');

    const table = await preview.$('table');
    expect(await table.isExisting()).toBe(true);

    const tableText = await table.getText();
    expect(tableText).toContain('Header 1');
    expect(tableText).toContain('Cell A');
  });

  it('should render horizontal rule in preview', async () => {
    const preview = await $('.markdown-preview');

    const hr = await preview.$('hr');
    expect(await hr.isExisting()).toBe(true);
  });

  it('should render task lists in preview', async () => {
    const preview = await $('.markdown-preview');

    // Task lists use input[type="checkbox"]
    const checkboxes = await preview.$$('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  after(async () => {
    await browser.keys(['Control', '1']);
    await browser.pause(300);
    await browser.keys(['Control', 'w']);
    await browser.pause(500);
  });
});
