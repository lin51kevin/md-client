import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getImageSaveDir, setImageSaveDir, generateImageFileName, buildImageMarkdownPath } from '../../lib/image-paste';

describe('image-paste utilities', () => {
  describe('generateImageFileName', () => {
    it('generates a unique filename with timestamp', () => {
      const name = generateImageFileName('png');
      expect(name).toMatch(/^img-\d{13}\.png$/);
    });

    it('accepts different extensions', () => {
      const png = generateImageFileName('png');
      const jpg = generateImageFileName('jpg');
      const webp = generateImageFileName('webp');
      expect(png).toMatch(/\.png$/);
      expect(jpg).toMatch(/\.jpg$/);
      expect(webp).toMatch(/\.webp$/);
    });
  });

  describe('buildImageMarkdownPath', () => {
    it('returns absolute path when no relativeTo is given', () => {
      const result = buildImageMarkdownPath('/images', 'test.png');
      expect(result).toBe('/images/test.png');
    });

    it('resolves relative path from the markdown file directory', () => {
      const result = buildImageMarkdownPath('/images', 'test.png', '/docs/notes.md');
      expect(result).toBe('../images/test.png');
    });

    it('returns just the filename when image dir equals doc dir', () => {
      const result = buildImageMarkdownPath('/docs', 'test.png', '/docs/notes.md');
      expect(result).toBe('test.png');
    });

    it('returns relative path for unknown relative path structure', () => {
      // computeRelativePath handles cross-directory references
      const result = buildImageMarkdownPath('/a/b/c', 'test.png', '/x/y.md');
      expect(result).toBe('../a/b/c/test.png');
    });

    it('returns relative path for Windows-style paths', () => {
      // Image saved in subdirectory of the document's directory
      const result = buildImageMarkdownPath('C:\\Users\\docs', 'test.png', 'C:\\Users\\readme.md');
      expect(result).toBe('docs/test.png');
    });

    it('returns just filename when imageSaveDir equals docDir', () => {
      // Image saved in same directory as the document
      const result = buildImageMarkdownPath('C:\\Users', 'test.png', 'C:\\Users\\readme.md');
      expect(result).toBe('test.png');
    });
  });

  describe('getImageSaveDir / setImageSaveDir', () => {
    beforeEach(() => {
      localStorage.removeItem('md-client-image-dir');
    });

    afterEach(() => {
      localStorage.removeItem('md-client-image-dir');
    });

    it('defaults to empty string', () => {
      const dir = getImageSaveDir();
      expect(dir).toBe('');
    });

    it('persists user-set directory', () => {
      setImageSaveDir('/my/images');
      expect(getImageSaveDir()).toBe('/my/images');
    });

    it('overwrites previous value', () => {
      setImageSaveDir('/first');
      setImageSaveDir('/second');
      expect(getImageSaveDir()).toBe('/second');
    });
  });
});
