import { Extension, Prec } from '@codemirror/state';

/**
 * F003 — Vim 键位绑定
 * 
 * 使用 @replit/codemirror-vim 提供 Vim 模式的完整键位映射。
 */
export async function vimKeymap(): Promise<Extension> {
  const { vim } = await import('@replit/codemirror-vim');
  return Prec.highest(vim());
}
