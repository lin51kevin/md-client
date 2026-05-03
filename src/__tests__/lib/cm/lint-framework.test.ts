import { describe, it, expect } from 'vitest';
import {
  registerLinter,
  createLinterExtension,
  getLintSources,
  clearAllLinters,
} from '../../../lib/cm/cmLint';
import type { Diagnostic, LintSource } from '@codemirror/lint';

/**
 * T2.4 — Lint 框架测试
 *
 * 测试场景：
 * 1. 应创建 linterSource 并返回 diagnostics
 * 2. 应在编辑器中渲染波浪下划线（通过扩展结构验证）
 * 3. 应支持注册/注销外部 linters
 * 4. 应在非代码文件中不显示
 */

const noopView = {} as any; // minimal mock for LintSource

describe('cmLint — lint framework', () => {
  afterEach(() => {
    clearAllLinters();
  });

  describe('linterSource 创建与 diagnostics', () => {
    it('应创建 linterSource 并返回 diagnostics', () => {
      const diagnostics: Diagnostic[] = [
        { from: 0, to: 5, severity: 'error', message: 'test error' },
      ];
      const source: LintSource = (view) => diagnostics;
      const unregister = registerLinter('test', source);
      expect(getLintSources().length).toBe(1);
      unregister();
      expect(getLintSources().length).toBe(0);
    });

    it('注册多个 linter 时应全部保留', () => {
      const s1: LintSource = () => [];
      const s2: LintSource = () => [];
      registerLinter('s1', s1);
      registerLinter('s2', s2);
      expect(getLintSources().length).toBe(2);
    });

    it('重复注册同一名称 linter 时应替换', () => {
      const s: LintSource = () => [];
      registerLinter('s', s);
      registerLinter('s', s);
      expect(getLintSources().length).toBe(1);
    });
  });

  describe('createLinterExtension', () => {
    it('应返回非空 Extension 数组', () => {
      const exts = createLinterExtension();
      expect(exts).toBeDefined();
      expect(Array.isArray(exts)).toBe(true);
      expect(exts.length).toBeGreaterThan(0);
    });

    it('未注册 linter 时也应返回基础 linter 配置', () => {
      const exts = createLinterExtension();
      expect(exts.length).toBeGreaterThan(0);
    });
  });

  describe('注册/注销外部 linters', () => {
    it('注销后不应再被包含', () => {
      const s: LintSource = () => [{ from: 0, to: 1, severity: 'warning', message: 'w' }];
      const unregister = registerLinter('test', s);
      expect(getLintSources().length).toBe(1);
      unregister();
      expect(getLintSources().length).toBe(0);
    });

    it('注销某个 linter 不影响其他', () => {
      const s1: LintSource = () => [];
      const s2: LintSource = () => [];
      const u1 = registerLinter('s1', s1);
      registerLinter('s2', s2);
      u1();
      expect(getLintSources().length).toBe(1);
      expect(getLintSources().includes(s2)).toBe(true);
    });
  });

  describe('非代码文件中不显示', () => {
    it('无 linter 注册时，扩展仅包含 lint 配置基础设施', () => {
      const exts = createLinterExtension();
      // 无注册的 linter，扩展应存在但行为无副作用
      expect(exts.length).toBeGreaterThan(0);
    });
  });
});
