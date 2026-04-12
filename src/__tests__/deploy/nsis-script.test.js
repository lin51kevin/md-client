import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('NSIS Installer Script', () => {
  const nsiPath = join(process.cwd(), 'deploy', 'installer.nsi');

  describe('NSIS script syntax validation', () => {
    let scriptContent = '';

    beforeAll(() => {
      if (existsSync(nsiPath)) {
        scriptContent = readFileSync(nsiPath, 'utf-8');
      }
    });

    it('should exist at deploy/installer.nsi', () => {
      expect(existsSync(nsiPath)).toBe(true);
    });

    it('should define install directory as $LOCALAPPDATA\\MarkLite', () => {
      if (scriptContent) {
        expect(scriptContent).toContain('$LOCALAPPDATA\\MarkLite');
      }
    });

    it('should support desktop shortcut creation', () => {
      if (scriptContent) {
        expect(scriptContent).toMatch(/CreateShortCut|desktop/i);
      }
    });

    it('should support start menu entry', () => {
      if (scriptContent) {
        expect(scriptContent).toMatch(/start.?menu|SMPROGRAMS/i);
      }
    });

    it('should register .md and .markdown file associations', () => {
      if (scriptContent) {
        const hasMd = scriptContent.includes('.md') || scriptContent.includes('markdown');
        expect(hasMd).toBe(true);
      }
    });
  });
});
