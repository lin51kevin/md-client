import { describe, it, expect, vi } from 'vitest';
import { createAutoSave } from '../../../lib/editor';

describe('F004 — 自动保存', () => {

  describe('防抖逻辑', () => {
    it('快速连续调用只应触发一次保存', async () => {
      vi.useFakeTimers();
      const onSave = vi.fn();
      const autoSave = createAutoSave({ delay: 1000, onSave });
      
      autoSave.schedule('hello');
      autoSave.schedule('hello world');
      autoSave.schedule('hello world!');
      
      expect(onSave).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('hello world!');
      
      autoSave.dispose();
      vi.useRealTimers();
    });

    it('内容不变时 schedule 应跳过', () => {
      const onSave = vi.fn();
      const autoSave = createAutoSave({ delay: 1000, onSave });
      
      autoSave.saveNow('same content');
      autoSave.schedule('same content');
      
      expect(onSave).toHaveBeenCalledTimes(1);
      autoSave.dispose();
    });

    it('新输入应重置计时器', async () => {
      vi.useFakeTimers();
      const onSave = vi.fn();
      const autoSave = createAutoSave({ delay: 1000, onSave });
      
      autoSave.schedule('first');
      vi.advanceTimersByTime(500);
      autoSave.schedule('second');
      expect(onSave).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(500);
      expect(onSave).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(500);
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('second');
      
      autoSave.dispose();
      vi.useRealTimers();
    });
  });

  describe('立即保存', () => {
    it('saveNow 应立即保存并取消防抖', async () => {
      vi.useFakeTimers();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const autoSave = createAutoSave({ delay: 5000, onSave });
      
      autoSave.schedule('will be overridden');
      await autoSave.saveNow('immediate');
      
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('immediate');
      
      vi.advanceTimersByTime(5000);
      expect(onSave).toHaveBeenCalledTimes(1);
      
      autoSave.dispose();
      vi.useRealTimers();
    });

    it('相同内容的 saveNow 不重复保存', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const autoSave = createAutoSave({ delay: 1000, onSave });
      
      await autoSave.saveNow('content');
      await autoSave.saveNow('content');
      
      expect(onSave).toHaveBeenCalledTimes(1);
      autoSave.dispose();
    });
  });

  describe('取消和销毁', () => {
    it('cancel 应取消待执行的保存', () => {
      vi.useFakeTimers();
      const onSave = vi.fn();
      const autoSave = createAutoSave({ delay: 1000, onSave });
      
      autoSave.schedule('pending');
      autoSave.cancel();
      
      vi.advanceTimersByTime(1000);
      expect(onSave).not.toHaveBeenCalled();
      
      autoSave.dispose();
      vi.useRealTimers();
    });

    it('dispose 后 schedule 不应工作', () => {
      vi.useFakeTimers();
      const onSave = vi.fn();
      const autoSave = createAutoSave({ delay: 100, onSave });
      
      autoSave.dispose();
      
      autoSave.schedule('after dispose');
      vi.advanceTimersByTime(200);
      expect(onSave).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

});
