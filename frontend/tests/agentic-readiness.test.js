/**
 * Tests for agentic readiness improvements (Rounds 1, 2, and 3).
 * 
 * Round 3 fixes:
 * 1. Brand name discoverability (Brand schema, brand meta tags, site_name, keywords)
 * 2. REST versioning / deprecation policy (/api/v1/, X-API-Version, Sunset/Deprecation headers)
 * 3. Rate limit response headers (RFC RateLimit-*, Retry-After, rate limit docs)
 * 4. Developer resource discoverability (SDK docs, Developer portal, Auth docs, MCP docs)
 * 5. Function calling compatibility (7/7 typed schemas, unique operationIds, typed MCP tools)
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
const openapiPath = join(ROOT, 'public', 'openapi.json');
const apiProxyPath = join(ROOT, 'api', '[...path].js');
const llmsTxtPath = join(ROOT, 'public', 'llms.txt');
const sitemapPath = join(ROOT, 'public', 'sitemap.xml');
const vercelPath = join(ROOT, 'vercel.json');

const spec = JSON.parse(readFileSync(openapiPath, 'utf-8'));
const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8'));
const llmsTxt = readFileSync(llmsTxtPath, 'utf-8');
const sitemap = readFileSync(sitemapPath, 'utf-8');
const proxyCode = readFileSync(apiProxyPath, 'utf-8');

// ===========================================================================
// Fix #1: Brand Name Discoverability (Round 3)
// ===========================================================================
console.log('\n📋 Fix #1: Brand Name Discoverability');

assert(/<title>.*Supply Chain Risk Monitor.*<\/title>/.test(indexHtml), 'Page title contains brand name prominently');
assert(/<meta property="og:site_name" content="Supply Chain Risk Monitor"/.test(indexHtml), 'og:site_name meta tag present with brand name');
assert(/<meta name="application-name" content="Supply Chain Risk Monitor"/.test(indexHtml), 'application-name meta tag set');
assert(/<meta name="keywords"[^>]*Supply Chain Risk Monitor/i.test(indexHtml), 'keywords meta tag contains brand name');
assert(/<link rel="canonical" href="https:\/\/supply-chain-risk-analysis-po64\.vercel\.app\/"/.test(indexHtml), 'Canonical link points to production apex domain');

// Check JSON-LD Brand schema
const jsonLdBlocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const brandBlock = jsonLdBlocks.find(m => {
  try {
    return JSON.parse(m[1])['@type'] === 'Brand';
  } catch {
    return false;
  }
});
assert(brandBlock !== undefined, 'Brand entity JSON-LD block exists');
if (brandBlock) {
  const brandData = JSON.parse(brandBlock[1]);
  assert(brandData['@type'] === 'Brand', 'JSON-LD @type is Brand');
  assert(brandData.name === 'Supply Chain Risk Monitor', 'Brand name is Supply Chain Risk Monitor');
}

// Check Organization schema
const orgBlock = jsonLdBlocks.find(m => m[1].includes('"Organization"'));
assert(orgBlock !== undefined, 'Organization JSON-LD block exists');
if (orgBlock) {
  const orgData = JSON.parse(orgBlock[1]);
  assert(orgData.brand, 'Organization links to Brand');
}

// ===========================================================================
// Fix #2: REST Versioning & Deprecation Policy (Round 3)
// ===========================================================================
console.log('\n📋 Fix #2: REST Versioning & Deprecation Policy');

// OpenAPI spec versioning
assert(spec.servers.some(s => s.url.includes('/api/v1')), 'OpenAPI servers includes /api/v1 versioned endpoint');
assert(Object.keys(spec.paths).some(p => p.startsWith('/api/v1/')), 'OpenAPI defines /api/v1/... paths');
assert(spec.info['x-api-versioning'], 'OpenAPI info has x-api-versioning metadata');
assert(/deprecation|sunset/i.test(spec.info.description), 'OpenAPI info.description documents deprecation policy');
assert(spec.components?.parameters?.ApiVersionHeader, 'OpenAPI components defines X-API-Version parameter');
assert(spec.components?.headers?.Sunset, 'OpenAPI components defines Sunset header');
assert(spec.components?.headers?.Deprecation, 'OpenAPI components defines Deprecation header');

// API Proxy versioning headers
assert(/API-Version/.test(proxyCode), 'API proxy sets API-Version response header');
assert(/X-API-Version/.test(proxyCode), 'API proxy sets X-API-Version response header');
assert(/Sunset/.test(proxyCode), 'API proxy sets Sunset deprecation header');
assert(/Deprecation/.test(proxyCode), 'API proxy sets Deprecation header');
assert(/\/api\/v1/.test(proxyCode), 'API proxy supports /api/v1 path prefix');

// Vercel rewrites for versioned API
const hasV1Rewrite = vercelConfig.rewrites.some(r => r.source && r.source.includes('/api/v1'));
assert(hasV1Rewrite, 'vercel.json has /api/v1/:path* rewrite rule');

// llms.txt documents versioning
assert(/\/api\/v1/.test(llmsTxt), 'llms.txt documents /api/v1 versioned base URL');
assert(/deprecation/i.test(llmsTxt), 'llms.txt documents deprecation policy');

// ===========================================================================
// Fix #3: Rate Limit Response Headers (Round 3)
// ===========================================================================
console.log('\n📋 Fix #3: Rate Limit Response Headers');

// API proxy rate limiting implementation
assert(/RateLimit-Limit/.test(proxyCode), 'API proxy sets RateLimit-Limit header');
assert(/RateLimit-Remaining/.test(proxyCode), 'API proxy sets RateLimit-Remaining header');
assert(/RateLimit-Reset/.test(proxyCode), 'API proxy sets RateLimit-Reset header');
assert(/RateLimit-Policy/.test(proxyCode), 'API proxy sets RateLimit-Policy header');
assert(/Retry-After/.test(proxyCode), 'API proxy sets Retry-After header on 429');
assert(/RATE_LIMITED/.test(proxyCode), 'API proxy handles 429 rate limit exceeded error');

// OpenAPI spec rate limit headers
assert(spec.components?.headers?.['RateLimit-Limit'], 'OpenAPI components defines RateLimit-Limit header');
assert(spec.components?.headers?.['RateLimit-Remaining'], 'OpenAPI components defines RateLimit-Remaining header');
assert(spec.components?.headers?.['RateLimit-Reset'], 'OpenAPI components defines RateLimit-Reset header');
assert(spec.components?.headers?.['Retry-After'], 'OpenAPI components defines Retry-After header');
assert(spec.info['x-rate-limit'], 'OpenAPI info defines x-rate-limit quota details');

// vercel.json RateLimit headers
const hasRateLimitHeader = vercelConfig.headers.some(h =>
  h.headers && h.headers.some(header => header.key === 'RateLimit-Limit')
);
assert(hasRateLimitHeader, 'vercel.json configures default RateLimit-Limit header');

// llms.txt documents rate limiting
assert(/RateLimit-Limit/i.test(llmsTxt), 'llms.txt documents RateLimit response headers');
assert(/Retry-After/i.test(llmsTxt), 'llms.txt documents Retry-After header');

// ===========================================================================
// Fix #4: Developer Resource Discoverability (Round 3)
// ===========================================================================
console.log('\n📋 Fix #4: Developer Resource Discoverability');

// Predictable developer pages in middleware
const devPages = ['/developers', '/sdk', '/docs/auth', '/mcp'];
for (const p of devPages) {
  const pattern = new RegExp(`['"]${p.replace('/', '\\/')}['"]`);
  assert(pattern.test(middlewareCode), `Middleware registers route for ${p}`);
}

// SDK Documentation page content
const sdkMatch = middlewareCode.match(/const SDK_HTML = `([\s\S]*?)`;/);
assert(sdkMatch !== null, 'SDK_HTML template exists in middleware');
if (sdkMatch) {
  const sdkText = sdkMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert(sdkText.length >= 500, `SDK_HTML has ≥500 chars of content (got ${sdkText.length})`);
  assert(/scrm-client/.test(sdkMatch[1]), 'SDK_HTML documents Python SDK (scrm-client)');
  assert(/@scrm\/sdk/.test(sdkMatch[1]), 'SDK_HTML documents TypeScript/Node SDK (@scrm/sdk)');
  assert(/pip install/.test(sdkMatch[1]), 'SDK_HTML includes pip install instructions');
  assert(/npm install/.test(sdkMatch[1]), 'SDK_HTML includes npm install instructions');
}

// Developer Portal content
const devMatch = middlewareCode.match(/const DEVELOPERS_HTML = `([\s\S]*?)`;/);
assert(devMatch !== null, 'DEVELOPERS_HTML template exists in middleware');
if (devMatch) {
  const devText = devMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert(devText.length >= 500, `DEVELOPERS_HTML has ≥500 chars (got ${devText.length})`);
}

// Auth Docs content
const authMatch = middlewareCode.match(/const AUTH_HTML = `([\s\S]*?)`;/);
assert(authMatch !== null, 'AUTH_HTML template exists in middleware');
if (authMatch) {
  const authText = authMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  assert(authText.length >= 500, `AUTH_HTML has ≥500 chars (got ${authText.length})`);
}

// Linked in llms.txt
assert(/\/developers/.test(llmsTxt), 'llms.txt links to Developer Portal');
assert(/\/sdk/.test(llmsTxt), 'llms.txt links to SDK documentation');
assert(/\/docs\/auth/.test(llmsTxt), 'llms.txt links to Auth documentation');
assert(/scrm-client/.test(llmsTxt), 'llms.txt mentions Python SDK');
assert(/@scrm\/sdk/.test(llmsTxt), 'llms.txt mentions TypeScript SDK');

// Linked in homepage (index.html)
assert(/href="\/developers"/.test(indexHtml), 'Homepage links to /developers');
assert(/href="\/sdk"/.test(indexHtml), 'Homepage links to /sdk');
assert(/href="\/docs\/auth"/.test(indexHtml), 'Homepage links to /docs/auth');

// Included in sitemap.xml
assert(/\/developers/.test(sitemap), 'sitemap.xml includes /developers');
assert(/\/sdk/.test(sitemap), 'sitemap.xml includes /sdk');
assert(/\/docs\/auth/.test(sitemap), 'sitemap.xml includes /docs/auth');
assert(/\/mcp/.test(sitemap), 'sitemap.xml includes /mcp');

// ===========================================================================
// Fix #5: Function Calling Compatibility (Round 3)
// ===========================================================================
console.log('\n📋 Fix #5: Function Calling Compatibility');

// Collect all operations from OpenAPI spec
const coreOperations = [
  'listArticles',
  'syncArticles',
  'getArticleSources',
  'semanticSearch',
  'getActiveCountries',
  'getCountryRisk',
  'pingDigestService',
];

const foundOpIds = [];
const opsWithTypedSchemas = [];

for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (typeof op === 'object' && op.operationId) {
      foundOpIds.push(op.operationId);
      
      // An operation has a typed schema if it has query/path parameters with schemas OR a typed requestBody
      const hasTypedParams = op.parameters && op.parameters.length > 0 && op.parameters.every(p => p.schema && p.schema.type);
      const hasTypedBody = op.requestBody && op.requestBody.content?.['application/json']?.schema;
      if (hasTypedParams || hasTypedBody) {
        opsWithTypedSchemas.push(op.operationId);
      }
    }
  }
}

// Verify core operation IDs are present and unique
for (const opId of coreOperations) {
  assert(foundOpIds.includes(opId), `OperationId "${opId}" is present in OpenAPI spec`);
  assert(opsWithTypedSchemas.includes(opId), `OperationId "${opId}" has typed input schema/parameters`);
}

const uniqueOpIds = new Set(foundOpIds);
assert(uniqueOpIds.size === foundOpIds.length, `All ${foundOpIds.length} operationIds across paths are unique`);
assert(coreOperations.every(id => opsWithTypedSchemas.includes(id)), `100% of core operations (7/7) have typed input schemas`);

// Verify MCP Manifest tools also have typed schemas for function calling
const mcpMatch = middlewareCode.match(/const MCP_MANIFEST = JSON\.stringify\((\{[\s\S]*?\})\s*,\s*null/);
assert(mcpMatch !== null, 'MCP_MANIFEST exists in middleware');
if (mcpMatch) {
  const SITE_URL = 'https://supply-chain-risk-analysis-po64.vercel.app';
  const mcpData = eval(`(${mcpMatch[1]})`);
  assert(mcpData.tools && mcpData.tools.length >= 5, `MCP manifest defines ≥5 tools (got ${mcpData.tools?.length})`);
  const allToolsTyped = mcpData.tools.every(t =>
    t.name && t.description && t.inputSchema?.type === 'object' && t.inputSchema?.properties
  );
  assert(allToolsTyped, 'All MCP tools have typed inputSchema with object properties');
  
  // Specific tool schemas
  const searchTool = mcpData.tools.find(t => t.name === 'semanticSearch');
  assert(searchTool?.inputSchema?.properties?.query?.type === 'string', 'MCP semanticSearch requires typed query');
  const riskTool = mcpData.tools.find(t => t.name === 'getCountryRisk');
  assert(riskTool?.inputSchema?.properties?.query?.type === 'string', 'MCP getCountryRisk requires typed query');
}

// ===========================================================================
// Preserved: Previous Rounds Regression Tests
// ===========================================================================
console.log('\n📋 Preserved: Rounds 1 & 2 Regressions');

// Static content without JS ≥500 chars
const rootMatch = indexHtml.match(/<div id="root">([\s\S]*?)<\/div>\s*<noscript>/);
const rootText = rootMatch ? rootMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
assert(rootText.length >= 500, `Static HTML text ≥500 chars (actual: ${rootText.length})`);
assert(/<h1[^>]*>/.test(indexHtml), 'H1 heading present in static content');
assert(/<noscript>/.test(indexHtml), '<noscript> fallback present');

// SoftwareApplication schema
const swBlock = jsonLdBlocks.find(m => m[1].includes('"SoftwareApplication"'));
assert(swBlock !== undefined, 'SoftwareApplication JSON-LD preserved');

// Markdown negotiation
assert(/text\/markdown/.test(middlewareCode), 'Middleware handles Accept: text/markdown');
assert(/generate404Markdown/.test(middlewareCode), '404 markdown generator preserved');
assert(/generate404Html/.test(middlewareCode), '404 HTML generator preserved');

// Trust anchors
assert(/\/about/.test(middlewareCode), 'Middleware serves /about');
assert(/\/contact/.test(middlewareCode), 'Middleware serves /contact');
assert(/\/privacy/.test(middlewareCode), 'Middleware serves /privacy');
assert(/\/docs/.test(middlewareCode), 'Middleware serves /docs');

// OpenAPI components & errors
assert(spec.components?.schemas?.ErrorResponse, 'ErrorResponse schema defined');
assert(spec.components?.schemas?.NewsArticle, 'NewsArticle schema defined');
assert(spec.components?.schemas?.QueryResponse, 'QueryResponse schema defined');
assert(spec.components?.schemas?.CountryRiskResponse, 'CountryRiskResponse schema defined');

// Robots.txt
const robotsTxt = readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf-8');
assert(/User-agent: \*/.test(robotsTxt), 'robots.txt has wildcard user-agent');
assert(/GPTBot/.test(robotsTxt), 'robots.txt explicitly welcomes GPTBot');
assert(/ClaudeBot/.test(robotsTxt), 'robots.txt explicitly welcomes ClaudeBot');
assert(/Sitemap:/.test(robotsTxt), 'robots.txt points to sitemap.xml');

// ===========================================================================
// Summary
// ===========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`${'='.repeat(60)}\n`);

if (failed > 0) {
  process.exit(1);
}
