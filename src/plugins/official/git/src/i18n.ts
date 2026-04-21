/**
 * Plugin-local i18n for the Git Integration plugin.
 * Each locale provides all `git.*` keys used by GitPanel and related UI.
 */

export const GIT_I18N_KEYS = [
  'git.panel',
  'git.branch',
  'git.noRepo',
  'git.noRepoHint',
  'git.commitPlaceholder',
  'git.commit',
  'git.pull',
  'git.push',
  'git.refresh',
  'git.noChanges',
  'git.loading',
  'git.staged',
  'git.openFile',
  'git.viewDiff',
  'git.stage',
  'git.unstage',
  'git.discard',
  'git.discardConfirm',
  'git.loadingDiff',
] as const;

type GitI18nKey = (typeof GIT_I18N_KEYS)[number];
type GitI18nStrings = Record<GitI18nKey, string>;

const en: GitI18nStrings = {
  'git.panel': 'Source Control',
  'git.branch': 'Branch',
  'git.noRepo': 'Not a Git Repository',
  'git.noRepoHint': 'Open a file inside an initialized git folder',
  'git.commitPlaceholder': 'Commit message…',
  'git.commit': 'Commit',
  'git.pull': 'Pull',
  'git.push': 'Push',
  'git.refresh': 'Refresh',
  'git.noChanges': 'No changes in working tree',
  'git.loading': 'Loading…',
  'git.staged': 'Staged',
  'git.openFile': 'Open File',
  'git.viewDiff': 'View Diff',
  'git.stage': 'Stage',
  'git.unstage': 'Unstage',
  'git.discard': 'Discard Changes',
  'git.discardConfirm': 'Discard changes to {path}? This cannot be undone.',
  'git.loadingDiff': 'Loading diff…',
};

const zhCN: GitI18nStrings = {
  'git.panel': 'Source Control',
  'git.branch': '分支',
  'git.noRepo': '不是 Git 仓库',
  'git.noRepoHint': '请在已初始化 git 的文件夹中打开文件',
  'git.commitPlaceholder': '提交信息…',
  'git.commit': '提交',
  'git.pull': '拉取',
  'git.push': '推送',
  'git.refresh': '刷新',
  'git.noChanges': '工作区无变更',
  'git.loading': '加载中…',
  'git.staged': '已暂存',
  'git.openFile': '打开文件',
  'git.viewDiff': '查看 Diff',
  'git.stage': '暂存',
  'git.unstage': '取消暂存',
  'git.discard': '丢弃更改',
  'git.discardConfirm': '确认丢弃 {path} 的更改？此操作不可撤销。',
  'git.loadingDiff': '加载 diff…',
};

const jaJP: GitI18nStrings = {
  'git.panel': 'ソース管理',
  'git.branch': 'ブランチ',
  'git.noRepo': 'Git リポジトリではありません',
  'git.noRepoHint': 'Git 初期化済みのフォルダ内のファイルを開いてください',
  'git.commitPlaceholder': 'コミットメッセージ…',
  'git.commit': 'コミット',
  'git.pull': 'プル',
  'git.push': 'プッシュ',
  'git.refresh': '更新',
  'git.noChanges': '作業ツリーに変更はありません',
  'git.loading': '読み込み中…',
  'git.staged': 'ステージ済み',
  'git.openFile': 'ファイルを開く',
  'git.viewDiff': '差分を表示',
  'git.stage': 'ステージに追加',
  'git.unstage': 'ステージから解除',
  'git.discard': '変更を破棄',
  'git.discardConfirm': '{path} の変更を破棄しますか？この操作は元に戻せません。',
  'git.loadingDiff': '差分を読み込み中…',
};

const locales: Record<string, GitI18nStrings> = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};

/**
 * Get i18n strings for the given locale.
 * Falls back to English for unknown locales.
 */
export function getGitI18n(locale: string): GitI18nStrings {
  return locales[locale] ?? en;
}

/**
 * Create a `t` function for the git plugin, bound to a specific locale.
 * Supports `{key}` interpolation.
 */
export function createGitT(locale: string): (key: string, params?: Record<string, string>) => string {
  const strings = getGitI18n(locale);
  return (key: string, params?: Record<string, string>) => {
    let str = (strings as Record<string, string>)[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  };
}
