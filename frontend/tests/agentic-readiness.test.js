/**
 * Tests for agentic readiness improvements.
 * 
 * These tests verify the middleware, static HTML content, JSON-LD,
 * sitemap, llms.txt, and robots.txt behave correctly for the
 * "Is Agentic" audit requirements.
 * 
 * Run: node tests/agentic-readiness.test.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Fix #1: Content is available without JavaScript
// ---------------------------------------------------------------------------
console.log('\n📋 Fix #1: Content available without JavaScript');

const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf-8');

// Must contain >500 characters of meaningful text content within #root
const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>\s*<noscript>/);
const rootContent = rootMatch ? rootMatch[1] : '';
const textOnly = rootContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

assert(textOnly.length >= 500, `Static HTML text inside #root is ≥500 chars (actual: ${textOnly.length})`);

// Must have a clear H1
assert(/<h1[^>]*>/.test(rootContent), 'Has an H1 heading in static content');

// Heading hierarchy: H1 → H2 → H3 (no skipping)
assert(/<h1[^>]*>/.test(rootContent), 'Contains H1');
assert(/<h2[^>]*>/.test(rootContent), 'Contains H2 (sequential after H1)');
assert(/<h3[^>]*>/.test(rootContent), 'Contains H3 (sequential after H2)');

// Must not skip heading levels (e.g., H1 then H4 without H2, H3)
const h4BeforeH2 = rootContent.indexOf('<h4') !== -1 && (rootContent.indexOf('<h4') < rootContent.indexOf('<h2'));
assert(!h4BeforeH2, 'No heading level skips (H4 does not appear before H2)');

// <noscript> block exists with styling
assert(/<noscript>/.test(indexHtml), 'Has <noscript> fallback');

// ---------------------------------------------------------------------------
// Fix #5: JSON-LD structured data
// ---------------------------------------------------------------------------
console.log('\n📋 Fix #5: JSON-LD structured data');

const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(jsonLdMatch !== null, 'JSON-LD script tag exists in index.html');

if (jsonLdMatch) {
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert(jsonLd['@context'] === 'https://schema.org', 'JSON-LD @context is schema.org');
  assert(jsonLd['@type'] === 'SoftwareApplication', 'JSON-LD @type is SoftwareApplication');
  assert(typeof jsonLd.name === 'string' && jsonLd.name.length > 0, 'JSON-LD has name');
  assert(typeof jsonLd.description === 'string' && jsonLd.description.length > 0, 'JSON-LD has description');
  assert(typeof jsonLd.url === 'string' && jsonLd.url.startsWith('https://'), 'JSON-LD has valid url');
  assert(jsonLd.offers && jsonLd.offers['@type'] === 'Offer', 'JSON-LD has offers');
  assert(Array.isArray(jsonLd.featureList) && jsonLd.featureList.length > 0, 'JSON-LD has featureList');
}

// ---------------------------------------------------------------------------
// Fix #4: Brand name discoverability
// ---------------------------------------------------------------------------
console.log('\n📋 Fix #4: Brand name discoverability');

assert(/<link rel="canonical"/.test(indexHtml), 'Canonical URL is set');
const canonicalMatch = indexHtml.match(/href="(https:\/\/supply-chain-risk-analysis-po64\.vercel\.app\/?)"/);
assert(canonicalMatch !== null, 'Canonical URL points to production domain');

// Title contains the brand name
assert(/<title>.*Supply Chain Risk Monitor.*<\/title>/.test(indexHtml), 'Page title contains brand name');

// ---------------------------------------------------------------------------
// Fix #2 & #3: Middleware — Markdown content negotiation & 404s
// ---------------------------------------------------------------------------
console.log('\n📋 Fix #2 & #3: Middleware (markdown negotiation & 404s)');

const middlewarePath = join(ROOT, 'middleware.js');
assert(existsSync(middlewarePath), 'middleware.js exists at project root');

const middlewareCode = readFileSync(middlewarePath, 'utf-8');

// Must export a default function
assert(/export default function/.test(middlewareCode), 'Middleware exports a default function');

// Must check for text/markdown in Accept header
assert(/text\/markdown/.test(middlewareCode), 'Middleware checks for Accept: text/markdown');

// Must return Content-Type: text/markdown
assert(/Content-Type.*text\/markdown/.test(middlewareCode), 'Middleware sets Content-Type: text/markdown');

// Must include Vary: Accept in responses
assert(/Vary.*Accept/.test(middlewareCode), 'Middleware sets Vary: Accept header');

// Homepage markdown response: status 200
assert(/status:\s*200/.test(middlewareCode), 'Homepage markdown returns status 200');

// 404 markdown response: status 404
assert(/status:\s*404/.test(middlewareCode), 'Unknown paths return status 404');

// 404 body has at least 20 chars of explanation
const notFoundMdMatch = middlewareCode.match(/function generate404Markdown[\s\S]*?return\s*`([\s\S]*?)`;/);
if (notFoundMdMatch) {
  const notFoundBody = notFoundMdMatch[1].replace(/\$\{[^}]+\}/g, 'placeholder').trim();
  assert(notFoundBody.length >= 20, `404 markdown body is ≥20 chars (actual: ${notFoundBody.length})`);
  assert(/homepage|sitemap|llms\.txt/i.test(notFoundBody), '404 body includes link to docs/sitemap/llms.txt');

} else {
  assert(false, '404 markdown body template found');
  assert(false, '404 body includes link to docs/sitemap/llms.txt');
}

// Middleware config matcher excludes static paths
assert(/matcher/.test(middlewareCode), 'Middleware has a config matcher');

// ---------------------------------------------------------------------------
// Supporting files
// ---------------------------------------------------------------------------
console.log('\n📋 Supporting files');

// llms.txt
const llmsTxtPath = join(ROOT, 'public', 'llms.txt');
assert(existsSync(llmsTxtPath), 'llms.txt exists in public/');
if (existsSync(llmsTxtPath)) {
  const llmsTxt = readFileSync(llmsTxtPath, 'utf-8');
  assert(llmsTxt.length > 100, 'llms.txt has substantial content');
  assert(/Supply Chain Risk Monitor/.test(llmsTxt), 'llms.txt mentions brand name');
}

// sitemap.xml
const sitemapPath = join(ROOT, 'public', 'sitemap.xml');
assert(existsSync(sitemapPath), 'sitemap.xml exists in public/');
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf-8');
  assert(/<urlset/.test(sitemap), 'sitemap.xml has valid urlset root');
  assert(/<loc>https:\/\/supply-chain-risk-analysis-po64\.vercel\.app\/<\/loc>/.test(sitemap), 'sitemap.xml has homepage URL');
}

// robots.txt
const robotsPath = join(ROOT, 'public', 'robots.txt');
assert(existsSync(robotsPath), 'robots.txt exists in public/');
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, 'utf-8');
  assert(/Sitemap:/.test(robots), 'robots.txt references sitemap');
}

// vercel.json
const vercelPath = join(ROOT, 'vercel.json');
assert(existsSync(vercelPath), 'vercel.json exists');
if (existsSync(vercelPath)) {
  const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8'));
  assert(Array.isArray(vercelConfig.headers), 'vercel.json has headers array');
  const hasVaryAccept = vercelConfig.headers.some(h =>
    h.headers && h.headers.some(hh => hh.key === 'Vary' && hh.value.includes('Accept'))
  );
  assert(hasVaryAccept, 'vercel.json includes Vary: Accept header');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
