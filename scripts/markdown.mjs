// Markdown Viewer's Marked pipeline and versions; see package.json and README.
// Author HTML is intentionally enabled: only build trusted repository content.
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import markedLinkifyIt from 'marked-linkify-it';
import Prism from 'prismjs';
import loadLanguages from 'prismjs/components/index.js';

loadLanguages();

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

const markdown = new Marked(
  { gfm: true, breaks: false, pedantic: false },
  gfmHeadingId(),
  markedLinkifyIt(),
  {
    renderer: {
      // Produce Prism's token markup at build time rather than in the browser.
      code(code, info = '') {
        const language = info.trim().split(/\s+/)[0];
        const grammar = Prism.languages[language];
        const html = grammar ? Prism.highlight(code, grammar, language) : escapeHtml(code);
        const css = language ? ` class="language-${escapeHtml(language)}"` : '';
        return `<pre${css} tabindex="0"><code${css}>${html}\n</code></pre>\n`;
      },
    },
  },
);

export function renderMarkdown(source) {
  return markdown.parse(source);
}
