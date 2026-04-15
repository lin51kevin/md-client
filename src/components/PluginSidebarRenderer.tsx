import React, { useEffect, useRef } from 'react';

interface PluginSidebarRendererProps {
  content: unknown;
}

/**
 * Renders plugin-registered sidebar panel content.
 *
 * Handles three content types produced by plugins:
 * 1. React elements (returned directly by render())
 * 2. Class instances whose render() returns a React component function or element
 * 3. DOM-based panels (class instances with an HTMLElement root like _root / element / el)
 */
export function PluginSidebarRenderer({ content }: PluginSidebarRendererProps) {
  // Case 1: React element
  if (React.isValidElement(content)) {
    return content;
  }

  // Case 2: Object with render() method
  if (
    content != null &&
    typeof content === 'object' &&
    'render' in content &&
    typeof (content as Record<string, unknown>).render === 'function'
  ) {
    const rendered = (content as { render: () => unknown }).render();
    if (React.isValidElement(rendered)) return rendered;
    if (typeof rendered === 'function') return React.createElement(rendered as React.FunctionComponent);
  }

  // Case 3: DOM element-based panel
  return <DOMPanelMount content={content} />;
}

function DOMPanelMount({ content }: { content: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const domNode =
      (content instanceof HTMLElement ? content : null) ??
      (content as Record<string, unknown> | null)?._root ??
      (content as Record<string, unknown> | null)?.element ??
      (content as Record<string, unknown> | null)?.el;

    if (domNode instanceof HTMLElement) {
      el.appendChild(domNode);
      return () => {
        if (domNode.parentElement === el) {
          el.removeChild(domNode);
        }
      };
    }
  }, [content]);

  return <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }} />;
}
