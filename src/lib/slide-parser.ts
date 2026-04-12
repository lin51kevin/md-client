/**
 * slide-parser - Parse markdown into slides separated by ---
 * Supports Reveal.js-style metadata comments
 */

export interface SlideMetadata {
  title?: string;
  background?: string;
  transition?: string;
}

/** Split markdown content into slides by horizontal separator --- */
export function parseSlides(markdown: string): string[] {
  // Split by horizontal rule (---) but not inside code blocks
  const lines = markdown.split('\n');
  const slideContents: string[] = [];
  let currentSlide: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().match(/^(`{3,}|~{3,})/)) {
      inCodeBlock = !inCodeBlock;
    }
    if (!inCodeBlock && line.trim() === '---') {
      slideContents.push(currentSlide.join('\n').trim());
      currentSlide = [];
    } else {
      currentSlide.push(line);
    }
  }

  const lastContent = currentSlide.join('\n').trim();
  if (lastContent) {
    slideContents.push(lastContent);
  }

  return slideContents.filter(s => s.length > 0);
}

/** Extract metadata from a single slide's content */
export function extractSlideMetadata(slide: string): SlideMetadata {
  const meta: SlideMetadata = {};
  const lines = slide.split('\n');

  for (const line of lines) {
    const match = line.match(/<!--\s*\.slide:\s*(.+?)\s*-->/);
    if (!match) continue;

    const attrs = match[1];
    const bgMatch = attrs.match(/data-background=["']?([^"'\s]+)["']?/);
    if (bgMatch) meta.background = bgMatch[1];

    const transMatch = attrs.match(/data-transition=["']?(\w+)["']?/);
    if (transMatch) meta.transition = transMatch[1];
  }

  // Extract title from first heading
  for (const line of lines) {
    const titleMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (titleMatch) {
      meta.title = titleMatch[1].trim();
      break;
    }
  }

  return meta;
}
