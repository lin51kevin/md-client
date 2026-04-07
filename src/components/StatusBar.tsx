interface StatusBarProps {
  filePath: string | null;
  line: number;
  col: number;
}

export function StatusBar({ filePath, line, col }: StatusBarProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-3 py-0.5 bg-slate-200 border-t border-slate-400 text-slate-600 text-xs select-none">
      <span>{filePath ?? '新文件'}</span>
      <span className="tabular-nums">行 {line}，列 {col}</span>
    </div>
  );
}
