import { FolderOpen, Save, SaveAll, FilePlus, PanelLeftClose, PanelRightClose, Columns2, FileOutput } from 'lucide-react';
import { ViewMode } from '../types';

interface ToolbarProps {
  viewMode: ViewMode;
  onNewTab: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
  onSetViewMode: (mode: ViewMode) => void;
}

export function Toolbar({ viewMode, onNewTab, onOpenFile, onSaveFile, onSaveAsFile, onExportDocx, onExportPdf, onExportHtml, onSetViewMode }: ToolbarProps) {
  const btnCls = 'flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm border border-transparent rounded transition-all';
  const viewBtnCls = (active: boolean) =>
    'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-all ' +
    (active
      ? 'bg-white border-slate-400 text-blue-700 shadow-sm font-medium'
      : 'border-transparent text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-sm');

  return (
    <div className="shrink-0 flex items-center justify-between px-2 py-1 bg-slate-100 border-b border-slate-300">
      <div className="flex items-center">
        <button onClick={onNewTab} title="新建 (Ctrl+N)" className={btnCls}>
          <FilePlus size={15} strokeWidth={1.8} /><span>新建</span>
        </button>
        <button onClick={onOpenFile} title="打开文件 (Ctrl+O)" className={btnCls}>
          <FolderOpen size={15} strokeWidth={1.8} /><span>打开</span>
        </button>
        <button onClick={onSaveFile} title="保存 (Ctrl+S)" className={btnCls}>
          <Save size={15} strokeWidth={1.8} /><span>保存</span>
        </button>
        <button onClick={onSaveAsFile} title="另存为… (Ctrl+Shift+S)" className={btnCls}>
          <SaveAll size={15} strokeWidth={1.8} /><span>另存为</span>
        </button>
        <div className="w-px h-5 bg-slate-300 mx-1" />
        <button onClick={onExportDocx} title="导出为 Word 文档" className={btnCls}>
          <FileOutput size={15} strokeWidth={1.8} /><span>导出DOCX</span>
        </button>
        <button onClick={onExportPdf} title="导出为 PDF" className={btnCls}>
          <FileOutput size={15} strokeWidth={1.8} /><span>导出PDF</span>
        </button>
        <button onClick={onExportHtml} title="导出为 HTML" className={btnCls}>
          <FileOutput size={15} strokeWidth={1.8} /><span>导出HTML</span>
        </button>
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onSetViewMode('edit')} title="仅编辑 (Ctrl+1)" className={viewBtnCls(viewMode === 'edit')}>
          <PanelRightClose size={15} strokeWidth={1.8} /><span>编辑</span>
        </button>
        <button onClick={() => onSetViewMode('split')} title="分栏视图 (Ctrl+2)" className={viewBtnCls(viewMode === 'split')}>
          <Columns2 size={15} strokeWidth={1.8} /><span>分栏</span>
        </button>
        <button onClick={() => onSetViewMode('preview')} title="仅预览 (Ctrl+3)" className={viewBtnCls(viewMode === 'preview')}>
          <PanelLeftClose size={15} strokeWidth={1.8} /><span>预览</span>
        </button>
      </div>
    </div>
  );
}
