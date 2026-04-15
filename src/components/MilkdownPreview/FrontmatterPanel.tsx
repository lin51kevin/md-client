/**
 * FrontmatterPanel — Read-only React component for displaying YAML frontmatter.
 *
 * Rendered above the Milkdown editor instead of DOM manipulation inside ProseMirror.
 */

import React from 'react';
import type { Frontmatter } from '../../lib/markdown-extensions';

interface FrontmatterPanelProps {
  frontmatter: Frontmatter;
}

export const FrontmatterPanel: React.FC<FrontmatterPanelProps> = React.memo(
  function FrontmatterPanel({ frontmatter }) {
    const keys = Object.keys(frontmatter);
    if (keys.length === 0) return null;

    return (
      <div className="frontmatter-block" aria-label="Document metadata">
        <table className="fm-table">
          <tbody>
            {keys.map((key) => {
              const val = frontmatter[key];
              const displayVal = Array.isArray(val)
                ? (val as string[]).join(', ')
                : String(val);
              return (
                <tr key={key}>
                  <th className="fm-key">{key}</th>
                  <td className="fm-val">{displayVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
);
