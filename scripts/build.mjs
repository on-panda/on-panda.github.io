#!/usr/bin/env node
// Offline, dependency-free site builder. Only Node's standard library is used.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapeHtml, renderMarkdown } from './markdown.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SITE_URL = 'https://on-panda.github.io/';
const GITHUB_CSS = 'research/themes/github.css';
const PRISM_CSS = 'research/vendor/prism.min.css';
const IGNORED = new Set(['node_modules', 'scripts', 'templates']);
const TAG_ATTRIBUTES = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
const META_TAG = /<meta\b(?:[^<>"']|"[^"]*"|'[^']*')*>/gi;
const LINK_TAG = /<link\b(?:[^<>"']|"[^"]*"|'[^']*')*>/gi;

function decodeEntities(text) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, name) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const number = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\uFFFD';
  });
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(TAG_ATTRIBUTES)].map(m =>
    [m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4])]));
}

function relativeUrl(source, target) {
  return relative(dirname(source), target).split(sep).join('/');
}

function pageUrl(source) {
  return new URL(source.replace(/index\.md$/, '').split('/').map(encodeURIComponent).join('/'), SITE_URL).href;
}

function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${key}`);
    return values[key];
  });
}

/** Each published page is an index.md, not README.md or an image/tweet draft. */
export async function discoverPages(root = ROOT, directory = '') {
  const pages = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORED.has(entry.name)) continue;
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) pages.push(...await discoverPages(root, path));
    else if (entry.isFile() && entry.name === 'index.md') pages.push(path);
  }
  return pages.sort();
}

/** Lift the author's head out of Markdown; normalize/deduplicate SEO metadata. */
export function compilePage(markdown, source, template) {
  const match = /^\s*<head\b[^>]*>([\s\S]*?)<\/head>\s*/i.exec(markdown);
  if (!match) throw new Error(`${source}: start the page with <head>, <title> and a description meta tag`);
  let head = match[1];
  const title = decodeEntities(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1]?.trim() ?? '');
  head = head.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '');
  const meta = new Map();
  head = head.replace(META_TAG, tag => {
    const attrs = attributes(tag);
    const key = (attrs.name ?? attrs.property)?.toLowerCase();
    if (key && attrs.content !== undefined) meta.set(key, attrs.content);
    else if (!('charset' in attrs)) return tag;
    return '';
  });
  let icon;
  head = head.replace(LINK_TAG, tag => {
    const attrs = attributes(tag);
    if (attrs.rel?.toLowerCase() === 'canonical') return '';
    if (attrs.rel?.toLowerCase() === 'icon') { icon = attrs.href; return ''; }
    return tag;
  });
  const description = meta.get('description');
  if (!title || !description?.trim()) throw new Error(`${source}: <title> and meta name="description" are required`);
  const canonical = pageUrl(source);
  const fallback = (key, value) => { if (!meta.has(key)) meta.set(key, value); };
  meta.set('viewport', 'width=device-width, initial-scale=1');
  meta.set('color-scheme', 'light');
  fallback('author', 'onPanda');
  fallback('robots', 'index, follow, max-image-preview:large');
  fallback('image', meta.get('og:image') ?? new URL('img/fig1_UI-v4.png', SITE_URL).href);
  fallback('og:type', 'website');
  fallback('og:site_name', 'onPanda');
  fallback('og:title', title);
  fallback('og:description', description);
  fallback('og:image', meta.get('image'));
  meta.set('og:url', canonical);
  fallback('twitter:card', 'summary_large_image');
  fallback('twitter:title', meta.get('og:title'));
  fallback('twitter:description', meta.get('og:description'));
  fallback('twitter:image', meta.get('og:image'));
  meta.set('twitter:domain', new URL(SITE_URL).hostname);
  meta.set('twitter:url', canonical);
  // Normalize relative social images into absolute URLs, without changing page assets.
  for (const key of ['image', 'og:image', 'twitter:image']) meta.set(key, new URL(meta.get(key), canonical).href);
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: title, description, url: canonical, image: meta.get('og:image'),
    isPartOf: { '@type': 'WebSite', name: 'onPanda', url: SITE_URL },
  };
  const metadata = [
    `  <title>${escapeHtml(title)}</title>`,
    ...[...meta].map(([key, value]) => `  <meta ${key.startsWith('og:') ? 'property' : 'name'}="${escapeHtml(key)}" content="${escapeHtml(value)}">`),
    `  <link rel="canonical" href="${escapeHtml(canonical)}">`,
    `  <link rel="icon" type="image/png" href="${escapeHtml(icon ?? relativeUrl(source, 'img/on-panda-logo-256x256.png'))}">`,
    '  <link rel="alternate" type="text/markdown" href="index.md" title="Markdown source">',
    `  <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`,
    head.trim(),
  ].filter(Boolean).join('\n');
  // Keep the old theme's heading permalink controls, without any browser extension.
  const body = renderMarkdown(markdown.slice(match[0].length)).replace(/(<h[1-6] id="([^"]*)">)/g,
    (_, opening, id) => `${opening}<a class="anchor" href="#${id}" aria-label="Link to this section"><span class="octicon octicon-link" aria-hidden="true"></span></a>`);
  const html = fillTemplate(template, {
    source: escapeHtml(source), head: metadata, content: body.trimEnd(),
    githubCss: escapeHtml(relativeUrl(source, GITHUB_CSS)),
    prismCss: escapeHtml(relativeUrl(source, PRISM_CSS)),
  });
  return { source, title, description, canonical, html, indexable: !/\b(?:noindex|none)\b/i.test(meta.get('robots')) };
}

const markdownLabel = text => text.replace(/([\\\[\]])/g, '\\$1').replace(/\s+/g, ' ');

/** Produce everything in memory first: a malformed page cannot half-build the site. */
export async function generateSite(root = ROOT) {
  const template = await readFile(join(root, 'templates/page.html'), 'utf8');
  // Fail early if the existing shared theme assets are missing.
  await Promise.all([GITHUB_CSS, PRISM_CSS].map(path => readFile(join(root, path))));
  const sources = await discoverPages(root);
  if (!sources.length) throw new Error('No index.md pages found');
  const pages = await Promise.all(sources.map(async source =>
    compilePage(await readFile(join(root, source), 'utf8'), source, template)));
  const outputs = new Map(pages.map(page => [page.source.replace(/\.md$/, '.html'), page.html]));
  if (!outputs.has('index.html')) {
    const research = pages.find(page => page.source === 'research/index.md');
    if (!research) throw new Error('The homepage redirect requires research/index.md');
    const redirect = await readFile(join(root, 'templates/redirect.html'), 'utf8');
    outputs.set('index.html', fillTemplate(redirect, {
      canonical: escapeHtml(research.canonical), description: escapeHtml(research.description),
    }));
  }
  const published = pages.filter(page => page.indexable);
  outputs.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    published.map(page => `  <url><loc>${escapeHtml(page.canonical)}</loc></url>`).join('\n') + '\n</urlset>\n');
  outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', SITE_URL).href}\n`);
  outputs.set('llms.txt', [
    '# onPanda', '',
    '> onPanda is an open-source tool for annotating on-policy alignment data for LLMs and agents via token-level correction.', '',
    'This site contains the research overview, Panda-CVL dataset and benchmark, and an agent trajectory annotation guide.',
    'Each page also provides its Markdown source, including author-supplied HTML for figures and metadata.', '',
    '## Pages', '',
    ...published.map(page => `- [${markdownLabel(page.title)}](${page.canonical}): ${page.description.replace(/\s+/g, ' ')}`), '',
    '## Markdown sources', '',
    ...published.map(page => `- [${markdownLabel(page.title)}](${new URL(page.source, SITE_URL).href}): Source for the corresponding page.`), '',
    '## Project resources', '',
    '- [Source code](https://github.com/on-panda/on-panda): The onPanda application.',
    '- [Live demo](https://onpanda.diyer22.com/): Try token-level correction and agent annotation.',
    '- [Paper](https://arxiv.org/abs/2609.24983): Research paper on the annotation method and evaluation.',
    '- [Python library](https://github.com/on-panda/on-panda-python): Parse and export annotation data.', '',
  ].join('\n'));
  return { pages, outputs };
}

async function readIfExists(path) {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Usage: node scripts/build.mjs [--check]');
  const check = args[0] === '--check';
  const { pages, outputs } = await generateSite();
  const changed = [];
  for (const [path, content] of outputs) {
    const target = join(ROOT, path);
    if (await readIfExists(target) === content) continue;
    changed.push(path);
    if (!check) {
      await writeFile(target, content);
      console.log(`Generated ${path}`);
    }
  }
  if (check && changed.length) throw new Error(`Generated files are missing or stale; run make:\n${changed.map(path => `  ${path}`).join('\n')}`);
  console.log(`${check ? 'Checked' : 'Built'} ${pages.length} pages and SEO files (${changed.length} ${check ? 'stale' : 'updated'}).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
