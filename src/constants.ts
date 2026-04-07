export const INITIAL_TAB_ID = '1';
let _tabIdCounter = 2;
export const genTabId = () => String(_tabIdCounter++);

export const DEFAULT_MARKDOWN = `
# Welcome to Markdown Editor 🚀

This is a real-time Markdown editor built with Tauri, React, and Tailwind CSS.

## Features Supported:
- Live Preview
- Fast performant saving (via Rust backend)
- **Bold**, *Italics*, \`Inline Code\`
- GFM (Github Flavored Markdown)

### Tables

:::details{summary="Code Blocks"}
\`\`\`js
function sayHello() {
  console.log("Hello Tauri!");
}
sayHello();
\`\`\`
:::
:::

:::details{summary="Tables"}
### Tables
| Syntax | Description |
| --- | --- |
| Header | Title |
| Paragraph | Text |
:::

---
Enjoy editing!
`;
