import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomCssEditor } from '../../components/CustomCssEditor';

describe('CustomCssEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('应渲染 CSS 文本输入区域', () => {
    render(<CustomCssEditor />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('应渲染应用和清除按钮', () => {
    render(<CustomCssEditor />);
    expect(screen.getByRole('button', { name: /应用|apply/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /清除|clear/i })).toBeInTheDocument();
  });

  it('应预加载已保存的自定义 CSS', () => {
    localStorage.setItem('marklite-custom-css', '.preloaded { color: green; }');
    render(<CustomCssEditor />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('.preloaded { color: green; }');
  });

  it('输入 CSS 并点击应用应保存到 localStorage', () => {
    render(<CustomCssEditor />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '.foo { color: red; }' } });
    fireEvent.click(screen.getByRole('button', { name: /应用|apply/i }));
    expect(localStorage.getItem('marklite-custom-css')).toBe('.foo { color: red; }');
  });

  it('点击清除应清空输入并清除 localStorage', () => {
    render(<CustomCssEditor />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'body { color: blue; }' } });
    fireEvent.click(screen.getByRole('button', { name: /清除|clear/i }));
    expect((textarea as HTMLTextAreaElement).value).toBe('');
    expect(localStorage.getItem('marklite-custom-css')).toBeNull();
  });

  it('应显示 CSS 作用域说明文字', () => {
    render(<CustomCssEditor />);
    // Should have some hint about CSS scope (may match parent div + child code)
    const matches = screen.getAllByText(/\.markdown-preview|自定义|CSS/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('点击应用后在 <head> 中注入 style 标签', () => {
    render(<CustomCssEditor />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '.x { opacity: 0; }' } });
    fireEvent.click(screen.getByRole('button', { name: /应用|apply/i }));
    const styleEl = document.getElementById('marklite-custom-css-style');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('.x { opacity: 0; }');
  });
});
