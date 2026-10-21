import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { compilePage, discoverPages, generateSite, ROOT, SITE_URL } from './build.mjs';

const template = await readFile(new URL('../templates/page.html', import.meta.url), 'utf8');
const { pages, outputs } = await generateSite();
const parts = html => ({
  head: /<head>([\s\S]*?)<\/head>/.exec(html)?.[1],
  body: /<body\b[^>]*>([\s\S]*?)<\/body>/.exec(html)?.[1],
});
const meta = (head, key) => new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`).exec(head)?.[1];

test('discover article pages, but not README or tweet drafts', async () => {
  const sources = await discoverPages();
  for (const source of ['Panda-CVL/index.md', 'agent-trajectory-annotation/index.md', 'research/index.md']) {
    assert.ok(sources.includes(source));
  }
  assert.ok(sources.every(source => /(?:^|\/)index\.md$/.test(source)));
  assert.equal(outputs.size, pages.length + (sources.includes('index.md') ? 0 : 1) + 5);
  assert.ok(!outputs.has('introduction/index.html'), 'preserve the standalone introduction redirect');
});

for (const page of pages) {
  test(`${page.source}: valid document structure, shared theme, metadata and analytics`, async () => {
    const { head, body } = parts(page.html);
    assert.match(page.html, /^<!doctype html>/);
    assert.equal((page.html.match(/<head>/g) ?? []).length, 1);
    assert.equal((page.html.match(/<body\b/g) ?? []).length, 1);
    assert.equal((page.html.match(/<meta charset=/g) ?? []).length, 1);
    assert.equal((page.html.match(/<title>/g) ?? []).length, 1);
    assert.equal((page.html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.doesNotMatch(body, /<(?:meta|title|head|style|link)\b/i);
    assert.doesNotMatch(page.html, /chrome-extension:\/\/|__hcfy__|MJX-CHTML/);
    assert.match(body, /<main id="_html" class="markdown-body">/);
    assert.equal((body.match(/<h1\b/g) ?? []).length, 1);
    for (const [imgTag] of body.matchAll(/<img\b[^>]*>/gi)) {
      assert.match(imgTag, /\balt="[^"]+"/i, `${page.source}: every image needs non-empty alt text: ${imgTag}`);
    }
    const themeHref = /<link rel="stylesheet" href="([^"]+)" id="_theme">/.exec(head)?.[1];
    assert.equal(new URL(themeHref, page.canonical).href, `${SITE_URL}research/themes/github.css`);
    assert.match(head, /max-width: 1024px;[\s\S]*padding: 45px;/);
    assert.match(head, /@media \(max-width: 600px\)/);
    assert.equal(meta(head, 'color-scheme'), 'light');
    for (const key of ['description', 'og:title', 'og:description', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(meta(head, key), `missing ${key}`);
    }
    assert.equal(meta(head, 'og:url'), page.canonical);
    assert.equal(meta(head, 'twitter:url'), page.canonical);
    const structured = JSON.parse(/<script type="application\/ld\+json">([^]*?)<\/script>/.exec(head)[1]);
    assert.equal(structured.url, page.canonical);
    assert.equal(structured.name, page.title);
    const source = await readFile(join(ROOT, page.source), 'utf8');
    for (const analytics of source.matchAll(/gtag\('config', '([^']+)'\)/g)) {
      assert.ok(body.includes(analytics[0]), `preserve ${analytics[1]}`);
    }
    assert.equal((body.match(/<script async\b/g) ?? []).length, (source.match(/<script async\b/g) ?? []).length);
    assert.doesNotMatch(source, /<style\b/);
    const ids = [...body.matchAll(/\bid="([^"]*)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'heading IDs must be unique');
  });
}

test('homepage preserves research redirect, social metadata, and static links for crawlers', () => {
  const { head, body } = parts(outputs.get('index.html'));
  assert.match(head, /http-equiv="refresh" content="0; url=research\/"/);
  assert.ok(head.includes(`rel="canonical" href="${SITE_URL}research/"`));
  for (const key of ['description', 'og:title', 'og:description', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    assert.ok(meta(head, key), `homepage missing ${key}`);
  }
  assert.match(body, /href="research\/"/);
  assert.match(body, /href="Panda-CVL\/"/);
  assert.match(body, /href="agent-trajectory-annotation\/"/);
});

test('sitemap, robots, llms and llms-full cover canonical articles, excluding redirects and drafts', () => {
  const sitemap = outputs.get('sitemap.xml');
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(locations, pages.filter(page => page.indexable).map(page => page.canonical));
  assert.doesNotMatch(sitemap, /lastmod|introduction|README|index\.html/);
  const robots = outputs.get('robots.txt');
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}sitemap.xml`));
  for (const bot of ['OAI-SearchBot', 'GPTBot', 'Claude-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'bingbot']) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots.txt missing ${bot}`);
  }
  const llms = outputs.get('llms.txt');
  const llmsFull = outputs.get('llms-full.txt');
  assert.match(llms, /^# onPanda\n\n> /);
  assert.ok(llms.includes(`(${SITE_URL}llms-full.txt)`));
  assert.doesNotMatch(llmsFull, /<head|<script|<!--|gtag\(/i);
  assert.match(llmsFull, /\| \*\*onPanda\*\* \| token-level correction \| \*\*330 \(516\)\*\*/);
  for (const page of pages) {
    assert.ok(llms.includes(`(${page.canonical})`));
    assert.ok(llms.includes(`(${new URL(page.source, SITE_URL).href})`));
    assert.ok(llmsFull.includes(`URL: ${page.canonical}`));
  }
});

test('metadata is deduplicated, escaped, supplemented, and kept outside the body', () => {
  const source = `<head>
    <meta charset="UTF-8"><title>A &amp; B</title>
    <meta name="description" content="A &quot;quoted&quot; description &amp; more">
    <meta name="viewport" content="wrong"><meta name="viewport" content="also wrong">
    <meta property="og:title" content="Custom social title">
    <meta name="robots" content="noindex, follow">
    <meta name="image" content="../../img/fig1_UI-v4.png">
    <link rel="canonical" href="https://wrong.example/">
    <meta name="google-site-verification" content="test-token">
  </head>

# Heading

Content`;
  const page = compilePage(source, 'nested/example/index.md', template);
  const { head, body } = parts(page.html);
  assert.equal(page.title, 'A & B');
  assert.ok(!page.indexable);
  assert.equal((head.match(/name="viewport"/g) ?? []).length, 1);
  assert.match(head, /<title>A &amp; B<\/title>/);
  assert.match(head, /content="A &quot;quoted&quot; description &amp; more"/);
  assert.equal(meta(head, 'og:title'), 'Custom social title');
  assert.equal(meta(head, 'google-site-verification'), 'test-token');
  assert.equal(meta(head, 'image'), `${SITE_URL}img/fig1_UI-v4.png`);
  assert.match(head, /href="\.\.\/\.\.\/research\/themes\/github\.css"/);
  assert.doesNotMatch(head, /wrong\.example/);
  assert.doesNotMatch(body, /<meta|<title|<head/);
  assert.match(body, /<a class="anchor" href="#heading"/);
  assert.throws(() => compilePage('# No metadata', 'missing/index.md', template), /start the page/);
  assert.throws(() => compilePage('<head><title>Only title</title></head>', 'missing/index.md', template), /required/);
});

test('all local HTML links, images, and stylesheet references resolve without network access', async () => {
  for (const [path, content] of outputs) {
    if (!path.endsWith('.html')) continue;
    const html = content.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    for (const [, raw] of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
      const url = new URL(raw.replace(/&amp;/g, '&'), new URL(path, SITE_URL));
      if (url.origin !== new URL(SITE_URL).origin) continue;
      let target = decodeURIComponent(url.pathname.slice(1));
      if (target.endsWith('/') || !target) target += 'index.html';
      if (!outputs.has(target)) {
        const info = await stat(join(ROOT, target)).catch(() => null);
        if (info?.isDirectory()) target += '/index.html';
        assert.ok(outputs.has(target) || info?.isFile(), `${path}: missing local target ${raw}`);
      }
      if (url.hash && outputs.has(target)) {
        assert.ok(outputs.get(target).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${path}: missing anchor ${raw}`);
      }
    }
  }
});

test('generation is deterministic and does not depend on build time', async () => {
  const again = await generateSite();
  assert.deepEqual([...again.outputs], [...outputs]);
});

test('404 page and --case-aliases handle lowercase URL variants such as /panda-cvl/', async () => {
  const notFound = outputs.get('404.html');
  assert.ok(notFound);
  assert.match(notFound, /name="robots" content="noindex"/);
  assert.ok(notFound.includes('"/panda-cvl":"/Panda-CVL/"'));
  assert.ok(notFound.includes('"/panda-cvl/index.md":"/Panda-CVL/index.md"'));
  const withAliases = await generateSite(ROOT, { caseAliases: true });
  const aliasHtml = withAliases.outputs.get('panda-cvl/index.html');
  assert.ok(aliasHtml);
  assert.match(aliasHtml, /name="robots" content="noindex, follow"/);
  assert.match(aliasHtml, /http-equiv="refresh" content="0; url=\/Panda-CVL\/"/);
  assert.ok(aliasHtml.includes(`rel="canonical" href="${SITE_URL}Panda-CVL/"`));
  assert.ok(!withAliases.outputs.has('panda-cvl/index.md'));
});
