import { describe, expect, it } from 'vitest';
import { DOMParser } from 'linkedom';
import { createTurndownService } from '../../../lib/markdown/html-import-core';

describe('HTML Import — linkedom compatibility', () => {
  it('converts table nodes without relying on rows/cells collections', () => {
    const doc = new DOMParser().parseFromString(
      `
        <div id="root">
          <table>
            <thead><tr><th>Name</th><th>Age</th></tr></thead>
            <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
          </table>
        </div>
      `,
      'text/html',
    );
    const root = doc.querySelector('#root');

    expect(root).not.toBeNull();

    const result = createTurndownService().turndown(root!);

    expect(result).toContain('| Name | Age |');
    expect(result).toContain('| Alice | 30 |');
  });
});
