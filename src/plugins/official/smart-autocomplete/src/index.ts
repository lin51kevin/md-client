import type { PluginContext } from '../../../plugin-sandbox';
import { createFilePathCompleter } from './file-path-completer';
import { createSnippetCompleter } from './snippet-completer';

export async function activate(context: PluginContext) {
  const { autocompletion } = await import('@codemirror/autocomplete');

  const filePathCompleter = createFilePathCompleter(
    () => context.workspace.getAllFiles(),
  );

  const snippetCompleter = createSnippetCompleter(
    () => context.editor.getActiveFilePath(),
    (cb) => context.editor.onLanguageChanged(cb),
  );

  const ext = autocompletion({
    activateOnTyping: true,
    override: [filePathCompleter, snippetCompleter],
  });

  const disposable = context.editor.registerExtension(ext);

  return {
    deactivate: () => disposable.dispose(),
  };
}
