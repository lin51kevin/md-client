import React, { useEffect, useRef, useMemo } from 'react';

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
    return <RenderMethodPanel content={content as { render: () => unknown }} />;
  }

  // Case 3: DOM element-based panel
  return <DOMPanelMount content={content} />;
}

/**
 * Renders content from an object with a render() method.
 * Wraps render() in a stable React component so any hooks the plugin
 * calls inside render() run in a valid React component context.
 * useMemo on [content] ensures we don't create a new component *type*
 * on every parent re-render (which would force remounting).
 */
function RenderMethodPanel({ content }: { content: { render: () => unknown } }) {
  const Comp = useMemo(
    () =>
      function PanelContent() {
        const result = content.render();
        if (React.isValidElement(result)) return result as React.ReactElement;
        if (typeof result === 'function') {
          const Inner = result as React.FunctionComponent;
          return <Inner />;
        }
        // Handle nested render() objects: plugin's options.render() returned a class instance
        // (e.g. AICopilotPanelContent) whose own .render() returns the React component.
        // Also propagate callback props (onClose, onDragStart) from the outer wrapper to
        // the inner instance so FloatingPanel wiring reaches the actual component.
        if (
          result != null &&
          typeof result === 'object' &&
          'render' in result &&
          typeof (result as { render?: unknown }).render === 'function'
        ) {
          // Propagate any callback props set on the outer wrapper to the inner instance.
          const outer = content as Record<string, unknown>;
          const inner = result as Record<string, unknown>;
          for (const key of ['onClose', 'onDragStart'] as const) {
            if (outer[key] !== undefined) inner[key] = outer[key];
          }
          const nested = (result as { render: () => unknown }).render();
          if (React.isValidElement(nested)) return nested as React.ReactElement;
          if (typeof nested === 'function') {
            const Inner = nested as React.FunctionComponent;
            return <Inner />;
          }
           
          console.warn('[SidebarRenderer] Unsupported nested render result:', nested);
        }
        return null;
      },
    [content]
  );

  return <Comp />;
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
