export function DragOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-blue-500/10 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
      <div className="bg-white/95 rounded-xl px-12 py-8 shadow-2xl text-center">
        <div className="text-5xl mb-3">📂</div>
        <p className="text-xl font-semibold text-blue-600">释放以打开文件</p>
        <p className="text-sm text-slate-400 mt-1">支持 .md · .markdown · .txt</p>
      </div>
    </div>
  );
}
