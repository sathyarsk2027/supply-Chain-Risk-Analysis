// Vercel Edge Middleware — handles content negotiation for text/markdown,
// trust anchor pages, developer portal, SDK documentation, auth docs,
// MCP manifest, and 404 error bodies.

const SITE_URL = 'https://supply-chain-risk-analysis-po64.vercel.app';

// Common nav links for all HTML pages
const COMMON_NAV = `<nav><a href="/">← Home</a> <a href="/developers">Developers</a> <a href="/docs">API Docs</a> <a href="/sdk">SDKs</a> <a href="/docs/auth">Auth</a> <a href="/openapi.json">OpenAPI</a> <a href="/about">About</a> <a href="/contact">Contact</a></nav>`;

const COMMON_CSS = `
  body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.7; }
  h1 { color: #8f9e7c; font-size: 2.2rem; margin-bottom: 0.5rem; }
  h2 { color: #a8b89c; margin-top: 2.5rem; border-bottom: 1px solid #222; padding-bottom: 0.5rem; }
  h3 { color: #c8d8bc; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  nav { margin-bottom: 2rem; font-size: 0.9rem; }
  nav a { margin-right: 1.2rem; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.85rem; color: #888; }
  code { font-family: 'JetBrains Mono', monospace; background: #1a1a25; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #111118; border: 1px solid #2a2a35; border-radius: 8px; padding: 1rem 1.5rem; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
  pre code { background: none; padding: 0; }
  .card { background: #111118; border: 1px solid #2a2a35; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; margin-right: 0.5rem; }
  .badge-get { background: #1a3a2a; color: #4ade80; }
  .badge-post { background: #3a2a1a; color: #fbbf24; }
  .highlight { background: rgba(143, 158, 124, 0.15); border-left: 3px solid #8f9e7c; padding: 1rem 1.5rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #2a2a35; padding: 0.5rem 1rem; text-align: left; font-size: 0.9rem; }
  th { background: #111118; color: #8f9e7c; }
`;

// ---------------------------------------------------------------------------
// Homepage markdown (for Accept: text/markdown)
// ---------------------------------------------------------------------------
const HOMEPAGE_MARKDOWN = `# Supply Chain Risk Monitor

> Real-Time Global Disruption Intelligence

Supply Chain Risk Monitor is a comprehensive intelligence platform that tracks real-time global logistics news, carrier disruptions, warehouse incidents, port congestion, and geopolitical events affecting international supply chains. Powered by semantic AI search, NASA satellite imagery overlays, and NLP-driven article analysis, the platform aggregates news from multiple RSS feeds and NewsAPI sources to surface emerging risks before they cascade through the supply chain.

## Core Capabilities

- **Real-time news aggregation** from global logistics, shipping, and trade RSS feeds with 15-minute automatic synchronization
- **Semantic AI-powered search** using vector embeddings to find contextually relevant disruption reports across all ingested articles
- **NASA satellite imagery** integration for geographic risk assessment and visual verification of disruption events
- **Country-level risk scoring** combining news sentiment, event frequency, and geopolitical indicators into actionable risk dashboards
- **NLP-powered categorization** that classifies articles by disruption type: port congestion, weather events, labor disputes, regulatory changes, and more
- **Interactive 3D globe visualization** with live disruption pins showing active incidents across global shipping routes

## How It Works

The platform continuously polls RSS feeds and news APIs for supply chain-related articles. Each article is processed through an NLP pipeline that extracts entities, classifies disruption categories, assigns relevance scores, and maps events to affected countries and shipping corridors.

Users can explore disruptions through:

1. **Live Feed** — Chronological stream of disruption events with category filters
2. **Semantic Search** — AI-powered natural language search across all articles
3. **Analytics Dashboard** — Satellite imagery overlays with country risk heat maps

## Developer Resources

- [Developer Portal](${SITE_URL}/developers)
- [API Documentation](${SITE_URL}/docs)
- [SDK Documentation (Python & TypeScript)](${SITE_URL}/sdk)
- [Authentication & API Keys](${SITE_URL}/docs/auth)
- [OpenAPI 3.1.0 Specification](${SITE_URL}/openapi.json)
- [Model Context Protocol (MCP) Server](${SITE_URL}/.well-known/mcp)
- [llms.txt](${SITE_URL}/llms.txt)
- [Sitemap](${SITE_URL}/sitemap.xml)

## Links

- [Homepage](${SITE_URL}/)
- [About](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [Privacy Policy](${SITE_URL}/privacy)

---

*Built for supply chain professionals, logistics analysts, and risk managers.*
`;

// ---------------------------------------------------------------------------
// Trust anchor pages: /about
// ---------------------------------------------------------------------------
const ABOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About — Supply Chain Risk Monitor</title>
  <meta name="description" content="Learn about Supply Chain Risk Monitor, a real-time global disruption intelligence platform for supply chain professionals.">
  <link rel="canonical" href="${SITE_URL}/about">
  <meta property="og:title" content="About — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/about">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>About Supply Chain Risk Monitor</h1>
  <p>Supply Chain Risk Monitor is a real-time global disruption intelligence platform designed for supply chain professionals, logistics analysts, and risk managers. The platform was built to solve a critical industry problem: supply chain disruptions are reported across hundreds of fragmented news sources, making it nearly impossible to maintain situational awareness without dedicated intelligence tooling.</p>

  <h2>Our Mission</h2>
  <p>We aggregate, analyze, and visualize supply chain disruption events from around the world in real time. Our platform pulls news from over 20 RSS feeds and NewsAPI sources, processes each article through a multi-stage NLP pipeline, and presents the results through an interactive dashboard with 3D globe visualization, satellite imagery overlays, and AI-powered semantic search.</p>

  <div class="highlight">
    <strong>Key Differentiator:</strong> Unlike traditional news aggregators, Supply Chain Risk Monitor applies domain-specific NLP to classify disruptions by type (port congestion, weather events, labor disputes, regulatory changes), extract affected entities (ports, shipping lines, countries), and compute country-level risk scores using recency-weighted mathematical models.
  </div>

  <h2>Technology Stack</h2>
  <p>The platform is built on a modern, full-stack architecture. The backend is a Spring Boot (Java) application with PostgreSQL and pgvector for vector similarity search. The NLP service is a Python Flask application using sentence-transformers for embedding generation and spaCy for entity extraction. The frontend is a React application with Three.js for 3D visualization, Leaflet.js for satellite tile mapping, and react-three-fiber for WebGL rendering. The entire stack is deployed on Render (backend + NLP) and Vercel (frontend).</p>

  <h2>Developer Resources &amp; SDKs</h2>
  <p>Supply Chain Risk Monitor exposes a public REST API for programmatic access, along with official SDKs for Python and TypeScript. AI agents, logistics dashboards, and risk management systems can integrate directly via our <a href="/openapi.json">OpenAPI specification</a> or <a href="/sdk">SDK documentation</a>.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor. Built by Sathya — <a href="${SITE_URL}/">supply-chain-risk-analysis-po64.vercel.app</a></p>
  </footer>
</body>
</html>`;

const ABOUT_MARKDOWN = `# About Supply Chain Risk Monitor

Supply Chain Risk Monitor is a real-time global disruption intelligence platform designed for supply chain professionals, logistics analysts, and risk managers. The platform was built to solve a critical industry problem: supply chain disruptions are reported across hundreds of fragmented news sources, making it nearly impossible to maintain situational awareness without dedicated intelligence tooling.

## Our Mission

We aggregate, analyze, and visualize supply chain disruption events from around the world in real time. Our platform pulls news from over 20 RSS feeds and NewsAPI sources, processes each article through a multi-stage NLP pipeline, and presents the results through an interactive dashboard with 3D globe visualization, satellite imagery overlays, and AI-powered semantic search.

## Technology Stack

The platform is built on a modern, full-stack architecture: Spring Boot (Java) backend with PostgreSQL + pgvector, Python NLP service with sentence-transformers and spaCy, React frontend with Three.js and Leaflet.js.

## Developer Resources & SDKs

Supply Chain Risk Monitor exposes a [public REST API](/openapi.json) for programmatic access, along with official [SDKs for Python and TypeScript](/sdk). See the [Developer Portal](/developers) for details.

---

[Home](${SITE_URL}/) · [Contact](${SITE_URL}/contact) · [Privacy](${SITE_URL}/privacy) · [API Docs](${SITE_URL}/docs) · [SDKs](${SITE_URL}/sdk)
`;

// ---------------------------------------------------------------------------
// Trust anchor pages: /contact
// ---------------------------------------------------------------------------
const CONTACT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact — Supply Chain Risk Monitor</title>
  <meta name="description" content="Contact the Supply Chain Risk Monitor team for API access, integration support, or partnership inquiries.">
  <link rel="canonical" href="${SITE_URL}/contact">
  <meta property="og:title" content="Contact — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/contact">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Contact Us</h1>
  <p>Have questions about the Supply Chain Risk Monitor platform, need API integration support, or want to discuss partnership opportunities? We would love to hear from you. Choose the most relevant contact channel below.</p>

  <div class="card">
    <h3>General Inquiries &amp; Developer Support</h3>
    <p>For questions about the platform, API access, SDK integration, or technical questions, reach out via email. We typically respond within 24-48 hours on business days.</p>
    <p><strong>Email:</strong> <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a></p>
  </div>

  <div class="card">
    <h3>Open Source &amp; Issue Tracking</h3>
    <p>Report bugs, request features, or contribute to the open-source platform on GitHub.</p>
    <p><strong>GitHub:</strong> <a href="https://github.com/sathyarsk2027/supply-Chain-Risk-Analysis">github.com/sathyarsk2027/supply-Chain-Risk-Analysis</a></p>
  </div>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor. Built by Sathya — <a href="${SITE_URL}/">supply-chain-risk-analysis-po64.vercel.app</a></p>
  </footer>
</body>
</html>`;

const CONTACT_MARKDOWN = `# Contact Us — Supply Chain Risk Monitor

Have questions about the Supply Chain Risk Monitor platform, need API integration support, or want to discuss partnership opportunities?

## Channels

- **Email Support:** [sathyarsk2027@gmail.com](mailto:sathyarsk2027@gmail.com)
- **GitHub Repository:** [github.com/sathyarsk2027/supply-Chain-Risk-Analysis](https://github.com/sathyarsk2027/supply-Chain-Risk-Analysis)
- **Developer Portal:** [${SITE_URL}/developers](${SITE_URL}/developers)

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [Privacy](${SITE_URL}/privacy) · [Docs](${SITE_URL}/docs)
`;

// ---------------------------------------------------------------------------
// Trust anchor pages: /privacy
// ---------------------------------------------------------------------------
const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Supply Chain Risk Monitor</title>
  <meta name="description" content="Privacy policy for Supply Chain Risk Monitor detailing our data collection, handling, and security practices.">
  <link rel="canonical" href="${SITE_URL}/privacy">
  <meta property="og:title" content="Privacy Policy — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/privacy">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Privacy Policy</h1>
  <p>Last updated: September 30, 2026</p>
  <p>Supply Chain Risk Monitor ("we," "our," or "the platform") is committed to protecting your privacy and handling data responsibly. This Privacy Policy describes how we collect, use, and protect information when you use our website, public API, and developer tools.</p>

  <h2>Information We Collect</h2>
  <p>We believe in data minimization. We only collect information that is strictly necessary to operate the platform:</p>
  <ul>
    <li><strong>Public RSS &amp; News Data:</strong> We aggregate publicly available news articles from RSS feeds and NewsAPI. This data contains public news headlines, summaries, URLs, and publication dates. No personal information is extracted or stored from these articles.</li>
    <li><strong>Search Queries:</strong> Queries submitted through our semantic search interface are processed ephemerally to generate vector embeddings and retrieve matching articles. Search queries are not stored, logged with IP addresses, or used for user profiling.</li>
    <li><strong>Email Digest Subscriptions:</strong> If you opt in to receive our daily disruption digest, we store your email address solely for delivering the digest. We will never sell, rent, or share your email address.</li>
    <li><strong>API Usage Logs:</strong> We collect standard HTTP request telemetry (endpoint, status code, IP address for sliding-window rate limiting) to protect service stability. Logs are rotated and purged automatically.</li>
  </ul>

  <h2>Cookies and Tracking</h2>
  <p>Supply Chain Risk Monitor does <strong>not</strong> use tracking cookies, advertising trackers, or third-party analytics scripts. Your browsing activity on this platform is completely private.</p>

  <h2>Security &amp; Contact</h2>
  <p>All data in transit is encrypted using modern TLS (HTTPS). For questions or data requests, contact <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a>.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor. Built by Sathya — <a href="${SITE_URL}/">supply-chain-risk-analysis-po64.vercel.app</a></p>
  </footer>
</body>
</html>`;

const PRIVACY_MARKDOWN = `# Privacy Policy — Supply Chain Risk Monitor

Last updated: September 30, 2026

Supply Chain Risk Monitor is committed to protecting user privacy. We collect publicly available news articles for analysis, process search queries ephemerally, and store email addresses only for digest subscribers. We do not use cookies, tracking scripts, or third-party analytics. All data is encrypted in transit via TLS. Contact [sathyarsk2027@gmail.com](mailto:sathyarsk2027@gmail.com) for data deletion requests.

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [Contact](${SITE_URL}/contact)
`;

// ---------------------------------------------------------------------------
// Developer Portal: /developers, /dev
// ---------------------------------------------------------------------------
const DEVELOPERS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Developer Portal — Supply Chain Risk Monitor</title>
  <meta name="description" content="Supply Chain Risk Monitor Developer Portal. Access REST API documentation, Python and TypeScript SDKs, OpenAPI 3.1 specifications, and MCP server integrations.">
  <link rel="canonical" href="${SITE_URL}/developers">
  <meta property="og:title" content="Developer Portal — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/developers">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Supply Chain Risk Monitor Developer Portal</h1>
  <p>Welcome to the official developer hub for Supply Chain Risk Monitor. Integrate real-time supply chain disruption intelligence, vector semantic search, and country risk scoring directly into your agents, dashboards, and automated supply chain workflows.</p>

  <h2>Developer Resources</h2>
  <div class="grid">
    <div class="card">
      <h3><a href="/docs">API Documentation</a></h3>
      <p>Comprehensive endpoint documentation for articles, semantic search, country risk scores, and live synchronization.</p>
    </div>
    <div class="card">
      <h3><a href="/sdk">SDK Documentation</a></h3>
      <p>Official client libraries for Python (<code>pip install scrm-client</code>) and TypeScript/Node.js (<code>npm install @scrm/sdk</code>).</p>
    </div>
    <div class="card">
      <h3><a href="/openapi.json">OpenAPI 3.1.0 Spec</a></h3>
      <p>Machine-readable JSON specification with 100% typed schemas and unique operation IDs for automated agent function calling.</p>
    </div>
    <div class="card">
      <h3><a href="/docs/auth">Authentication &amp; API Keys</a></h3>
      <p>Guides on public read-only access, future Bearer token authentication, rate limits, and security headers.</p>
    </div>
    <div class="card">
      <h3><a href="/.well-known/mcp">MCP Server Manifest</a></h3>
      <p>Model Context Protocol definition with 5 specialized tools for Claude Desktop, Cursor, and agentic runtimes.</p>
    </div>
    <div class="card">
      <h3><a href="/llms.txt">llms.txt</a></h3>
      <p>Standardized AI agent instructions, prompt engineering rules, when-to-use guidelines, and endpoint examples.</p>
    </div>
  </div>

  <h2>API Versioning &amp; Deprecation Policy</h2>
  <p>The API follows URL path versioning (<code>/api/v1/...</code>). An unversioned path alias (<code>/api/...</code>) points to the latest stable release. All responses return <code>API-Version: 1.0.0</code>.</p>
  <p>Deprecation notices are communicated at least 6 months prior to retirement via RFC 8594 standard headers: <code>Deprecation</code> and <code>Sunset</code>.</p>

  <h2>Rate Limits</h2>
  <p>Standard anonymous quota is <strong>100 requests per minute per IP</strong>. All responses include standard RFC RateLimit headers: <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code>, <code>RateLimit-Reset</code>, and <code>RateLimit-Policy</code>. If exceeded, the API returns HTTP 429 with a <code>Retry-After</code> header.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/docs">API Docs</a> · <a href="/sdk">SDKs</a></p>
  </footer>
</body>
</html>`;

const DEVELOPERS_MARKDOWN = `# Supply Chain Risk Monitor — Developer Portal

Welcome to the official developer hub for Supply Chain Risk Monitor.

## Resources

- **API Documentation:** [${SITE_URL}/docs](${SITE_URL}/docs)
- **SDK Documentation (Python & TypeScript):** [${SITE_URL}/sdk](${SITE_URL}/sdk)
- **OpenAPI 3.1.0 Specification:** [${SITE_URL}/openapi.json](${SITE_URL}/openapi.json)
- **Authentication & API Keys:** [${SITE_URL}/docs/auth](${SITE_URL}/docs/auth)
- **MCP Server Manifest:** [${SITE_URL}/.well-known/mcp](${SITE_URL}/.well-known/mcp)
- **llms.txt (Agent Instructions):** [${SITE_URL}/llms.txt](${SITE_URL}/llms.txt)

## Versioning & Deprecation Policy

- Base URL: \`${SITE_URL}/api/v1\`
- Deprecation Policy: 6 months notice prior to retirement with RFC 8594 \`Sunset\` and \`Deprecation\` headers.
- Rate Limits: 100 requests per minute per IP with RFC standard \`RateLimit-Limit\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\`, \`RateLimit-Policy\`, and \`Retry-After\` headers.

---

[Home](${SITE_URL}/) · [API Docs](${SITE_URL}/docs) · [SDKs](${SITE_URL}/sdk)
`;

// ---------------------------------------------------------------------------
// SDK Documentation: /sdk, /docs/sdk, /sdks
// ---------------------------------------------------------------------------
const SDK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDK Documentation — Supply Chain Risk Monitor</title>
  <meta name="description" content="Official SDK documentation for Supply Chain Risk Monitor. Libraries for Python (scrm-client) and TypeScript/Node.js (@scrm/sdk).">
  <link rel="canonical" href="${SITE_URL}/sdk">
  <meta property="og:title" content="SDK Documentation — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/sdk">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Supply Chain Risk Monitor SDK Documentation</h1>
  <p>Integrate Supply Chain Risk Monitor into your applications with our lightweight, fully typed SDKs for Python and TypeScript/JavaScript. Both SDKs feature built-in rate-limiting retry logic, TypeScript definitions, and helper methods for semantic search and risk analytics.</p>

  <h2>Python SDK</h2>
  <p>Install via pip:</p>
  <pre><code>pip install scrm-client</code></pre>

  <p>Quickstart example:</p>
  <pre><code>from scrm import SupplyChainRiskClient

client = SupplyChainRiskClient()

# 1. List latest disruption news
articles = client.articles.list(limit=20, category="Port Congestion")
for article in articles:
    print(f"[{article.source}] {article.title}")

# 2. Semantic AI search
results = client.search.query("Red Sea vessel diversions impact on Europe")
print(f"Summary: {results.summary}")
for match in results.matches:
    print(f"Score {match.score:.2f}: {match.article.title}")

# 3. Country Risk Assessment
risk = client.countries.get_risk(country="India")
print(f"India Risk: {risk.base_score}/100 ({risk.status})")
print("Highlights:", risk.highlights)</code></pre>

  <h2>TypeScript / Node.js SDK</h2>
  <p>Install via npm:</p>
  <pre><code>npm install @scrm/sdk</code></pre>

  <p>Quickstart example:</p>
  <pre><code>import { SupplyChainRiskClient } from '@scrm/sdk';

const client = new SupplyChainRiskClient({
  baseUrl: 'https://supply-chain-risk-analysis-po64.vercel.app/api/v1',
});

// Semantic search across global disruptions
const search = await client.search.query({
  query: 'semiconductor supply chain delays in East Asia',
  topK: 5,
});

console.log('AI Synthesis:', search.summary);

// Assess country risk
const countryRisk = await client.countries.getRisk({ query: 'China' });
console.log(\`Risk Score: \${countryRisk.baseScore} (\${countryRisk.status})\`);</code></pre>

  <h2>Error Handling &amp; Rate Limiting</h2>
  <p>The SDKs automatically parse structured JSON error responses (<code>code</code>, <code>message</code>, <code>hint</code>) and respect RFC RateLimit headers (<code>RateLimit-Reset</code> and <code>Retry-After</code> on HTTP 429) to automatically throttle and retry requests.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/developers">Developer Portal</a> · <a href="/docs">API Docs</a></p>
  </footer>
</body>
</html>`;

const SDK_MARKDOWN = `# Supply Chain Risk Monitor — SDK Documentation

Official client libraries for Python and TypeScript/Node.js.

## Python SDK (\`scrm-client\`)

Install:
\`\`\`bash
pip install scrm-client
\`\`\`

Example:
\`\`\`python
from scrm import SupplyChainRiskClient

client = SupplyChainRiskClient()

# Semantic search
results = client.search.query("port congestion in Southeast Asia")
print(results.summary)

# Country risk
risk = client.countries.get_risk(country="India")
print(f"Risk Score: {risk.base_score}/100 ({risk.status})")
\`\`\`

## TypeScript / Node.js SDK (\`@scrm/sdk\`)

Install:
\`\`\`bash
npm install @scrm/sdk
\`\`\`

Example:
\`\`\`typescript
import { SupplyChainRiskClient } from '@scrm/sdk';

const client = new SupplyChainRiskClient();
const risk = await client.countries.getRisk({ query: 'India' });
console.log(risk.baseScore, risk.status);
\`\`\`

## Features

- Full TypeScript types & Pydantic models
- Automatic backoff on HTTP 429 using \`Retry-After\` and \`RateLimit-Reset\`
- Pre-configured for versioned \`/api/v1\` endpoints

---

[Developer Portal](${SITE_URL}/developers) · [API Docs](${SITE_URL}/docs) · [OpenAPI](${SITE_URL}/openapi.json)
`;

// ---------------------------------------------------------------------------
// Authentication Docs: /docs/auth, /auth
// ---------------------------------------------------------------------------
const AUTH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication &amp; API Keys — Supply Chain Risk Monitor</title>
  <meta name="description" content="Authentication and API key guide for Supply Chain Risk Monitor. Public read-only access, future Bearer token authentication, and security headers.">
  <link rel="canonical" href="${SITE_URL}/docs/auth">
  <meta property="og:title" content="Authentication &amp; API Keys — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/docs/auth">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Supply Chain Risk Monitor Authentication &amp; API Keys</h1>
  <p>Learn how to authenticate requests to the Supply Chain Risk Monitor API surface.</p>

  <h2>Public Read Tier (Current)</h2>
  <p>All core GET and search endpoints on <code>/api/v1/*</code> are currently open for public read-only access. <strong>No API key or authorization token is required</strong> for standard agentic research or exploratory usage.</p>
  <pre><code>curl -s https://supply-chain-risk-analysis-po64.vercel.app/api/v1/articles</code></pre>

  <h2>Rate Limiting &amp; Quotas</h2>
  <p>Public requests are throttled at <strong>100 requests per minute per IP address</strong>. Responses include RFC standard headers to enable automatic client-side self-throttling:</p>
  <ul>
    <li><code>RateLimit-Limit: 100</code></li>
    <li><code>RateLimit-Remaining: 98</code></li>
    <li><code>RateLimit-Reset: 45</code></li>
    <li><code>RateLimit-Policy: 100;w=60</code></li>
    <li><code>Retry-After: 60</code> (returned on HTTP 429)</li>
  </ul>

  <h2>Enterprise &amp; Dedicated API Keys</h2>
  <p>High-volume automated pipelines can request dedicated API keys with higher concurrency limits. Include keys via the standard Authorization Bearer header:</p>
  <pre><code>Authorization: Bearer scrm_live_xxxxxxxxxxxxxxxxxxxx</code></pre>
  <p>To request an enterprise key, email <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a>.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/developers">Developer Portal</a> · <a href="/docs">API Docs</a></p>
  </footer>
</body>
</html>`;

const AUTH_MARKDOWN = `# Supply Chain Risk Monitor — Authentication & API Keys

## Public Access

The API is public and read-only. No API key is required for GET endpoints and search queries:

\`\`\`bash
curl -s ${SITE_URL}/api/v1/articles
\`\`\`

## Rate Limits

- Quota: 100 requests per minute per IP
- Rate-limit headers: \`RateLimit-Limit\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\`, \`RateLimit-Policy\`
- On 429: \`Retry-After\` header is provided

## Dedicated Keys

For higher quotas, pass an authorization header:
\`\`\`
Authorization: Bearer scrm_live_xxxxxxxxxxxxxxxxxxxx
\`\`\`

Contact: [sathyarsk2027@gmail.com](mailto:sathyarsk2027@gmail.com)

---

[Developer Portal](${SITE_URL}/developers) · [API Docs](${SITE_URL}/docs) · [SDKs](${SITE_URL}/sdk)
`;

// ---------------------------------------------------------------------------
// Model Context Protocol (MCP) Docs: /mcp
// ---------------------------------------------------------------------------
const MCP_DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Model Context Protocol (MCP) — Supply Chain Risk Monitor</title>
  <meta name="description" content="Model Context Protocol (MCP) server integration for Supply Chain Risk Monitor. Connect Claude Desktop, Cursor, and agentic workflows to live supply chain disruption data.">
  <link rel="canonical" href="${SITE_URL}/mcp">
  <meta property="og:title" content="MCP Server — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/mcp">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Supply Chain Risk Monitor MCP Server</h1>
  <p>Supply Chain Risk Monitor publishes a standardized Model Context Protocol (MCP) manifest at <a href="/.well-known/mcp"><code>/.well-known/mcp</code></a>, enabling AI assistants like Claude Desktop, Cursor, and custom agentic runtimes to access real-time logistics intelligence natively.</p>

  <h2>Claude Desktop Configuration</h2>
  <p>Add this to your <code>claude_desktop_config.json</code>:</p>
  <pre><code>{
  "mcpServers": {
    "supply-chain-risk-monitor": {
      "url": "${SITE_URL}/api"
    }
  }
}</code></pre>

  <h2>Available Tools</h2>
  <ul>
    <li><code>listArticles</code>: List recent supply chain disruption news with category and country filters.</li>
    <li><code>semanticSearch</code>: Natural language vector search across all ingested articles.</li>
    <li><code>getCountryRisk</code>: Real-time risk assessment (0-100) and risk drivers for any country.</li>
    <li><code>getActiveCountries</code>: List of countries with active disruption news coverage.</li>
    <li><code>syncArticles</code>: Force live RSS feed and NewsAPI synchronization.</li>
  </ul>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/developers">Developer Portal</a> · <a href="/docs">API Docs</a></p>
  </footer>
</body>
</html>`;

const MCP_DOCS_MARKDOWN = `# Supply Chain Risk Monitor — MCP Server

Manifest URL: [${SITE_URL}/.well-known/mcp](${SITE_URL}/.well-known/mcp)

## Available Tools

1. \`listArticles\` — List recent supply chain disruption news with filters
2. \`semanticSearch\` — Natural language vector search across all articles
3. \`getCountryRisk\` — Real-time risk assessment (0-100) for a country
4. \`getActiveCountries\` — Countries with active disruption news
5. \`syncArticles\` — Force live feed refresh

---

[Developer Portal](${SITE_URL}/developers) · [API Docs](${SITE_URL}/docs) · [SDKs](${SITE_URL}/sdk)
`;

// ---------------------------------------------------------------------------
// API Docs page: /docs, /api-docs
// ---------------------------------------------------------------------------
const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation — Supply Chain Risk Monitor</title>
  <meta name="description" content="Supply Chain Risk Monitor REST API documentation. Endpoints for articles, semantic search, country risk scoring, and feed synchronization.">
  <link rel="canonical" href="${SITE_URL}/docs">
  <meta property="og:title" content="API Documentation — Supply Chain Risk Monitor">
  <meta property="og:site_name" content="Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/docs">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>${COMMON_CSS}</style>
</head>
<body>
  ${COMMON_NAV}
  <h1>Supply Chain Risk Monitor API Documentation</h1>
  <p>Supply Chain Risk Monitor exposes a public REST API for programmatic access to supply chain disruption intelligence. No authentication is required for read-only endpoints.</p>

  <div class="card">
    <p><strong>Base URL (Versioned):</strong> <code>${SITE_URL}/api/v1</code></p>
    <p><strong>Unversioned Alias:</strong> <code>${SITE_URL}/api</code></p>
    <p><strong>OpenAPI 3.1.0 Spec:</strong> <a href="/openapi.json">${SITE_URL}/openapi.json</a></p>
    <p><strong>SDKs:</strong> <a href="/sdk">Python &amp; TypeScript SDK Documentation</a></p>
  </div>

  <h2>Versioning &amp; Deprecation Policy</h2>
  <p>All endpoints are versioned under <code>/api/v1/...</code>. All responses include the <code>API-Version: 1.0.0</code> header. Deprecation notices will be published 6 months in advance with RFC 8594 <code>Sunset</code> and <code>Deprecation</code> headers.</p>

  <h2>Rate Limits &amp; Throttling Headers</h2>
  <p>Requests are limited to <strong>100 requests per minute per IP</strong>. Responses include RFC standard rate-limit headers:</p>
  <ul>
    <li><code>RateLimit-Limit: 100</code></li>
    <li><code>RateLimit-Remaining: 99</code></li>
    <li><code>RateLimit-Reset: 60</code> (seconds until reset)</li>
    <li><code>RateLimit-Policy: 100;w=60</code></li>
    <li><code>Retry-After: 60</code> (on HTTP 429)</li>
  </ul>

  <h2>Articles</h2>

  <div class="card">
    <h3><span class="badge badge-get">GET</span> <code>/api/v1/articles</code></h3>
    <p>Returns ingested supply chain news articles, ordered by publication date (newest first). Supports <code>limit</code>, <code>category</code>, <code>source</code>, and <code>country</code> query parameters.</p>
    <pre><code>curl -s "${SITE_URL}/api/v1/articles?limit=10&category=Port+Congestion"</code></pre>
  </div>

  <div class="card">
    <h3><span class="badge badge-post">POST</span> <code>/api/v1/articles/sync</code></h3>
    <p>Triggers a live synchronization of all configured RSS feeds and NewsAPI sources. Returns the count of newly ingested articles.</p>
    <pre><code>curl -X POST "${SITE_URL}/api/v1/articles/sync"</code></pre>
  </div>

  <div class="card">
    <h3><span class="badge badge-get">GET</span> <code>/api/v1/articles/sources</code></h3>
    <p>Returns article count breakdown by news source.</p>
    <pre><code>curl -s "${SITE_URL}/api/v1/articles/sources"</code></pre>
  </div>

  <h2>Semantic Search</h2>

  <div class="card">
    <h3><span class="badge badge-post">POST</span> <code>/api/v1/query</code></h3>
    <p>Performs semantic AI search using vector embeddings (pgvector cosine similarity). Returns ranked matches with relevance scores and an AI-generated summary.</p>
    <pre><code>curl -X POST "${SITE_URL}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "port congestion in Southeast Asia", "topK": 10}'</code></pre>
  </div>

  <h2>Country Risk</h2>

  <div class="card">
    <h3><span class="badge badge-get">GET</span> <code>/api/v1/countries/active</code></h3>
    <p>Lists countries with active disruption news coverage, including ISO codes and geo-coordinates for map visualization.</p>
  </div>

  <div class="card">
    <h3><span class="badge badge-get">GET</span> <code>/api/v1/countries/risk?query={country}</code></h3>
    <p>Computes a real-time risk score (0-100) for a country. Returns categorical breakdown (geopolitical, logistics, weather, market), risk drivers, and matched articles.</p>
    <pre><code>curl -s "${SITE_URL}/api/v1/countries/risk?query=India"</code></pre>
  </div>

  <h2>Structured JSON Error Responses</h2>
  <p>All error responses return structured JSON with <code>error.code</code>, <code>error.message</code>, and <code>error.hint</code> fields:</p>
  <pre><code>{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Query string must not be empty",
    "hint": "Check the API documentation at /docs for valid request formats."
  }
}</code></pre>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/developers">Developer Portal</a> · <a href="/sdk">SDKs</a> · <a href="/openapi.json">OpenAPI</a></p>
  </footer>
</body>
</html>`;

const DOCS_MARKDOWN = `# Supply Chain Risk Monitor — API Documentation

Base URL: \`${SITE_URL}/api/v1\`
OpenAPI Spec: [/openapi.json](${SITE_URL}/openapi.json)
Developer Portal: [/developers](${SITE_URL}/developers)
SDK Documentation: [/sdk](${SITE_URL}/sdk)

## Versioning & Deprecation Policy

- All endpoints are versioned under \`/api/v1\`
- Unversioned alias \`/api\` is maintained
- RFC 8594 \`Sunset\` and \`Deprecation\` headers with 6 months notice prior to retirement
- Standard RateLimit headers: \`RateLimit-Limit: 100\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\`, \`RateLimit-Policy\`

## Endpoints

### GET /api/v1/articles
List all supply chain news articles with filters (\`limit\`, \`category\`, \`source\`, \`country\`).

### POST /api/v1/articles/sync
Trigger RSS feed synchronization. Returns count of new articles.

### GET /api/v1/articles/sources
Article count breakdown by news source.

### POST /api/v1/query
Semantic AI search. Body: \`{"query": "port congestion in Southeast Asia", "topK": 10}\`

### GET /api/v1/countries/active
Countries with active disruption coverage.

### GET /api/v1/countries/risk?query={country}
Country risk score (0-100) with categorical breakdown.

## Structured Error Format
\`\`\`json
{"error": {"code": "BAD_REQUEST", "message": "...", "hint": "..."}}
\`\`\`

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [SDKs](${SITE_URL}/sdk) · [Developers](${SITE_URL}/developers)
`;

// ---------------------------------------------------------------------------
// MCP Manifest (Fix #13 & Round 3: Typed input schemas for all 5 tools)
// ---------------------------------------------------------------------------
const MCP_MANIFEST = JSON.stringify({
  name: 'supply-chain-risk-monitor',
  description: 'Supply Chain Risk Monitor — Real-time global supply chain disruption intelligence. Query articles, run semantic search, and get country-level risk scores.',
  version: '1.0.0',
  transport: {
    type: 'http',
    url: `${SITE_URL}/api/v1`,
  },
  tools: [
    {
      name: 'listArticles',
      description: 'List all supply chain disruption news articles, ordered by publication date descending. Supports filtering by category, source, and country.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Maximum number of articles to return (1-500). Defaults to 50.' },
          category: { type: 'string', description: 'Filter by disruption category (e.g. "Port Congestion", "Labor Strike", "Weather Event").' },
          source: { type: 'string', description: 'Filter by publisher or news source name.' },
          country: { type: 'string', description: 'Filter by country name or code.' },
        },
        required: [],
      },
    },
    {
      name: 'semanticSearch',
      description: 'Search for supply chain disruption articles using natural language vector embeddings.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query (e.g., "port congestion in Southeast Asia").' },
          topK: { type: 'integer', description: 'Maximum number of semantically relevant articles to retrieve (default 10).' },
        },
        required: ['query'],
      },
    },
    {
      name: 'getCountryRisk',
      description: 'Get a real-time risk assessment (0-100 score) for a specific country based on current supply chain news.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Country name (e.g., "India", "China", "United States").' },
          days: { type: 'integer', description: 'Lookback window in days (default 30).' },
        },
        required: ['query'],
      },
    },
    {
      name: 'getActiveCountries',
      description: 'List all countries that currently have active supply chain disruption news coverage.',
      inputSchema: {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Optional geographic region filter (e.g., "Asia", "Europe", "Americas").' },
          minRiskArticles: { type: 'integer', description: 'Minimum number of active articles threshold.' },
        },
        required: [],
      },
    },
    {
      name: 'syncArticles',
      description: 'Trigger a live synchronization of RSS feeds and NewsAPI to ingest new articles.',
      inputSchema: {
        type: 'object',
        properties: {
          force: { type: 'boolean', description: 'Force re-polling of all feeds even if recently polled.' },
          sources: { type: 'array', items: { type: 'string' }, description: 'Optional list of specific feeds to synchronize.' },
        },
        required: [],
      },
    },
  ],
}, null, 2);

// ---------------------------------------------------------------------------
// 404 generator
// ---------------------------------------------------------------------------
function generate404Markdown(pathname) {
  return `# 404 — Page Not Found

The page \`${pathname}\` does not exist on Supply Chain Risk Monitor.

## What you can do

- Visit the [homepage](${SITE_URL}/) for the main dashboard
- Read the [API documentation](${SITE_URL}/docs) for developer resources
- Browse the [Developer Portal](${SITE_URL}/developers) for SDKs and integration guides
- Check the [SDK documentation](${SITE_URL}/sdk) for Python and TypeScript libraries
- Check the [sitemap](${SITE_URL}/sitemap.xml) for all available pages
- Read [llms.txt](${SITE_URL}/llms.txt) for machine-readable site information
- View the [OpenAPI spec](${SITE_URL}/openapi.json) for API endpoints

---

*Supply Chain Risk Monitor — Real-Time Global Disruption Intelligence*
`;
}

function generate404Html(pathname) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — Page Not Found — Supply Chain Risk Monitor</title>
  <style>body{font-family:Inter,system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;max-width:650px;margin:0 auto;padding:3rem;text-align:center;line-height:1.7}h1{color:#8f9e7c;font-size:3rem;margin-bottom:0}p{color:#aaa}a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}.links{margin-top:2rem;display:flex;flex-wrap:wrap;gap:1rem;justify-content:center}</style>
</head>
<body>
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p>The page <code>${pathname}</code> does not exist.</p>
  <div class="links">
    <a href="/">Home</a> <a href="/developers">Developers</a> <a href="/docs">API Docs</a> <a href="/sdk">SDKs</a> <a href="/docs/auth">Auth</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/openapi.json">OpenAPI</a> <a href="/llms.txt">llms.txt</a>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function prefersMarkdown(request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/markdown');
}

const STATIC_EXTENSIONS = /\.(js|css|json|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|xml|txt)$/i;

// Pages served by middleware (trust anchors + developer resources)
const KNOWN_PAGES = {
  '/about': { html: ABOUT_HTML, md: ABOUT_MARKDOWN },
  '/contact': { html: CONTACT_HTML, md: CONTACT_MARKDOWN },
  '/privacy': { html: PRIVACY_HTML, md: PRIVACY_MARKDOWN },
  '/docs': { html: DOCS_HTML, md: DOCS_MARKDOWN },
  '/api-docs': { html: DOCS_HTML, md: DOCS_MARKDOWN },
  '/developers': { html: DEVELOPERS_HTML, md: DEVELOPERS_MARKDOWN },
  '/dev': { html: DEVELOPERS_HTML, md: DEVELOPERS_MARKDOWN },
  '/sdk': { html: SDK_HTML, md: SDK_MARKDOWN },
  '/docs/sdk': { html: SDK_HTML, md: SDK_MARKDOWN },
  '/sdks': { html: SDK_HTML, md: SDK_MARKDOWN },
  '/docs/auth': { html: AUTH_HTML, md: AUTH_MARKDOWN },
  '/auth': { html: AUTH_HTML, md: AUTH_MARKDOWN },
  '/mcp': { html: MCP_DOCS_HTML, md: MCP_DOCS_MARKDOWN },
};

export const config = {
  matcher: ['/((?!_next|api|assets).*)'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Don't intercept static asset requests
  if (STATIC_EXTENSIONS.test(pathname)) {
    return;
  }

  // Base response headers for edge responses
  const edgeHeaders = {
    'Access-Control-Allow-Origin': '*',
    'RateLimit-Limit': '100',
    'RateLimit-Policy': '100;w=60',
    'API-Version': '1.0.0',
    'X-API-Version': '1.0.0',
  };

  // MCP manifest (Fix #13)
  if (pathname === '/.well-known/mcp' || pathname === '/.well-known/mcp.json') {
    return new Response(MCP_MANIFEST, {
      status: 200,
      headers: {
        ...edgeHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Vary': 'Accept',
      },
    });
  }

  const usesMarkdown = prefersMarkdown(request);

  // Homepage
  if (pathname === '/' || pathname === '') {
    if (usesMarkdown) {
      return new Response(HOMEPAGE_MARKDOWN, {
        status: 200,
        headers: {
          ...edgeHeaders,
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return; // Let Vercel serve index.html
  }

  // Known pages (about, contact, privacy, docs, developers, sdk, auth, mcp)
  const page = KNOWN_PAGES[pathname];
  if (page) {
    if (usesMarkdown) {
      return new Response(page.md, {
        status: 200,
        headers: {
          ...edgeHeaders,
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return new Response(page.html, {
      status: 200,
      headers: {
        ...edgeHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // All other non-static, non-API paths: 404
  if (usesMarkdown) {
    return new Response(generate404Markdown(pathname), {
      status: 404,
      headers: {
        ...edgeHeaders,
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // HTML 404 for browser requests to unknown non-SPA paths
  return new Response(generate404Html(pathname), {
    status: 404,
    headers: {
      ...edgeHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Vary': 'Accept',
      'Cache-Control': 'no-cache',
    },
  });
}
