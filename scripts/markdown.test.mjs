import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderMarkdown } from './markdown.mjs';

const fixture = name => readFileSync(new URL(`../${name}/index.md`, import.meta.url), 'utf8')
  .replace(/^\s*<head>[\s\S]*?<\/head>\s*/i, '');
const ids = html => [...html.matchAll(/<h[1-6] id="([^"]*)">/g)].map(match => match[1]);
const withoutComments = html => html.replace(/<!--[\s\S]*?-->/g, '');

// Regression checks against the original Markdown Viewer exports, not parser internals.
const legacyIds = {
  research: [
    'onpanda-efficient-annotation-of-on-policy-alignment-data-for-llms-and-agents-via-token-level-correction',
    'paper---demo---video-️--tweet---dataset---code-',
    'abstract', 'agent-trajectory-annotation', 'comparison-of-annotation-paradigms', 'resources',
  ],
  'Panda-CVL': ['abstract', 'common-questions', 'resources'],
};

for (const page of ['research', 'Panda-CVL', 'agent-trajectory-annotation']) {
  test(`${page}: preserve author HTML and legacy heading IDs`, () => {
    const source = fixture(page);
    const html = renderMarkdown(source);
    for (const match of source.matchAll(/<(script|iframe|p)\b[^>]*>[\s\S]*?<\/\1>/gi)) {
      assert.ok(html.includes(match[0]), `raw ${match[1]} must survive`);
    }
    const normalizeIndent = value => value.replace(/^ +/gm, '');
    for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) {
      assert.ok(normalizeIndent(html).includes(normalizeIndent(match[0])), 'comments stay opaque');
    }
    assert.doesNotMatch(withoutComments(html), /^ {0,3}(?:#{1,6}\s|```)/m);
    if (legacyIds[page]) assert.deepEqual(ids(html), legacyIds[page]);
  });
}

test('legacy title layout, hard breaks, emphasis and nested resources', () => {
  const cvl = renderMarkdown(fixture('Panda-CVL'));
  assert.match(cvl, /<p><span[^>]*>Can LLMs[^]*?<\/span>\n<br>\n<span[^>]*>Panda-CVL[^]*?<\/span><\/p>/);
  assert.match(cvl, /pure text\?<br>\s*A1:/);
  assert.doesNotMatch(withoutComments(cvl), /Leaderboard|Abstract 中文/);
  const research = renderMarkdown(fixture('research'));
  assert.match(research, /<em><strong>Contributions of this paper:<\/strong><\/em>/);
  assert.match(research, /Zheng Ge<sup>1<\/sup><br>\s*Kang An/);
  assert.match(research, /<li><a href="https:\/\/github.com\/on-panda\/Panda-MultiRef-21">[^]*?<ul>\s*<li><a[^>]*><strong>Browse dataset &amp; try annotation online<\/strong>/);
});

test('agent code stays exact while Prism adds syntax highlighting', () => {
  const source = fixture('agent-trajectory-annotation');
  const html = renderMarkdown(source);
  assert.match(html, /<code>&lt;\/think&gt;<\/code>/);
  assert.equal((html.match(/<iframe\b/g) ?? []).length, 1);
  const code = /<pre class="language-json"[^>]*><code class="language-json">([^]*?)<\/code><\/pre>/.exec(html)?.[1];
  assert.ok(code);
  assert.match(code, /class="token property"/);
  const plain = code.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g,
    (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[key]);
  assert.equal(plain, /^```json\n([\s\S]*?)^```$/m.exec(source)[1]);
});

test('upstream GFM, reference links, URL autolinking and per-document slug reset', () => {
  const html = renderMarkdown('# Hello\n\n## Hello\n\n~~removed~~ [docs][ref]\n\n[ref]: https://example.org\n\nwww.example.org\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');
  assert.deepEqual(ids(html), ['hello', 'hello-1']);
  assert.deepEqual(ids(renderMarkdown('# Hello')), ['hello']);
  assert.match(html, /<del>removed<\/del>/);
  assert.match(html, /<a href="https:\/\/example.org">docs<\/a>/);
  assert.match(html, /<a href="http:\/\/www.example.org">/);
  assert.match(html, /<table>/);
  assert.match(renderMarkdown('```unknown\n<script>alert(1)</script>\n```'), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
