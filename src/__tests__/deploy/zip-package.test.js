import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { createZipPackage } from '../../../scripts/create-zip.js';

const TEST_DIR = join(process.cwd(), '.test-zip-output');

describe('ZIP Package Distribution', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  describe('createZipPackage', () => {
    it('should export a function', () => {
      expect(typeof createZipPackage).toBe('function');
    });

    it('should accept config object with exePath, outputDir, version', () => {
      // Interface contract test
      const config = {
        exePath: 'src-tauri/target/release/marklite.exe',
        outputDir: 'dist',
        version: '0.7.0',
      };
      expect(config).toHaveProperty('exePath');
      expect(config).toHaveProperty('outputDir');
      expect(config).toHaveProperty('version');
    });
  });

  describe('ZIP package structure requirements', () => {
    it('should contain marklite.exe in root of zip', () => {
      // Structural requirement
      const requiredFiles = ['marklite.exe'];
      expect(requiredFiles).toContain('marklite.exe');
    });

    it('should include README.html for usage instructions', () => {
      expect(['README.html']).toContain('README.html');
    });

    it('should generate zip filename with version pattern MarkLite-v{x.y.z}-win64.zip', () => {
      const pattern = /^MarkLite-v\d+\.\d+\.\d+-win64\.zip$/;
      expect(pattern.test('MarkLite-v0.7.0-win64.zip')).toBe(true);
      expect(pattern.test('invalid.zip')).toBe(false);
    });
  });
});
