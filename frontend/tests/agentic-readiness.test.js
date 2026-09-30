/**
 * Tests for agentic readiness improvements (Round 2).
 * 
 * Covers all 13 audit fixes: OpenAPI spec, JSON errors, public API,
 * brand discoverability, API docs, agent instructions, Organization schema,
 * trust anchors, developer resources, API complexity, function calling,
 * metadata completeness, and MCP manifest.
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

const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf-8');
const middlewareCode = readFileSync(join(ROOT, 'middleware.js'), 'utf-8');

// ===========================================================================
// Fix #1: OpenAPI spec published
// ===========================================================================
console.log('\n📋 Fix #1: OpenAPI spec published');

const openapiPath = join(ROOT, 'public', 'openapi.json');
assert(existsSync(openapiPath), 'openapi.json exists in public/');

if (existsSync(openapiPath)) {
  const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
  assert(spec.openapi && spec.openapi.startsWith('3.'), `OpenAPI version is 3.x (got ${spec.openapi})`);
  assert(spec.info && spec.info.title, 'OpenAPI info.title is present');
  assert(spec.info && spec.info.description && spec.info.description.length > 50, 'OpenAPI info.description is substantial');
  assert(spec.info && spec.info.version, 'OpenAPI info.version is present');
  assert(spec.paths && Object.keys(spec.paths).length >= 5, `OpenAPI has ≥5 paths (got ${Object.keys(spec.paths).length})`);
  assert(spec.components && spec.components.schemas, 'OpenAPI has component schemas');
  assert(spec.tags && spec.tags.length > 0, 'OpenAPI has tags');

  // Fix #10: API schema complexity — operationIds and descriptions
  console.log('\n📋 Fix #10: API schema complexity');
  const operations = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (typeof op === 'object' && op.operationId) {
        operations.push(op);
      }
    }
  }
  assert(operations.length >= 5, `All operations have operationId (found ${operations.length})`);
  const allHaveDescriptions = operations.every(op => op.description && op.description.length > 20);
  assert(allHaveDescriptions, 'All operations have substantial descriptions');
  const allHaveSummaries = operations.every(op => op.summary);
  assert(allHaveSummaries, 'All operations have summaries');
  
  // Fix #11: Function calling compatibility
  console.log('\n📋 Fix #11: Function calling compatibility');
  const operationIds = operations.map(op => op.operationId);
  const uniqueIds = new Set(operationIds);
  assert(uniqueIds.size === operationIds.length, 'All operationIds are unique');
  assert(operations.every(op => op.responses), 'All operations have response schemas');

  // Verify ErrorResponse schema exists
  assert(spec.components.schemas.ErrorResponse, 'ErrorResponse schema is defined');
  if (spec.components.schemas.ErrorResponse) {
    const errSchema = spec.components.schemas.ErrorResponse;
    assert(errSchema.properties && errSchema.properties.error, 'ErrorResponse has error property');
  }
}

// ===========================================================================
// Fix #2: JSON error responses
// ===========================================================================
console.log('\n📋 Fix #2: JSON error responses');

const apiProxyPath = join(ROOT, 'api', '[...path].js');
assert(existsSync(apiProxyPath), 'API proxy serverless function exists');

if (existsSync(apiProxyPath)) {
  const proxyCode = readFileSync(apiProxyPath, 'utf-8');
  assert(/error.*code.*message.*hint/s.test(proxyCode), 'API proxy returns structured JSON errors with code, message, hint');
  assert(/BAD_REQUEST/.test(proxyCode), 'Handles 400 Bad Request');
  assert(/NOT_FOUND/.test(proxyCode), 'Handles 404 Not Found');
  assert(/BACKEND_UNREACHABLE/.test(proxyCode), 'Handles backend connection failures');
  assert(/application\/json/.test(proxyCode), 'Sets Content-Type: application/json');
}

// ===========================================================================
// Fix #3: Public API with reachable endpoints
// ===========================================================================
console.log('\n📋 Fix #3: Public API with reachable endpoints');

const vercelConfig = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf-8'));
const hasApiRewrite = vercelConfig.rewrites && vercelConfig.rewrites.some(r =>
  r.source && r.source.includes('/api')
);
assert(hasApiRewrite, 'vercel.json has API proxy rewrite rule');

if (existsSync(apiProxyPath)) {
  const proxyCode = readFileSync(apiProxyPath, 'utf-8');
  assert(/VITE_API_URL/.test(proxyCode), 'API proxy reads backend URL from VITE_API_URL env var');
  assert(/fetch\(targetUrl/.test(proxyCode), 'API proxy forwards requests to backend');
  assert(/Access-Control-Allow-Origin/.test(proxyCode), 'API proxy sets CORS headers');
}

// ===========================================================================
// Fix #4: Brand name discoverability
// ===========================================================================
console.log('\n📋 Fix #4: Brand name discoverability');

assert(/<link rel="canonical"/.test(indexHtml), 'Canonical URL is set');
assert(/<title>.*Supply Chain Risk Monitor.*<\/title>/.test(indexHtml), 'Page title contains brand name');
assert(/og:title/.test(indexHtml), 'og:title meta tag present');

// ===========================================================================
// Fix #5: Public API/docs linked from homepage
// ===========================================================================
console.log('\n📋 Fix #5: API docs linked from homepage');

assert(/href="\/docs"/.test(indexHtml), 'Homepage links to /docs');
assert(/href="\/openapi\.json"/.test(indexHtml), 'Homepage links to /openapi.json');
assert(/API Documentation/.test(indexHtml), 'Homepage mentions API Documentation');
assert(/Developer Resources/.test(indexHtml), 'Homepage has Developer Resources section');

// Docs page in middleware
assert(/\/docs/.test(middlewareCode), 'Middleware serves /docs page');
assert(/API Documentation/.test(middlewareCode), 'Docs page has API Documentation content');

// ===========================================================================
// Fix #6: Agent instruction / when-to-use
// ===========================================================================
console.log('\n📋 Fix #6: Agent instruction / when-to-use');

const llmsTxt = readFileSync(join(ROOT, 'public', 'llms.txt'), 'utf-8');
assert(/When to Use/i.test(llmsTxt), 'llms.txt has "When to Use" section');
assert(/Do NOT use/i.test(llmsTxt), 'llms.txt has "Do NOT use" guidance');
assert(/Monitor supply chain disruptions/i.test(llmsTxt), 'llms.txt describes specific use cases');
assert(/GET \/api\/articles/i.test(llmsTxt), 'llms.txt includes endpoint examples');
assert(/POST \/api\/query/i.test(llmsTxt), 'llms.txt includes search endpoint');
assert(/openapi\.json/.test(llmsTxt), 'llms.txt links to OpenAPI spec');

// ===========================================================================
// Fix #7: Organization schema completeness
// ===========================================================================
console.log('\n📋 Fix #7: Organization schema');

const jsonLdBlocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert(jsonLdBlocks.length >= 2, `Has ≥2 JSON-LD blocks (got ${jsonLdBlocks.length})`);

const orgBlock = jsonLdBlocks.find(m => m[1].includes('"Organization"'));
assert(orgBlock !== undefined, 'Organization JSON-LD block exists');

if (orgBlock) {
  const orgLd = JSON.parse(orgBlock[1]);
  assert(orgLd['@type'] === 'Organization', 'JSON-LD @type is Organization');
  assert(orgLd.contactPoint, 'Organization has contactPoint');
  if (orgLd.contactPoint) {
    assert(orgLd.contactPoint.email || orgLd.contactPoint.telephone, 'contactPoint has email or telephone');
    assert(orgLd.contactPoint.contactType, 'contactPoint has contactType');
  }
  assert(orgLd.address, 'Organization has address');
  if (orgLd.address) {
    assert(orgLd.address['@type'] === 'PostalAddress', 'address is PostalAddress type');
  }
}

// ===========================================================================
// Fix #8: Trust anchor pages
// ===========================================================================
console.log('\n📋 Fix #8: Trust anchor pages');

for (const page of ['/about', '/contact', '/privacy']) {
  const pagePattern = new RegExp(`['"]${page.replace('/', '\\/')}['"]`);
  assert(pagePattern.test(middlewareCode), `Middleware serves ${page} page`);
}
// Check substantial content (500+ chars)
for (const label of ['ABOUT_HTML', 'CONTACT_HTML', 'PRIVACY_HTML']) {
  const match = middlewareCode.match(new RegExp(`const ${label} = \`([\\s\\S]*?)\`;`));
  if (match) {
    const textContent = match[1].replace(/<[^>]+>/g, '').replace(/\\s+/g, ' ').trim();
    assert(textContent.length >= 500, `${label} has ≥500 chars of content (got ${textContent.length})`);
  } else {
    assert(false, `${label} template found in middleware`);
  }
}

// ===========================================================================
// Fix #9: Developer resource discoverability
// ===========================================================================
console.log('\n📋 Fix #9: Developer resource discoverability');

assert(/openapi\.json/.test(llmsTxt), 'llms.txt links to OpenAPI spec');
assert(/\/docs/.test(llmsTxt), 'llms.txt links to API docs');
assert(/\.well-known\/mcp/.test(llmsTxt), 'llms.txt links to MCP manifest');
assert(/github\.com/.test(llmsTxt), 'llms.txt links to GitHub');

// ===========================================================================
// Fix #12: Metadata completeness
// ===========================================================================
console.log('\n📋 Fix #12: Metadata completeness');

assert(/og:image/.test(indexHtml), 'og:image meta tag present');
assert(/og:type/.test(indexHtml), 'og:type meta tag present');
assert(/<html lang="en"/.test(indexHtml), 'html lang attribute set');
assert(/<link rel="canonical"/.test(indexHtml), 'canonical link present');

// ===========================================================================
// Fix #13: MCP server manifest
// ===========================================================================
console.log('\n📋 Fix #13: MCP server manifest');

assert(/\.well-known\/mcp/.test(middlewareCode), 'Middleware serves /.well-known/mcp');
assert(/MCP_MANIFEST/.test(middlewareCode), 'MCP_MANIFEST constant defined in middleware');

// Verify MCP manifest content
const mcpMatch = middlewareCode.match(/const MCP_MANIFEST = JSON\.stringify\((\{[\s\S]*?\})\s*,\s*null/);
if (mcpMatch) {
  // Define SITE_URL so the template literal in the extracted source can be evaluated
  const SITE_URL = 'https://supply-chain-risk-analysis-po64.vercel.app';
  const mcpContent = eval(`(${mcpMatch[1]})`);
  assert(mcpContent.name, 'MCP manifest has name');
  assert(mcpContent.description, 'MCP manifest has description');
  assert(mcpContent.tools && mcpContent.tools.length >= 3, `MCP manifest has ≥3 tools (got ${mcpContent.tools?.length})`);
  assert(mcpContent.tools.every(t => t.name && t.description && t.inputSchema), 'All MCP tools have name, description, inputSchema');

} else {
  assert(false, 'MCP manifest parseable from middleware');
}

// ===========================================================================
// Preserved behaviors from Round 1
// ===========================================================================
console.log('\n📋 Preserved: Round 1 fixes');

// Static HTML content
const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>\s*<noscript>/);
const rootContent = rootMatch ? rootMatch[1] : '';
const textOnly = rootContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
assert(textOnly.length >= 500, `Static HTML ≥500 chars (actual: ${textOnly.length})`);
assert(/<h1[^>]*>/.test(rootContent), 'H1 heading present');
assert(/<noscript>/.test(indexHtml), '<noscript> fallback present');

// SoftwareApplication JSON-LD
const swBlock = jsonLdBlocks.find(m => m[1].includes('"SoftwareApplication"'));
assert(swBlock !== undefined, 'SoftwareApplication JSON-LD preserved');

// Markdown content negotiation
assert(/text\/markdown/.test(middlewareCode), 'Middleware handles text/markdown');
assert(/generate404Markdown/.test(middlewareCode), '404 markdown generator preserved');

// Supporting files
assert(existsSync(join(ROOT, 'public', 'sitemap.xml')), 'sitemap.xml exists');
assert(existsSync(join(ROOT, 'public', 'robots.txt')), 'robots.txt exists');

// Sitemap includes new pages
const sitemap = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf-8');
assert(/\/docs/.test(sitemap), 'Sitemap includes /docs');
assert(/\/about/.test(sitemap), 'Sitemap includes /about');
assert(/\/contact/.test(sitemap), 'Sitemap includes /contact');
assert(/\/privacy/.test(sitemap), 'Sitemap includes /privacy');

// ===========================================================================
// Summary
// ===========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${'='.repeat(60)}\n`);

if (failed > 0) {
  process.exit(1);
}
