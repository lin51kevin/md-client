import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffViewer } from '../../../components/modal/DiffViewer';

const SAMPLE_DIFF = `@@ -1,4 +1,5 @@
 # Hello World
-Old line content
+New line content
+Another added line
 
 ## Section 2`;

describe('DiffViewer', () => {
  it('diff 为空时应显示提示', () => {
    render(<DiffViewer diff="" />);
    expect(screen.getByText(/无差异|no diff|no changes/i)).toBeInTheDocument();
  });

  it('应渲染 diff 内容区域', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    // Should contain the diff text
    expect(screen.getByText(/Hello World/i)).toBeInTheDocument();
  });

  it('应以不同样式标记添加行（+）', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const addedLines = screen.getAllByText(/New line content|Another added line/i);
    expect(addedLines.length).toBeGreaterThanOrEqual(1);
  });

  it('应以不同样式标记删除行（-）', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    const removedLines = screen.getAllByText(/Old line content/i);
    expect(removedLines.length).toBeGreaterThanOrEqual(1);
  });

  it('应渲染 @@ hunk 头', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} />);
    expect(screen.getByText(/@@ -1,4 \+1,5 @@/)).toBeInTheDocument();
  });

  it('应接受 filePath prop 并显示文件名', () => {
    render(<DiffViewer diff={SAMPLE_DIFF} filePath="src/index.ts" />);
    expect(screen.getByText(/index\.ts|src\/index/i)).toBeInTheDocument();
  });
});
