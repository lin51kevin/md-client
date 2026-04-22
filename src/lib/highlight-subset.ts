/**
 * Curated highlight.js language subset with two-tier loading.
 *
 * This module is aliased to "highlight.js" in vite.config.ts so that
 * rehype-highlight (which does `import hljs from 'highlight.js'`) picks up
 * only the languages we need instead of the full ~190-language bundle.
 *
 * Tier 1 (synchronous ~10 languages): always ready from first render.
 * Tier 2 (async idle ~17 languages): loaded via requestIdleCallback after
 *   initial paint — reduces synchronous JS parse on startup by ~50 KB.
 *
 * To add a language: import from 'highlight.js/lib/languages/<name>'
 * and call hljs.registerLanguage('name', langModule).
 */

import hljs from "highlight.js/lib/core";

// ── Tier 1: Synchronous — always available from first render ─────────────────
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("svg", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);

// ── Tier 2: Async idle — loaded in background after initial paint ─────────────
async function loadTier2Languages(): Promise<void> {
  const [shell, java, cpp, c, rust, go, diff, plaintext, dockerfile, ini, makefile, ruby, php, swift, kotlin, scss, less] = await Promise.all([
    import("highlight.js/lib/languages/shell"),
    import("highlight.js/lib/languages/java"),
    import("highlight.js/lib/languages/cpp"),
    import("highlight.js/lib/languages/c"),
    import("highlight.js/lib/languages/rust"),
    import("highlight.js/lib/languages/go"),
    import("highlight.js/lib/languages/diff"),
    import("highlight.js/lib/languages/plaintext"),
    import("highlight.js/lib/languages/dockerfile"),
    import("highlight.js/lib/languages/ini"),
    import("highlight.js/lib/languages/makefile"),
    import("highlight.js/lib/languages/ruby"),
    import("highlight.js/lib/languages/php"),
    import("highlight.js/lib/languages/swift"),
    import("highlight.js/lib/languages/kotlin"),
    import("highlight.js/lib/languages/scss"),
    import("highlight.js/lib/languages/less"),
  ]);

  hljs.registerLanguage("shell", shell.default);
  hljs.registerLanguage("sh", shell.default);
  hljs.registerLanguage("java", java.default);
  hljs.registerLanguage("cpp", cpp.default);
  hljs.registerLanguage("c", c.default);
  hljs.registerLanguage("rust", rust.default);
  hljs.registerLanguage("rs", rust.default);
  hljs.registerLanguage("go", go.default);
  hljs.registerLanguage("diff", diff.default);
  hljs.registerLanguage("plaintext", plaintext.default);
  hljs.registerLanguage("text", plaintext.default);
  hljs.registerLanguage("dockerfile", dockerfile.default);
  hljs.registerLanguage("docker", dockerfile.default);
  hljs.registerLanguage("ini", ini.default);
  hljs.registerLanguage("toml", ini.default);
  hljs.registerLanguage("makefile", makefile.default);
  hljs.registerLanguage("ruby", ruby.default);
  hljs.registerLanguage("rb", ruby.default);
  hljs.registerLanguage("php", php.default);
  hljs.registerLanguage("swift", swift.default);
  hljs.registerLanguage("kotlin", kotlin.default);
  hljs.registerLanguage("kt", kotlin.default);
  hljs.registerLanguage("scss", scss.default);
  hljs.registerLanguage("less", less.default);
}

// Start loading Tier 2 on the browser's first idle window.
// Falls back to a 200ms timeout in environments without requestIdleCallback.
if (typeof requestIdleCallback !== "undefined") {
  requestIdleCallback(() => { loadTier2Languages().catch(() => {}); });
} else {
  setTimeout(() => { loadTier2Languages().catch(() => {}); }, 200);
}

export default hljs;
