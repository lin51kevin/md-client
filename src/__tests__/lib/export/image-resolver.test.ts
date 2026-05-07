import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { resolveLocalImagesInHtml, getDocDir } from '../../../lib/export/image-resolver';
import { invoke } from '@tauri-apps/api/core';

// Helper: encode a string as mock byte array (just ASCII chars for test)
function strToBytes(s: string): number[] {
  return Array.from(s).map(c => c.charCodeAt(0));
}

describe('getDocDir', () => {
  it('returns parent directory from Unix-style path', () => {
    expect(getDocDir('/home/user/docs/file.md')).toBe('/home/user/docs');
  });

  it('returns parent directory from Windows-style path', () => {
    expect(getDocDir('C:\\Users\\user\\docs\\file.md')).toBe('C:/Users/user/docs');
  });

  it('returns null for null input', () => {
    expect(getDocDir(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getDocDir('')).toBeNull();
  });
});

describe('resolveLocalImagesInHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns html unchanged when no img tags present', async () => {
    const html = '<p>Hello world</p>';
    const result = await resolveLocalImagesInHtml(html, '/docs/file.md');
    expect(result).toBe(html);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns html unchanged for remote http URLs', async () => {
    const html = '<img src="https://example.com/image.png">';
    const result = await resolveLocalImagesInHtml(html, '/docs/file.md');
    expect(result).toBe(html);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns html unchanged for existing data URIs', async () => {
    const html = '<img src="data:image/png;base64,abc123">';
    const result = await resolveLocalImagesInHtml(html, '/docs/file.md');
    expect(result).toBe(html);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('resolves absolute path to data URI', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const html = '<img src="/images/photo.png">';
    const result = await resolveLocalImagesInHtml(html, '/docs/file.md');
    expect(invoke).toHaveBeenCalledWith('read_file_bytes', { path: '/images/photo.png' });
    expect(result).toContain('data:image/png;base64,');
  });

  it('resolves relative path to data URI using document directory', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const html = '<img src="./images/photo.png">';
    const result = await resolveLocalImagesInHtml(html, '/docs/notes/file.md');
    expect(invoke).toHaveBeenCalledWith('read_file_bytes', { path: '/docs/notes/images/photo.png' });
    expect(result).toContain('data:image/png;base64,');
  });

  it('resolves ../ relative path correctly', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const html = '<img src="../assets/photo.jpg">';
    const result = await resolveLocalImagesInHtml(html, '/docs/notes/file.md');
    expect(invoke).toHaveBeenCalledWith('read_file_bytes', { path: '/docs/assets/photo.jpg' });
    expect(result).toContain('data:image/jpeg;base64,');
  });

  it('uses correct MIME type for jpeg', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('JPG'));
    const html = '<img src="/img/photo.jpg">';
    const result = await resolveLocalImagesInHtml(html, null);
    expect(result).toContain('data:image/jpeg;base64,');
  });

  it('uses correct MIME type for webp', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('WEBP'));
    const html = '<img src="/img/photo.webp">';
    const result = await resolveLocalImagesInHtml(html, null);
    expect(result).toContain('data:image/webp;base64,');
  });

  it('skips resolution and keeps original src when read fails', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('File not found'));
    const html = '<img src="/missing/image.png">';
    const result = await resolveLocalImagesInHtml(html, null);
    expect(result).toBe(html);
  });

  it('deduplicates identical src values (calls read_file_bytes once)', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const html = '<img src="/img/a.png"><img src="/img/a.png">';
    await resolveLocalImagesInHtml(html, null);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('handles multiple different images in parallel', async () => {
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const html = '<img src="/img/a.png"><p>text</p><img src="/img/b.png">';
    const result = await resolveLocalImagesInHtml(html, null);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.match(/data:image\/png;base64,/g)?.length).toBe(2);
  });

  it('skips relative path with no document path', async () => {
    const html = '<img src="./relative.png">';
    const result = await resolveLocalImagesInHtml(html, null);
    expect(result).toBe(html);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not touch non-img src attributes', async () => {
    // script src in export HTML is unusual, but confirm we only match img
    const html = '<link rel="stylesheet" href="style.css"><img src="/img.png">';
    vi.mocked(invoke).mockResolvedValue(strToBytes('PNG'));
    const result = await resolveLocalImagesInHtml(html, null);
    expect(result).toContain('href="style.css"');
    expect(result).toContain('data:image/png;base64,');
  });
});
