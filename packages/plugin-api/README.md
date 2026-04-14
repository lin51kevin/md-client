# @marklite/plugin-api

TypeScript type definitions for developing MarkLite plugins.

## Installation

```bash
yarn add -D @marklite/plugin-api
```

## Usage

```typescript
import type { PluginContext, PluginManifest } from '@marklite/plugin-api';

export const manifest: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'A sample plugin',
  author: 'Your Name',
  main: 'index.js',
  activationEvents: ['onStartup'],
  permissions: ['editor.read', 'ui.message'],
};

export async function activate(ctx: PluginContext): Promise<void> {
  const content = ctx.editor.getContent();
  ctx.ui.showMessage(`Current file length: ${content.length}`);
}
```

## License

MIT
