import { describe, it, expect } from 'vitest';
import { VimModeManager } from '../../lib/vim-mode';

/**
 * F003 — Vim 模式功能测试
 * 
 * 测试 Vim 模式管理器（状态切换和事件通知）
 */

describe('F003 — Vim 模式管理', () => {

  describe('初始状态', () => {
    it('默认为 normal 模式', () => {
      const vim = new VimModeManager();
      expect(vim.getMode()).toBe('normal');
    });
  });

  describe('Normal → Insert 切换', () => {
    const insertKeys = ['i', 'I', 'a', 'A', 'o', 'O'];

    it.each(insertKeys)('按 %s 进入 insert 模式', (key) => {
      const vim = new VimModeManager();
      expect(vim.handleKey(key)).toBe('insert');
      expect(vim.getMode()).toBe('insert');
    });
  });

  describe('Insert → Normal 切换', () => {
    it('Esc 从 insert 返回 normal', () => {
      const vim = new VimModeManager();
      vim.handleKey('i');
      expect(vim.handleKey('Escape')).toBe('normal');
      expect(vim.getMode()).toBe('normal');
    });
  });

  describe('Normal → Visual 切换', () => {
    it('按 v 进入 visual 模式', () => {
      const vim = new VimModeManager();
      expect(vim.handleKey('v')).toBe('visual');
      expect(vim.getMode()).toBe('visual');
    });

    it('按 V 进入 visual line 模式', () => {
      const vim = new VimModeManager();
      expect(vim.handleKey('V')).toBe('visual');
      expect(vim.getMode()).toBe('visual');
    });
  });

  describe('Visual → Normal 切换', () => {
    it('Esc 从 visual 返回 normal', () => {
      const vim = new VimModeManager();
      vim.handleKey('v');
      expect(vim.handleKey('Escape')).toBe('normal');
    });

    it('执行 y 操作后返回 normal', () => {
      const vim = new VimModeManager();
      vim.handleKey('v');
      expect(vim.handleKey('y')).toBe('normal');
    });
  });

  describe('模式变更通知', () => {
    it('模式变化时触发回调', () => {
      const vim = new VimModeManager();
      const modes: Array<string> = [];
      vim.onModeChange(m => modes.push(m));
      
      vim.handleKey('i');
      vim.handleKey('Escape');
      
      expect(modes).toEqual(['insert', 'normal']);
    });

    it('取消订阅后不再触发', () => {
      const vim = new VimModeManager();
      let count = 0;
      const unsub = vim.onModeChange(() => count++);
      unsub();
      
      vim.handleKey('i');
      expect(count).toBe(0);
    });
  });

  describe('重复设置不触发', () => {
    it('相同模式不重复触发事件', () => {
      const vim = new VimModeManager();
      let callCount = 0;
      vim.onModeChange(() => callCount++);
      
      vim.setMode('normal');
      expect(callCount).toBe(0);
    });
  });

});
