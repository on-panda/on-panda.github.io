import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderMarkdown, escapeHtml } from './markdown.mjs';

const render = source => renderMarkdown(source).trimEnd();
const fixture = name => readFileSync(new URL(`../${name}/index.md`, import.meta.url), 'utf8')
  .replace(/^\s*<head>[\s\S]*?<\/head>\s*/i, '');
const ids = html => Array.from(html.matchAll(/<h[1-6] id="([^"]*)">/g), match => match[1]);
const withoutComments = html => html.replace(/<!--[\s\S]*?-->/g, '');

// These IDs were read from the old HTML bodies before replacing their build path.
const legacyIds = {
  research: [
    'onpanda-efficient-annotation-of-on-policy-alignment-data-for-llms-and-agents-via-token-level-correction',
    'paper---demo---video-️--tweet---dataset---code-',
    'abstract', 'agent-trajectory-annotation', 'comparison-of-annotation-paradigms', 'resources',
  ],
  'Panda-CVL': ['abstract', 'common-questions', 'resources'],
};

for (const page of ['research', 'Panda-CVL', 'agent-trajectory-annotation']) {
  test(`current content: ${page} renders without losing trusted HTML`, () => {
    const source = fixture(page);
    const html = renderMarkdown(source);
    assert.ok(html.length > source.length * 0.8);
    assert.doesNotMatch(html, /<head>|<title>|&lt;(?:div|span|iframe|script|style)\b/);
    for (const match of source.matchAll(/<(script|style|iframe|p)\b[^>]*>[\s\S]*?<\/\1>/gi)) {
      assert.ok(html.includes(match[0]), `raw ${match[1]} must survive exactly`);
    }
    // List indentation is structural and may be removed; comment content is opaque.
    const normalizeIndent = value => value.replace(/^ +/gm, '');
    for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) {
      assert.ok(normalizeIndent(html).includes(normalizeIndent(match[0])), 'comment must survive without Markdown compilation');
    }
    assert.doesNotMatch(withoutComments(html), /^ {0,3}(?:#{1,6}\s|```|~~~)/m);
    if (legacyIds[page]) assert.deepEqual(ids(html), legacyIds[page]);
  });
}

test('research contributions, authors, navigation, and commented nested resources', () => {
  const html = renderMarkdown(fixture('research'));
  assert.match(html, /<em><strong>Contributions of this paper:<\/strong><\/em>/);
  assert.match(html, /Zheng Ge<sup>1<\/sup><br>\nKang an/);
  assert.match(html, /<h3 id="paper---demo---video-️--tweet---dataset---code-">/);
  assert.match(html, /<li><a href="https:\/\/github.com\/on-panda\/Panda-MultiRef-21">Panda-MultiRef-21<\/a>[^]*?<ul>\n<li><a[^>]*><strong>Browse dataset &amp; try annotation online<\/strong><\/a><\/li>/);
  assert.doesNotMatch(withoutComments(html), /Panda-CVL-train|panda\.json.*example/);
  assert.equal((withoutComments(html).match(/<hr>/g) ?? []).length, 4);
});

test('inline HTML does not split paragraphs or add margins between title lines', () => {
  const title = '<span>First title</span>\n<br>\n<span>Second title</span>';
  assert.equal(render(title), `<p>${title}</p>`);
  const inline = 'Text\n<img src="image.png">\n<a href="page.html">link</a>';
  assert.equal(render(inline), `<p>${inline}</p>`);
  assert.equal(render('Text\n\n<br>\n\nNext'), '<p>Text</p>\n<br>\n<p>Next</p>');
  const html = renderMarkdown(fixture('Panda-CVL'));
  assert.match(html, /<p><span[^>]*>Can LLMs[^]*?<\/span>\n<br>\n<span[^>]*>Panda-CVL[^]*?<\/span><\/p>/);
});

test('Panda-CVL hard breaks, code in link labels, and hidden headings', () => {
  const html = renderMarkdown(fixture('Panda-CVL'));
  assert.match(html, /Panda-CVL<br>\nFor details/);
  assert.match(html, /pure text\?<br>\nA1:/);
  assert.match(html, /<a href="[^"]+panda_json"><code>panda.json<\/code> example<\/a>/);
  assert.doesNotMatch(withoutComments(html), /Leaderboard|Abstract 中文/);
});

test('agent page reasoning token, formatted link labels, JSON fence and nested list', () => {
  const source = fixture('agent-trajectory-annotation');
  const html = renderMarkdown(source);
  assert.match(html, /<code>&lt;\/think&gt;<\/code>/);
  assert.match(html, /<a href="https:\/\/github.com\/on-panda\/on-panda-docs\/blob\/main\/content\/en\/panda_json_format\.md"><code>\.panda.json<\/code> Data Format Specification<\/a>/);
  assert.match(html, /<a href="https:\/\/github.com\/on-panda\/on-panda-docs\/blob\/main\/content\/en\/API_compatibility\.md">API Compatibility<\/a>/);
  assert.match(html, /<a href="https:\/\/github.com\/on-panda\/on-panda-python">Python library <code>onpanda<\/code><\/a>/);
  const json = /^```json\n([\s\S]*?)^```$/m.exec(source)[1];
  assert.ok(html.includes(`<pre><code class="language-json">${escapeHtml(json)}</code></pre>`));
  assert.equal(JSON.parse(json).dialogs['1'].tool_configs[0].require_approval, 'always');
  assert.match(html, /<li><strong>Existing agent harness integration<\/strong>[^]*?<ul>\n<li><code>harness_to_mcp<\/code>/);
  assert.equal(ids(html)[0], 'efficient-agent-trajectory-annotation-with-onpanda');
  assert.equal((html.match(/<iframe\b/g) ?? []).length, 1);
});

test('paragraphs, soft breaks, hard breaks, CRLF, escaping and entities', () => {
  assert.equal(render('One & two < three\nsoft  \nhard\\\nline\n\nSecond &nbsp; &#169; &amp;.'),
    '<p>One &amp; two &lt; three\nsoft<br>\nhard<br>\nline</p>\n<p>Second &nbsp; &#169; &amp;.</p>');
  assert.equal(render('a\r\nb\r\n\r\nc'), '<p>a\nb</p>\n<p>c</p>');
  assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(renderMarkdown(' \n\t\n'), '');
  assert.throws(() => renderMarkdown(null), TypeError);
});

test('headings use visible label text, preserve Unicode, and avoid collisions per document', () => {
  assert.equal(render('# [**Hello** `world`](https://example.org) & 中文!\n\n## Hello\n\n## Hello\n\n## Hello-1\n\n## Hello'),
    '<h1 id="hello-world--中文"><a href="https://example.org"><strong>Hello</strong> <code>world</code></a> &amp; 中文!</h1>\n' +
    '<h2 id="hello">Hello</h2>\n<h2 id="hello-1">Hello</h2>\n<h2 id="hello-1-1">Hello-1</h2>\n<h2 id="hello-2">Hello</h2>');
  assert.equal(render('# Hello ###\n\nSetext\n===\n\nSmall\n---'),
    '<h1 id="hello">Hello</h1>\n<h1 id="setext">Setext</h1>\n<h2 id="small">Small</h2>');
  assert.equal(render('# Hello'), '<h1 id="hello">Hello</h1>');
  assert.equal(render('###'), '<h3 id=""></h3>');
});

test('bold, italics, triple delimiters, nesting, punctuation and literal underscores', () => {
  const cases = [
    ['**bold**', '<strong>bold</strong>'], ['*italic*', '<em>italic</em>'],
    ['***both***', '<em><strong>both</strong></em>'], ['___both___', '<em><strong>both</strong></em>'],
    ['**bold and *italic***', '<strong>bold and <em>italic</em></strong>'],
    ['*italic and **bold***', '<em>italic and <strong>bold</strong></em>'],
    ['**one** and **two**', '<strong>one</strong> and <strong>two</strong>'],
    ['x_y_z tool_calls', 'x_y_z tool_calls'], ['a*b*c', 'a<em>b</em>c'],
    ['\\*literal\\* and \\_literal\\_', '*literal* and _literal_'],
    ['** missing and * open', '** missing and * open'],
    ['(**yes**)', '(<strong>yes</strong>)'],
  ];
  for (const [source, expected] of cases) assert.equal(render(source), `<p>${expected}</p>`, source);
});

test('inline code is opaque and preserves exact content with matching backtick runs', () => {
  assert.equal(render('`</think> &amp; **not bold**`'), '<p><code>&lt;/think&gt; &amp;amp; **not bold**</code></p>');
  assert.equal(render('`` `nested` & <tag> ``'), '<p><code> `nested` &amp; &lt;tag&gt; </code></p>');
  assert.equal(render('`a  \nb` and `unclosed'), '<p><code>a  \nb</code> and `unclosed</p>');
  assert.equal(render('`<!--\n\n# literal\n-->`'), '<p><code>&lt;!--\n\n# literal\n--&gt;</code></p>');
});

test('links balance URL parentheses and render code, emphasis and nested brackets in labels', () => {
  assert.equal(render('[`file` **docs** [v2]](https://example.org/a(b(c))?x=1&y=2 "A \\"quote\\"")'),
    '<p><a href="https://example.org/a(b(c))?x=1&amp;y=2" title="A &quot;quote&quot;"><code>file</code> <strong>docs</strong> [v2]</a></p>');
  assert.equal(render('[label](<path with spaces/a(b)> \'title\') and [empty]()'),
    '<p><a href="path with spaces/a(b)" title="title">label</a> and <a href="">empty</a></p>');
  assert.equal(render('[escape](a\\(b\\)) and [entity](?x=1&amp;y=2)'),
    '<p><a href="a(b)">escape</a> and <a href="?x=1&amp;y=2">entity</a></p>');
  assert.equal(render('<https://example.org/a?b=1&c=2>'),
    '<p><a href="https://example.org/a?b=1&amp;c=2">https://example.org/a?b=1&amp;c=2</a></p>');
});

test('images escape attributes and derive alt text from inline content', () => {
  assert.equal(render('![A **bold** `tag` & "quote"](img/a(b).png "Title")'),
    '<p><img src="img/a(b).png" alt="A bold tag &amp; &quot;quote&quot;" title="Title"></p>');
  assert.equal(render('[![logo](logo.png)](https://example.org)'),
    '<p><a href="https://example.org"><img src="logo.png" alt="logo"></a></p>');
});

test('fenced code carries language, escapes HTML, and ignores Markdown/comments', () => {
  const source = '```html extra-info\n<script>"x" & \'y\'</script>\n\n<!-- **raw** -->\n```\n\nafter';
  assert.equal(render(source), '<pre><code class="language-html">&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;\n\n&lt;!-- **raw** --&gt;\n</code></pre>\n<p>after</p>');
  assert.equal(render('~~~~js\n```\n~~~\n~~~~'), '<pre><code class="language-js">```\n~~~\n</code></pre>');
  assert.equal(render('```\nunclosed'), '<pre><code>unclosed\n</code></pre>');
  assert.equal(render('  ```text\n  a\n  ```'), '<pre><code class="language-text">a\n</code></pre>');
});

test('trusted div wrappers allow blank-separated Markdown without compiling raw HTML', () => {
  const source = '<div class="outer">\n<div data-label="a > b">\nraw **text**\n</div>\n\n# Heading\n\n**paragraph**\n\n</div>';
  assert.equal(render(source), '<div class="outer">\n<div data-label="a > b">\nraw **text**\n</div>\n<h1 id="heading">Heading</h1>\n<p><strong>paragraph</strong></p>\n</div>');
  assert.equal(render('<div\n class="outer">\n\n# Heading\n\n</div>'),
    '<div\n class="outer">\n<h1 id="heading">Heading</h1>\n</div>');
});

test('raw p/span/iframe/script/style and multiline attributes remain opaque across blank lines', () => {
  for (const tag of ['p', 'span', 'iframe', 'script', 'style']) {
    const raw = `<${tag}\n data-label="a > b">\n**do not compile**\n\n# still raw\n</${tag}>`;
    const html = render(`${raw}\n\n# Visible`);
    assert.equal(html, `${tag === 'span' ? `<p>${raw}</p>` : raw}\n<h1 id="visible">Visible</h1>`, tag);
  }
  assert.equal(render('Hello <span>**raw** <span>*nested*</span></span>.'),
    '<p>Hello <span>**raw** <span>*nested*</span></span>.</p>');
  const nested = '<div>\n<script>\nconst s = "<span>";\n\n// **not markdown**\n</script>\n</div>';
  assert.equal(render(nested), nested);
});

test('block and inline HTML comments stay exact across blank lines and Markdown syntax', () => {
  const comment = '<!--\n# Not a heading\n\n- not a list\n\n**not bold** `not code`\n-->';
  assert.equal(render(`${comment}\n# Visible`), `${comment}\n<h1 id="visible">Visible</h1>`);
  assert.equal(render(`before ${comment} after\n\nnext`), `<p>before ${comment} after</p>\n<p>next</p>`);
  assert.equal(render('<!-- unterminated\n\n# hidden'), '<!-- unterminated\n\n# hidden');
});

test('four-space nested unordered/ordered lists and unindented embedded comments', () => {
  assert.equal(render('- parent\n    3. third\n        - deep\n    4. fourth\n<!-- hidden\n\n- not a sibling\n-->\n- next'),
    '<ul>\n<li>parent\n<ol start="3">\n<li>third\n<ul>\n<li>deep</li>\n</ul></li>\n<li>fourth\n<!-- hidden\n\n- not a sibling\n--></li>\n</ol></li>\n<li>next</li>\n</ul>');
  assert.equal(render('1. parent\n    - child\n2. next'),
    '<ol>\n<li>parent\n<ul>\n<li>child</li>\n</ul></li>\n<li>next</li>\n</ol>');
});

test('loose lists, continued paragraphs and fenced code within list items', () => {
  assert.equal(render('- one\n\n- two'), '<ul>\n<li><p>one</p></li>\n<li><p>two</p></li>\n</ul>');
  assert.equal(render('- one\n\n  another paragraph\n- two'),
    '<ul>\n<li><p>one</p>\n<p>another paragraph</p></li>\n<li><p>two</p></li>\n</ul>');
  assert.equal(render('- code\n  ```html\n  <b>x</b>\n  ```\n- next'),
    '<ul>\n<li>code\n<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;\n</code></pre></li>\n<li>next</li>\n</ul>');
});

test('list fences preserve JSON whitespace and do not parse comment or sibling markers', () => {
  const json = '{\n\n\n  "tool_configs": [],\n  "note": "<!-- literal"\n}';
  const source = '- parent\n  - config\n    ```json\n' + json.split('\n').map(line => `    ${line}`).join('\n') +
    '\n    ```\n  - next\n- last';
  assert.equal(render(source), '<ul>\n<li>parent\n<ul>\n<li>config\n' +
    `<pre><code class="language-json">${escapeHtml(json)}\n</code></pre></li>\n` +
    '<li>next</li>\n</ul></li>\n<li>last</li>\n</ul>');
  assert.equal(render('- code\n  ```text\n  <!-- literal\n\n  - not a list\n  ```\n- next'),
    '<ul>\n<li>code\n<pre><code class="language-text">&lt;!-- literal\n\n- not a list\n</code></pre></li>\n<li>next</li>\n</ul>');
  assert.equal(render('- ```text\n  <!-- literal\n  ```\n- next'),
    '<ul>\n<li><pre><code class="language-text">&lt;!-- literal\n</code></pre></li>\n<li>next</li>\n</ul>');
});

test('malformed HTML and fence starts still advance to subsequent blocks', () => {
  for (const prefix of ['<div', '<p data-label="unterminated', '<a', '```bad`info', '[unclosed](url', '`unclosed']) {
    const html = render(`${prefix}\n\n# Visible`);
    assert.ok(html.includes('<h1 id="visible">Visible</h1>'), prefix);
  }
});

test('thematic breaks and explicit nested blockquotes', () => {
  assert.equal(render('---\n\n***\n\n_ _ _'), '<hr>\n<hr>\n<hr>');
  assert.equal(render('> **quote**\n>\n> > nested\n>\n> - item'),
    '<blockquote>\n<p><strong>quote</strong></p>\n<blockquote>\n<p>nested</p>\n</blockquote>\n<ul>\n<li>item</li>\n</ul>\n</blockquote>');
});

test('GFM-style tables support alignment, escaped pipes, code pipes and inline formatting', () => {
  assert.equal(render('| Left | Center | Right |\n| :--- | :---: | ---: |\n| **bold** | a\\|b | `x|y` |'),
    '<table>\n<thead>\n<tr><th align="left">Left</th><th align="center">Center</th><th align="right">Right</th></tr>\n</thead>\n<tbody>\n<tr><td align="left"><strong>bold</strong></td><td align="center">a|b</td><td align="right"><code>x|y</code></td></tr>\n</tbody>\n</table>');
  assert.equal(render('A | B\n--- | ---\n1 | 2'),
    '<table>\n<thead>\n<tr><th>A</th><th>B</th></tr>\n</thead>\n<tbody>\n<tr><td>1</td><td>2</td></tr>\n</tbody>\n</table>');
});
