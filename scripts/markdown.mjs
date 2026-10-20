/**
 * Small, dependency-free renderer for this site's trusted author Markdown.
 * HTML is deliberately NOT sanitized: never use this for untrusted input.
 * Raw HTML blocks end at a blank line (so Markdown works inside <div>);
 * comments and paired non-container HTML, including script/style, stay opaque.
 * Supports ATX/setext headings, emphasis, code, inline links/images, lists,
 * thematic breaks, explicit blockquotes, and simple GFM-style pipe tables.
 * Not full CommonMark: no reference links, indented code, footnotes, task lists,
 * bare-URL autolinking, or full lazy-list/blockquote and delimiter edge cases.
 * List indentation uses spaces; code-span contents are preserved verbatim.
 */

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Preserve existing author entities in normal text/attributes, not in code.
const escapeText = value => value.replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)|[<>]/gi,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const attribute = value => escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const unescapeMarkdown = value => value.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, '$1');
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function plainText(html) {
  return html.replace(/<!--[\s\S]*?-->|<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, entity) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? all;
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '\uFFFD';
  });
}

const containers = new Set(['div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav', 'details']);
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const blockTags = /^(?:address|article|aside|blockquote|details|dialog|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|iframe|main|nav|ol|p|pre|script|section|style|table|textarea|ul)$/i;

function htmlTag(text, at) {
  const match = /^<\/?([a-z][\w:-]*)(?=[\s/>])(?:[^<>"']|"[^"]*"|'[^']*')*>/i.exec(text.slice(at));
  return match && { text: match[0], name: match[1].toLowerCase(), closing: /^<\//.test(match[0]) };
}

// Return an opaque HTML island; containers are only opening/closing tags.
function rawHtml(text, at) {
  if (text.startsWith('<!--', at)) {
    const close = text.indexOf('-->', at + 4);
    return text.slice(at, close < 0 ? text.length : close + 3);
  }
  const tag = htmlTag(text, at);
  if (!tag) return null;
  if (tag.closing || containers.has(tag.name) || voidTags.has(tag.name) || /\/>$/.test(tag.text)) return tag.text;
  const re = new RegExp(`<(/?)${tag.name}(?=[\\s/>])`, 'gi');
  re.lastIndex = at + tag.text.length;
  let depth = 1, match;
  while ((match = re.exec(text))) {
    const next = htmlTag(text, match.index);
    if (!next) continue;
    // Raw-text elements cannot contain nested HTML elements of their own name.
    if (match[1]) depth--;
    else if (!['script', 'style', 'textarea'].includes(tag.name) && !/\/>$/.test(next.text)) depth++;
    if (!depth) return text.slice(at, match.index + next.text.length);
    re.lastIndex = match.index + next.text.length;
  }
  // Unclosed raw-text blocks consume the remainder, as in HTML/CommonMark.
  return ['script', 'style', 'pre', 'textarea', 'iframe'].includes(tag.name) ? text.slice(at) : tag.text;
}

function codeSpan(text, at) {
  const marks = /^`+/.exec(text.slice(at))?.[0];
  if (!marks) return null;
  let cursor = at + marks.length;
  while (cursor < text.length) {
    const next = text.indexOf('`', cursor);
    if (next < 0) return null;
    const run = /^`+/.exec(text.slice(next))[0];
    if (run.length === marks.length) return { content: text.slice(at + marks.length, next), end: next + run.length };
    cursor = next + run.length;
  }
  return null;
}

function inlineLink(text, at) {
  const image = text.startsWith('![', at);
  const start = at + (image ? 2 : 1);
  let depth = 1, i = start;
  for (; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === '`') {
      const code = codeSpan(text, i);
      if (code) { i = code.end - 1; continue; }
    }
    if (text[i] === '[') depth++;
    if (text[i] === ']' && --depth === 0) break;
  }
  if (depth || text[i + 1] !== '(') return null;
  const label = text.slice(start, i);
  i += 2;
  while (i < text.length && /\s/.test(text[i])) i++;
  let url = '';
  if (text[i] === '<') {
    const begin = ++i;
    while (i < text.length && text[i] !== '>') {
      if (text[i] === '\\') i++;
      i++;
    }
    if (text[i] !== '>') return null;
    url = text.slice(begin, i++);
  } else {
    const begin = i;
    let nested = 0;
    for (; i < text.length; i++) {
      if (text[i] === '\\') { i++; continue; }
      if (text[i] === '(') nested++;
      else if (text[i] === ')') {
        if (!nested) break;
        nested--;
      } else if (/\s/.test(text[i]) && !nested) break;
    }
    if (nested) return null;
    url = text.slice(begin, i);
  }
  const beforeSpace = i;
  while (i < text.length && /\s/.test(text[i])) i++;
  let title;
  if (i > beforeSpace && /["'(]/.test(text[i] ?? '') && i < text.length) {
    const quote = text[i] === '(' ? ')' : text[i];
    const begin = ++i;
    while (i < text.length && text[i] !== quote) {
      if (text[i] === '\\') i++;
      i++;
    }
    if (text[i] !== quote) return null;
    title = unescapeMarkdown(text.slice(begin, i++));
    while (i < text.length && /\s/.test(text[i])) i++;
  }
  return text[i] === ')' ? { image, label, url: unescapeMarkdown(url), title, end: i + 1 } : null;
}

function renderInline(text, allowLinks = true) {
  const tokens = [];
  const emit = html => tokens.push({ html });
  for (let i = 0; i < text.length;) {
    const c = text[i];
    if (c === '\\' && (/[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/.test(text[i + 1] ?? '') || text[i + 1] === '\n')) {
      emit(text[i + 1] === '\n' ? '<br>\n' : escapeText(text[i + 1]));
      i += 2; continue;
    }
    if (c === '`') {
      const code = codeSpan(text, i);
      if (code) { emit(`<code>${escapeHtml(code.content)}</code>`); i = code.end; continue; }
      const run = /^`+/.exec(text.slice(i))[0];
      emit(run); i += run.length; continue;
    }
    if ((c === '[' && allowLinks) || text.startsWith('![', i)) {
      const link = inlineLink(text, i);
      if (link) {
        const label = renderInline(link.label, false);
        const title = link.title === undefined ? '' : ` title="${attribute(link.title)}"`;
        emit(link.image ? `<img src="${attribute(link.url)}" alt="${attribute(plainText(label))}"${title}>`
          : `<a href="${attribute(link.url)}"${title}>${label}</a>`);
        i = link.end; continue;
      }
    }
    if (c === '<') {
      const auto = /^<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+)>/.exec(text.slice(i));
      if (auto && allowLinks) {
        emit(`<a href="${attribute(auto[1])}">${escapeText(auto[1].replace(/^mailto:/, ''))}</a>`);
        i += auto[0].length; continue;
      }
      const raw = rawHtml(text, i);
      if (raw) { emit(raw); i += raw.length; continue; }
    }
    if (c === '*' || c === '_') {
      const run = new RegExp(`^\\${c}+`).exec(text.slice(i))[0];
      const before = text[i - 1] ?? ' ', after = text[i + run.length] ?? ' ';
      const beforeSpace = /\s/.test(before), afterSpace = /\s/.test(after);
      const beforePunct = /[\p{P}\p{S}]/u.test(before), afterPunct = /[\p{P}\p{S}]/u.test(after);
      const left = !afterSpace && (!afterPunct || beforeSpace || beforePunct);
      const right = !beforeSpace && (!beforePunct || afterSpace || afterPunct);
      tokens.push({ char: c, count: run.length, remaining: run.length, opens: [], closes: [],
        canOpen: left && (c !== '_' || !right || beforePunct),
        canClose: right && (c !== '_' || !left || afterPunct) });
      i += run.length; continue;
    }
    const hardBreak = /^ {2,}\n/.exec(text.slice(i));
    if (hardBreak) { emit('<br>\n'); i += hardBreak[0].length; continue; }
    // Keep entities together so they are not double-escaped character by character.
    const entity = c === '&' && /^&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/i.exec(text.slice(i));
    if (entity) { emit(entity[0]); i += entity[0].length; continue; }
    emit(escapeText(c)); i++;
  }
  const openers = [];
  for (const token of tokens) {
    if (!token.char) continue;
    if (token.canClose) {
      while (token.remaining) {
        let k = openers.length - 1;
        for (; k >= 0; k--) {
          const open = openers[k];
          if (open.char !== token.char) continue;
          if ((token.canOpen || open.canClose) && (open.count + token.count) % 3 === 0 &&
              (open.count % 3 !== 0 || token.count % 3 !== 0)) continue;
          break;
        }
        if (k < 0) break;
        const open = openers[k], n = Math.min(open.remaining, token.remaining) >= 2 ? 2 : 1;
        const tag = n === 2 ? 'strong' : 'em';
        open.opens.unshift(`<${tag}>`); token.closes.push(`</${tag}>`);
        open.remaining -= n; token.remaining -= n;
        openers.length = open.remaining ? k + 1 : k;
      }
    }
    if (token.canOpen && token.remaining) openers.push(token);
  }
  return tokens.map(t => t.html ?? t.closes.join('') + t.char.repeat(t.remaining) + t.opens.join('')).join('');
}

const blank = line => /^\s*$/.test(line);
function fenceStart(line) {
  const fence = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/.exec(line);
  return fence && !(fence[1][0] === '`' && fence[2].includes('`')) ? fence : null;
}
const fenceEnd = fence => new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}[ \\t]*$`);
const heading = line => /^ {0,3}(#{1,6})(?:[ \t]+(.*?)|)[ \t]*$/.exec(line);
const thematicBreak = line => /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line);
function marker(line) {
  const m = /^( *)([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/.exec(line);
  return m && { indent: m[1].length, ordered: /^\d/.test(m[2]), number: parseInt(m[2], 10),
    contentIndent: m[1].length + m[2].length + (m[3]?.length ?? 1), content: m[4] ?? '' };
}
function htmlBlockStart(line, inParagraph = false) {
  const text = line.trimStart();
  if (text.startsWith('<!--')) return true;
  const tag = htmlTag(text, 0);
  // Block tags may put attributes (or even the closing '>') on later lines.
  const name = tag?.name ?? /^<\/?([a-z][\w:-]*)(?=[\s/>]|$)/i.exec(text)?.[1].toLowerCase();
  // Inline tags such as <br>, <img> and <a> cannot split an existing paragraph.
  if (inParagraph && !blockTags.test(name)) return false;
  return name && (/^<\//.test(text) || blockTags.test(name) || voidTags.has(name) ||
    (name === 'a' && (!tag || text === tag.text)));
}
function interrupts(line, inParagraph = false) {
  return blank(line) || heading(line) || thematicBreak(line) || fenceStart(line) ||
    (marker(line)?.indent <= 3) || /^ {0,3}>/.test(line) || htmlBlockStart(line, inParagraph);
}

function htmlBlock(lines, start) {
  const text = lines.slice(start).join('\n');
  let i = text.search(/\S/);
  const first = rawHtml(text, i);
  const tag = htmlTag(text, i);
  if (text.startsWith('<!--', i) || (first && tag && !containers.has(tag.name))) {
    i += first.length;
    // Preserve the remainder of the closing line, too.
    const newline = text.indexOf('\n', i);
    i = newline < 0 ? text.length : newline;
  } else {
    // Container blocks are raw until a blank line, but opaque islands may span it.
    while (i < text.length) {
      if (text[i] === '\n' && /^\n[ \t]*\n/.test(text.slice(i))) break;
      const raw = text[i] === '<' && rawHtml(text, i);
      i += raw ? raw.length : 1;
    }
  }
  const html = text.slice(0, i).replace(/\n$/, '');
  return { html, end: start + text.slice(0, i).split('\n').length };
}

function splitRow(line) {
  const cells = [];
  let cell = '', i = 0;
  line = line.trim();
  if (line.startsWith('|')) line = line.slice(1);
  for (; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') { cell += '|'; i++; continue; }
    if (line[i] === '`') {
      const code = codeSpan(line, i);
      if (code) { cell += line.slice(i, code.end); i = code.end - 1; continue; }
    }
    if (line[i] === '<') {
      const raw = rawHtml(line, i);
      if (raw) { cell += raw; i += raw.length - 1; continue; }
    }
    if (line[i] === '|') { cells.push(cell.trim()); cell = ''; }
    else cell += line[i];
  }
  if (cell || !line.endsWith('|')) cells.push(cell.trim());
  return cells;
}
function tableHeader(lines, at) {
  if (!lines[at]?.includes('|') || !lines[at + 1]?.includes('-')) return null;
  const headers = splitRow(lines[at]), rules = splitRow(lines[at + 1]);
  return headers.length === rules.length && rules.every(rule => /^:?-{3,}:?$/.test(rule))
    ? { headers, aligns: rules.map(r => r.startsWith(':') ? (r.endsWith(':') ? 'center' : 'left') : (r.endsWith(':') ? 'right' : '')) } : null;
}

function parseList(lines, start, state) {
  const first = marker(lines[start]), items = [];
  let i = start, loose = false;
  while (i < lines.length) {
    const item = marker(lines[i]);
    if (!item || item.indent !== first.indent || item.ordered !== first.ordered) break;
    const body = [item.content];
    i++;
    let codeFence = fenceStart(item.content);
    let pendingFence = codeFence && fenceEnd(codeFence);
    let pendingComment = !pendingFence && item.content.includes('<!--') && !item.content.includes('-->');
    while (i < lines.length) {
      const line = lines[i], next = marker(line);
      const indent = /^ */.exec(line)[0].length;
      const content = line.slice(Math.min(item.contentIndent, indent));
      if (pendingFence) {
        if (!blank(line) && indent < item.contentIndent) break;
        body.push(content); i++;
        if (pendingFence.test(content)) pendingFence = null;
        continue;
      }
      if (pendingComment || /^\s*<!--/.test(line)) {
        body.push(line.slice(Math.min(item.contentIndent, /^ */.exec(line)[0].length)));
        pendingComment = !line.includes('-->'); i++; continue;
      }
      if (blank(line)) {
        let after = i + 1;
        while (after < lines.length && blank(lines[after])) after++;
        const following = marker(lines[after] ?? '');
        const sibling = following && following.indent === first.indent && following.ordered === first.ordered;
        const continued = after < lines.length && /^ */.exec(lines[after])[0].length >= item.contentIndent;
        if (!sibling && !continued) break;
        loose = true; body.push(...lines.slice(i, after).map(line => line.slice(item.contentIndent))); i = after;
        if (sibling) break;
        continue;
      }
      if (next && next.indent <= first.indent) break;
      if (indent >= item.contentIndent) {
        body.push(content); i++;
        codeFence = fenceStart(content);
        if (codeFence) pendingFence = fenceEnd(codeFence);
        continue;
      }
      if (interrupts(line)) break;
      body.push(line.slice(Math.min(indent, item.contentIndent))); i++;
    }
    items.push(parseBlocks(body, state));
    if (blank(lines[i] ?? '')) break;
  }
  const tag = first.ordered ? 'ol' : 'ul';
  const startAttribute = first.ordered && first.number !== 1 ? ` start="${first.number}"` : '';
  const html = items.map(blocks => '<li>' + blocks.map(b => !loose && b.type === 'paragraph' ? b.html.slice(3, -4) : b.html).join('\n') + '</li>').join('\n');
  return { html: `<${tag}${startAttribute}>\n${html}\n</${tag}>`, end: i };
}

function parseBlocks(lines, state) {
  const blocks = [];
  const add = (type, html) => blocks.push({ type, html });
  const addHeading = (level, text) => {
    const html = renderInline(text);
    // Match the old site's slugs, including repeated '-' and variation selectors.
    const base = plainText(html).trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
    let id = base, suffix = 0;
    while (state.ids.has(id)) id = `${base}-${++suffix}`;
    state.ids.add(id);
    add('heading', `<h${level} id="${attribute(id)}">${html}</h${level}>`);
  };
  for (let i = 0; i < lines.length;) {
    if (blank(lines[i])) { i++; continue; }
    const fence = fenceStart(lines[i]);
    if (fence) {
      const close = fenceEnd(fence);
      const code = [], indent = /^ */.exec(lines[i])[0].length;
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        code.push(lines[i].slice(Math.min(indent, /^ */.exec(lines[i])[0].length))); i++;
      }
      if (i < lines.length) i++;
      const language = fence[2].trim().split(/\s+/)[0];
      add('code', `<pre><code${language ? ` class="language-${attribute(language)}"` : ''}>${escapeHtml(code.join('\n') + (code.length ? '\n' : ''))}</code></pre>`);
      continue;
    }
    if (htmlBlockStart(lines[i])) {
      const raw = htmlBlock(lines, i); add('html', raw.html); i = raw.end; continue;
    }
    const title = heading(lines[i]);
    if (title) { addHeading(title[1].length, (title[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '')); i++; continue; }
    if (thematicBreak(lines[i])) { add('hr', '<hr>'); i++; continue; }
    if (marker(lines[i])?.indent <= 3) {
      const list = parseList(lines, i, state); add('list', list.html); i = list.end; continue;
    }
    if (/^ {0,3}>/.test(lines[i])) {
      const quote = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) quote.push(lines[i++].replace(/^ {0,3}>[ \t]?/, ''));
      add('blockquote', `<blockquote>\n${joinBlocks(parseBlocks(quote, state))}\n</blockquote>`); continue;
    }
    const table = tableHeader(lines, i);
    if (table) {
      const row = (cells, tag) => '<tr>' + table.headers.map((_, c) => `<${tag}${table.aligns[c] ? ` align="${table.aligns[c]}"` : ''}>${renderInline(cells[c] ?? '')}</${tag}>`).join('') + '</tr>';
      const body = []; i += 2;
      while (i < lines.length && !interrupts(lines[i]) && lines[i].includes('|')) body.push(row(splitRow(lines[i++]), 'td'));
      add('table', `<table>\n<thead>\n${row(table.headers, 'th')}\n</thead>\n<tbody>\n${body.join('\n')}\n</tbody>\n</table>`); continue;
    }
    const paragraph = [];
    while (i < lines.length) {
      if (paragraph.length && (interrupts(lines[i], true) || tableHeader(lines, i))) break;
      paragraph.push(lines[i++]);
      // Keep multiline inline code and HTML/comments opaque, even across blanks.
      const remaining = lines.slice(i - 1).join('\n');
      let through = 0;
      for (let c = 0; c < lines[i - 1].length; c++) {
        if (remaining[c] === '\\') { c++; continue; }
        const code = remaining[c] === '`' && codeSpan(remaining, c);
        const raw = remaining[c] === '<' && rawHtml(remaining, c);
        const end = code ? code.end : raw ? c + raw.length : c + 1;
        through = Math.max(through, remaining.slice(0, end).split('\n').length - 1);
        c = end - 1;
      }
      while (through-- > 0 && i < lines.length) paragraph.push(lines[i++]);
      if (i < lines.length && /^ {0,3}(?:=+|-+)[ \t]*$/.test(lines[i])) {
        addHeading(lines[i].trim()[0] === '=' ? 1 : 2, paragraph.join('\n')); i++; paragraph.length = 0; break;
      }
      if (i >= lines.length || blank(lines[i])) break;
    }
    if (paragraph.length) add('paragraph', `<p>${renderInline(paragraph.join('\n'))}</p>`);
  }
  return blocks;
}

const joinBlocks = blocks => blocks.map(block => block.html).join('\n');

/** Render a Markdown string to an HTML fragment, with per-document heading IDs. */
export function renderMarkdown(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('renderMarkdown expects a string');
  const html = joinBlocks(parseBlocks(markdown.replace(/\r\n?/g, '\n').split('\n'), { ids: new Set() }));
  return html ? html + '\n' : '';
}
