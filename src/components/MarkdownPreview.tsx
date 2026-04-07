import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css';
import { rehypeFilterInvalidElements } from '../lib/rehypeFilterInvalidElements';

// Stable plugin arrays (module-level) to avoid unnecessary ReactMarkdown re-renders
const REMARK_PLUGINS = [remarkGfm, remarkDirective, remarkDirectiveRehype];
const REHYPE_PLUGINS = [rehypeHighlight, rehypeRaw, rehypeFilterInvalidElements];

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
