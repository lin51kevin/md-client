#!/usr/bin/env node
/**
 * Update import paths after file reorganization
 */

const fs = require('fs');
const path = require('path');

// Mapping: old path -> new path
const importMapping = {
  // Editor components
  './components/ActivityBar': './components/editor/ActivityBar',
  './components/ActivityBar.tsx': './components/editor/ActivityBar',
  './components/EditorContentArea': './components/editor/EditorContentArea',
  './components/EditorContentArea.tsx': './components/editor/EditorContentArea',
  './components/EditorContextMenu': './components/editor/EditorContextMenu',
  './components/EditorContextMenu.tsx': './components/editor/EditorContextMenu',
  
  // File components  
  './components/FileTreeSidebar': './components/file/FileTreeSidebar',
  './components/FileTreeSidebar.tsx': './components/file/FileTreeSidebar',
  './components/FileTreeNode': './components/file/FileTreeNode',
  './components/FileTreeNode.tsx': './components/file/FileTreeNode',
  './components/FileTreeContextMenu': './components/file/FileTreeContextMenu',
  './components/FileTreeContextMenu.tsx': './components/file/FileTreeContextMenu',
  './components/FileMenuDropdown': './components/file/FileMenuDropdown',
  './components/FileMenuDropdown.tsx': './components/file/FileMenuDropdown',
  './components/FileHoverPreview': './components/file/FileHoverPreview',
  './components/FileHoverPreview.tsx': './components/file/FileHoverPreview',
  './components/FileChangeToast': './components/file/FileChangeToast',
  './components/FileChangeToast.tsx': './components/file/FileChangeToast',
  './components/DragOverlay': './components/file/DragOverlay',
  './components/DragOverlay.tsx': './components/file/DragOverlay',
  
  // Sidebar components
  './components/SidebarContainer': './components/sidebar/SidebarContainer',
  './components/SidebarContainer.tsx': './components/sidebar/SidebarContainer',
  './components/TocSidebar': './components/sidebar/TocSidebar',
  './components/TocSidebar.tsx': './components/sidebar/TocSidebar',
  './components/BreadcrumbNav': './components/sidebar/BreadcrumbNav',
  './components/BreadcrumbNav.tsx': './components/sidebar/BreadcrumbNav',
  
  // Preview components
  './components/MarkdownPreview': './components/preview/MarkdownPreview',
  './components/MarkdownPreview.tsx': './components/preview/MarkdownPreview',
  './components/PreviewContextMenu': './components/preview/PreviewContextMenu',
  './components/PreviewContextMenu.tsx': './components/preview/PreviewContextMenu',
  './components/SlidePreview': './components/preview/SlidePreview',
  './components/SlidePreview.tsx': './components/preview/SlidePreview',
  './components/MindmapView': './components/preview/MindmapView',
  './components/MindmapView.tsx': './components/preview/MindmapView',
  
  // Toolbar components
  './components/Toolbar': './components/toolbar/Toolbar',
  './components/Toolbar.tsx': './components/toolbar/Toolbar',
  './components/ToolbarButton': './components/toolbar/ToolbarButton',
  './components/ToolbarButton.tsx': './components/toolbar/ToolbarButton',
  './components/CommandPalette': './components/toolbar/CommandPalette',
  './components/CommandPalette.tsx': './components/toolbar/CommandPalette',
  './components/QuickOpen': './components/toolbar/QuickOpen',
  './components/QuickOpen.tsx': './components/toolbar/QuickOpen',
  './components/TabBar': './components/toolbar/TabBar',
  './components/TabBar.tsx': './components/toolbar/TabBar',
  './components/TabContextMenu': './components/toolbar/TabContextMenu',
  './components/TabContextMenu.tsx': './components/toolbar/TabContextMenu',
  './components/StatusBar': './components/toolbar/StatusBar',
  './components/StatusBar.tsx': './components/toolbar/StatusBar',
  
  // Modal components
  './components/AboutModal': './components/modal/AboutModal',
  './components/AboutModal.tsx': './components/modal/AboutModal',
  './components/HelpModal': './components/modal/HelpModal',
  './components/HelpModal.tsx': './components/modal/HelpModal',
  './components/SettingsModal': './components/modal/SettingsModal',
  './components/SettingsModal.tsx': './components/modal/SettingsModal',
  './components/InputDialog': './components/modal/InputDialog',
  './components/InputDialog.tsx': './components/modal/InputDialog',
  './components/ExportPanel': './components/modal/ExportPanel',
  './components/ExportPanel.tsx': './components/modal/ExportPanel',
  './components/GitPanel': './components/modal/GitPanel',
  './components/GitPanel.tsx': './components/modal/GitPanel',
  './components/PluginPanel': './components/modal/PluginPanel',
  './components/PluginPanel.tsx': './components/modal/PluginPanel',
  './components/PluginSidebarRenderer': './components/modal/PluginSidebarRenderer',
  './components/PluginSidebarRenderer.tsx': './components/modal/PluginSidebarRenderer',
  './components/SnippetManager': './components/modal/SnippetManager',
  './components/SnippetManager.tsx': './components/modal/SnippetManager',
  './components/SnippetPicker': './components/modal/SnippetPicker',
  './components/SnippetPicker.tsx': './components/modal/SnippetPicker',
  './components/TableEditor': './components/modal/TableEditor',
  './components/TableEditor.tsx': './components/modal/TableEditor',
  './components/TableSizePicker': './components/modal/TableSizePicker',
  './components/TableSizePicker.tsx': './components/modal/TableSizePicker',
  './components/SearchPanel': './components/modal/SearchPanel',
  './components/SearchPanel.tsx': './components/modal/SearchPanel',
  './components/DiffViewer': './components/modal/DiffViewer',
  './components/DiffViewer.tsx': './components/modal/DiffViewer',
  './components/CustomCssEditor': './components/modal/CustomCssEditor',
  './components/CustomCssEditor.tsx': './components/modal/CustomCssEditor',
  './components/PermissionApprovalModal': './components/modal/PermissionApprovalModal',
  './components/PermissionApprovalModal.tsx': './components/modal/PermissionApprovalModal',
  './components/UpdateNotification': './components/modal/UpdateNotification',
  './components/UpdateNotification.tsx': './components/modal/UpdateNotification',
  './components/FloatingPanel': './components/modal/FloatingPanel',
  './components/FloatingPanel.tsx': './components/modal/FloatingPanel',
  
  // Welcome components
  './components/WelcomePage': './components/welcome/WelcomePage',
  './components/WelcomePage.tsx': './components/welcome/WelcomePage',
  
  // Lib files
  './lib/auto-save': './lib/editor/auto-save',
  './lib/shortcuts-config': './lib/editor/shortcuts-config',
  './lib/command-registry': './lib/editor/command-registry',
  './lib/commands': './lib/editor/commands',
  './lib/context-menu': './lib/editor/context-menu',
  './lib/text-format': './lib/editor/text-format',
  './lib/vim-mode': './lib/editor/vim-mode',
  './lib/split-preference': './lib/editor/split-preference',
  './lib/toc': './lib/markdown/toc',
  './lib/mermaid': './lib/markdown/mermaid',
  './lib/latex': './lib/markdown/latex',
  './lib/html-export': './lib/markdown/html-export',
  './lib/export-prerender': './lib/markdown/export-prerender',
  './lib/table-parser': './lib/markdown/table-parser',
  './lib/slide-parser': './lib/markdown/slide-parser',
  './lib/mindmap-converter': './lib/markdown/mindmap-converter',
  './lib/recent-files': './lib/file/recent-files',
  './lib/git-commands': './lib/file/git-commands',
  './lib/reveal-in-explorer': './lib/file/reveal-in-explorer',
  './lib/pending-images': './lib/file/pending-images',
  './lib/storage-keys': './lib/file/storage-keys',
  './lib/search': './lib/search/search',
  './lib/tab-session': './lib/storage/tab-session',
  './lib/version-history': './lib/storage/version-history',
  './lib/snippets': './lib/storage/snippets',
  './lib/custom-css': './lib/ui/custom-css',
  './lib/css-templates': './lib/ui/css-templates',
  './lib/word-count': './lib/utils/word-count',
  './lib/writing-stats': './lib/utils/writing-stats',
  './lib/format-duration': './lib/utils/format-duration',
  './lib/image-paste': './lib/utils/image-paste',
};

// Update relative paths for different depths
function updateImportPaths(filePath, content) {
  let updated = content;
  
  for (const [oldPath, newPath] of Object.entries(importMapping)) {
    // Handle different relative path depths
    const patterns = [
      { search: oldPath, replace: newPath },
      { search: oldPath.replace('./', '../'), replace: newPath.replace('./', '../') },
      { search: oldPath.replace('./', '../../'), replace: newPath.replace('./', '../../') },
    ];
    
    for (const { search, replace } of patterns) {
      const regex = new RegExp(`from ['"]${search}['"]`, 'g');
      updated = updated.replace(regex, `from '${replace}'`);
    }
  }
  
  return updated;
}

// Find all TSX/TS files
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findFiles(fullPath, files);
    } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main
const srcDir = path.join(__dirname, '..', 'src');
const files = findFiles(srcDir);
let updatedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const updated = updateImportPaths(file, content);
  
  if (content !== updated) {
    fs.writeFileSync(file, updated);
    console.log(`Updated: ${path.relative(srcDir, file)}`);
    updatedCount++;
  }
}

console.log(`\nTotal files updated: ${updatedCount}`);
