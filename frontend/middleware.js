// Vercel Edge Middleware — handles content negotiation for text/markdown,
// trust anchor pages, docs page, MCP manifest, and 404 error bodies.

const SITE_URL = 'https://supply-chain-risk-analysis-po64.vercel.app';

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

- [API Documentation](${SITE_URL}/docs)
- [OpenAPI Specification](${SITE_URL}/openapi.json)
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
// Trust anchor pages (Fix #8)
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
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/about">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
    h1 { color: #8f9e7c; font-size: 2.2rem; margin-bottom: 0.5rem; } h2 { color: #a8b89c; margin-top: 2rem; }
    a { color: #60a5fa; text-decoration: none; } a:hover { text-decoration: underline; }
    nav { margin-bottom: 2rem; font-size: 0.9rem; } nav a { margin-right: 1.5rem; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.85rem; color: #888; }
    .highlight { background: rgba(143, 158, 124, 0.15); border-left: 3px solid #8f9e7c; padding: 1rem 1.5rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <nav><a href="/">← Home</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/docs">API Docs</a></nav>
  <h1>About Supply Chain Risk Monitor</h1>
  <p>Supply Chain Risk Monitor is a real-time global disruption intelligence platform designed for supply chain professionals, logistics analysts, and risk managers. The platform was built to solve a critical industry problem: supply chain disruptions are reported across hundreds of fragmented news sources, making it nearly impossible to maintain situational awareness without dedicated intelligence tooling.</p>

  <h2>Our Mission</h2>
  <p>We aggregate, analyze, and visualize supply chain disruption events from around the world in real time. Our platform pulls news from over 20 RSS feeds and NewsAPI sources, processes each article through a multi-stage NLP pipeline, and presents the results through an interactive dashboard with 3D globe visualization, satellite imagery overlays, and AI-powered semantic search.</p>

  <div class="highlight">
    <strong>Key Differentiator:</strong> Unlike traditional news aggregators, Supply Chain Risk Monitor applies domain-specific NLP to classify disruptions by type (port congestion, weather events, labor disputes, regulatory changes), extract affected entities (ports, shipping lines, countries), and compute country-level risk scores using recency-weighted mathematical models.
  </div>

  <h2>Technology Stack</h2>
  <p>The platform is built on a modern, full-stack architecture. The backend is a Spring Boot (Java) application with PostgreSQL and pgvector for vector similarity search. The NLP service is a Python Flask application using sentence-transformers for embedding generation and spaCy for entity extraction. The frontend is a React application with Three.js for 3D visualization, Leaflet.js for satellite tile mapping, and react-three-fiber for WebGL rendering. The entire stack is deployed on Render (backend + NLP) and Vercel (frontend).</p>

  <h2>Open API</h2>
  <p>Supply Chain Risk Monitor exposes a public REST API for programmatic access. AI agents, logistics dashboards, and risk management systems can integrate directly via our <a href="/openapi.json">OpenAPI specification</a>. See the <a href="/docs">API documentation</a> for endpoints, schemas, and examples.</p>

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

## Open API

Supply Chain Risk Monitor exposes a [public REST API](/openapi.json) for programmatic access. See the [API documentation](/docs) for details.

---

[Home](${SITE_URL}/) · [Contact](${SITE_URL}/contact) · [Privacy](${SITE_URL}/privacy) · [API Docs](${SITE_URL}/docs)
`;

const CONTACT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact — Supply Chain Risk Monitor</title>
  <meta name="description" content="Contact the Supply Chain Risk Monitor team for API access, integration support, or partnership inquiries.">
  <link rel="canonical" href="${SITE_URL}/contact">
  <meta property="og:title" content="Contact — Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/contact">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
    h1 { color: #8f9e7c; font-size: 2.2rem; margin-bottom: 0.5rem; } h2 { color: #a8b89c; margin-top: 2rem; }
    a { color: #60a5fa; text-decoration: none; } a:hover { text-decoration: underline; }
    nav { margin-bottom: 2rem; font-size: 0.9rem; } nav a { margin-right: 1.5rem; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.85rem; color: #888; }
    .contact-block { background: rgba(143, 158, 124, 0.1); border: 1px solid #2a2a35; padding: 1.5rem; border-radius: 8px; margin: 1rem 0; }
    .contact-block h3 { color: #8f9e7c; margin-top: 0; }
  </style>
</head>
<body>
  <nav><a href="/">← Home</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/docs">API Docs</a></nav>
  <h1>Contact Us</h1>
  <p>Have questions about the Supply Chain Risk Monitor platform, need API integration support, or want to discuss partnership opportunities? We would love to hear from you. Choose the most relevant contact channel below.</p>

  <div class="contact-block">
    <h3>General Inquiries &amp; API Support</h3>
    <p>For questions about the platform, API access, or technical integration support, reach out via email. We typically respond within 24-48 hours on business days.</p>
    <p><strong>Email:</strong> <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a></p>
  </div>

  <div class="contact-block">
    <h3>Bug Reports &amp; Feature Requests</h3>
    <p>Found a bug or have an idea for a new feature? Please open an issue on our GitHub repository. Include reproduction steps for bugs, or a detailed use case description for feature requests.</p>
    <p><strong>GitHub:</strong> <a href="https://github.com/sathyarsk2027/supply-Chain-Risk-Analysis">github.com/sathyarsk2027/supply-Chain-Risk-Analysis</a></p>
  </div>

  <div class="contact-block">
    <h3>Developer Resources</h3>
    <p>Looking to integrate with our API? Start with these resources:</p>
    <ul>
      <li><a href="/docs">API Documentation</a> — Interactive endpoint reference</li>
      <li><a href="/openapi.json">OpenAPI Specification</a> — Machine-readable API spec</li>
      <li><a href="/llms.txt">llms.txt</a> — AI agent integration guide</li>
    </ul>
  </div>

  <h2>Response Times</h2>
  <p>This is an open-source project maintained by a solo developer. While we aim for timely responses, please allow up to 48 hours for email replies and 72 hours for GitHub issue triage. Urgent production issues affecting API availability will be prioritized.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor. Built by Sathya — <a href="${SITE_URL}/">supply-chain-risk-analysis-po64.vercel.app</a></p>
  </footer>
</body>
</html>`;

const CONTACT_MARKDOWN = `# Contact — Supply Chain Risk Monitor

Have questions about the Supply Chain Risk Monitor platform, need API integration support, or want to discuss partnership opportunities?

## General Inquiries & API Support

Email: [sathyarsk2027@gmail.com](mailto:sathyarsk2027@gmail.com) — We typically respond within 24-48 hours.

## Bug Reports & Feature Requests

GitHub: [github.com/sathyarsk2027/supply-Chain-Risk-Analysis](https://github.com/sathyarsk2027/supply-Chain-Risk-Analysis)

## Developer Resources

- [API Documentation](${SITE_URL}/docs)
- [OpenAPI Specification](${SITE_URL}/openapi.json)
- [llms.txt](${SITE_URL}/llms.txt)

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [Privacy](${SITE_URL}/privacy)
`;

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Supply Chain Risk Monitor</title>
  <meta name="description" content="Privacy policy for Supply Chain Risk Monitor. Learn how we collect, use, and protect your data.">
  <link rel="canonical" href="${SITE_URL}/privacy">
  <meta property="og:title" content="Privacy Policy — Supply Chain Risk Monitor">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/privacy">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
    h1 { color: #8f9e7c; font-size: 2.2rem; margin-bottom: 0.5rem; } h2 { color: #a8b89c; margin-top: 2rem; }
    a { color: #60a5fa; text-decoration: none; } a:hover { text-decoration: underline; }
    nav { margin-bottom: 2rem; font-size: 0.9rem; } nav a { margin-right: 1.5rem; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.85rem; color: #888; }
    .last-updated { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <nav><a href="/">← Home</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/docs">API Docs</a></nav>
  <h1>Privacy Policy</h1>
  <p class="last-updated">Last updated: September 30, 2026</p>

  <p>Supply Chain Risk Monitor ("we", "our", "the platform") is committed to protecting the privacy of our users and API consumers. This privacy policy explains what data we collect, how we use it, and your rights regarding that data.</p>

  <h2>1. Data We Collect</h2>
  <p>Supply Chain Risk Monitor is primarily a news aggregation and analysis platform. We collect and process the following types of data:</p>
  <ul>
    <li><strong>Publicly available news articles:</strong> We aggregate headlines, URLs, publication dates, and article content from public RSS feeds and the NewsAPI service. This content is publicly available and is collected solely for the purpose of supply chain risk analysis.</li>
    <li><strong>Search queries:</strong> When you use the semantic search feature, your query text is processed to generate vector embeddings for similarity matching. Search queries are not stored permanently or linked to user identities.</li>
    <li><strong>Email addresses (digest subscribers only):</strong> If you subscribe to the daily digest email, we store your email address solely for the purpose of delivering the digest. We do not sell, share, or use email addresses for any other purpose.</li>
  </ul>

  <h2>2. Data We Do NOT Collect</h2>
  <ul>
    <li>We do not use cookies or tracking scripts on the frontend application.</li>
    <li>We do not collect personal identification information from dashboard visitors.</li>
    <li>We do not track individual user behavior, browsing patterns, or session data.</li>
    <li>We do not integrate with any third-party analytics or advertising platforms.</li>
  </ul>

  <h2>3. API Usage</h2>
  <p>Our public API does not require authentication for read-only endpoints. API requests may be logged for operational purposes (error debugging, rate limiting) but are not linked to individual users. API logs are retained for a maximum of 30 days and are automatically purged.</p>

  <h2>4. Data Storage &amp; Security</h2>
  <p>All data is stored in a PostgreSQL database hosted on Supabase with encryption at rest. The application backend runs on Render with HTTPS-only connections. The frontend is served through Vercel's global CDN with automatic SSL. We follow industry-standard security practices including parameterized queries, input validation, and principle of least privilege for database access.</p>

  <h2>5. Third-Party Services</h2>
  <p>We use the following third-party services in our infrastructure:</p>
  <ul>
    <li><strong>Supabase:</strong> PostgreSQL database hosting (EU/US regions)</li>
    <li><strong>Render:</strong> Backend application hosting</li>
    <li><strong>Vercel:</strong> Frontend hosting and CDN</li>
    <li><strong>NewsAPI:</strong> News article sourcing (public data only)</li>
    <li><strong>Google Fonts:</strong> Typography (subject to Google's privacy policy)</li>
  </ul>

  <h2>6. Your Rights</h2>
  <p>You have the right to request deletion of any personal data we may hold (limited to email addresses for digest subscribers). To exercise this right, contact us at <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a> with the subject line "Data Deletion Request".</p>

  <h2>7. Changes to This Policy</h2>
  <p>We may update this privacy policy from time to time. Changes will be reflected on this page with an updated "Last updated" date. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>

  <h2>8. Contact</h2>
  <p>For privacy-related inquiries, contact us at <a href="mailto:sathyarsk2027@gmail.com">sathyarsk2027@gmail.com</a>.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor. Built by Sathya — <a href="${SITE_URL}/">supply-chain-risk-analysis-po64.vercel.app</a></p>
  </footer>
</body>
</html>`;

const PRIVACY_MARKDOWN = `# Privacy Policy — Supply Chain Risk Monitor

Last updated: September 30, 2026

Supply Chain Risk Monitor is committed to protecting user privacy. We collect publicly available news articles for analysis, process search queries ephemerally, and store email addresses only for digest subscribers. We do not use cookies, tracking scripts, or third-party analytics. All data is stored encrypted on Supabase with HTTPS-only connections. Contact [sathyarsk2027@gmail.com](mailto:sathyarsk2027@gmail.com) for data deletion requests.

[Full privacy policy](${SITE_URL}/privacy)

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [Contact](${SITE_URL}/contact)
`;

// ---------------------------------------------------------------------------
// API Docs page (Fix #5)
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
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/docs">
  <meta property="og:image" content="${SITE_URL}/assets/containers_closed.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: Inter, system-ui, sans-serif; background: #0a0a0f; color: #e0e0e0; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.7; }
    h1 { color: #8f9e7c; font-size: 2.2rem; } h2 { color: #a8b89c; margin-top: 2.5rem; border-bottom: 1px solid #222; padding-bottom: 0.5rem; } h3 { color: #c8d8bc; }
    a { color: #60a5fa; text-decoration: none; } a:hover { text-decoration: underline; }
    nav { margin-bottom: 2rem; font-size: 0.9rem; } nav a { margin-right: 1.5rem; }
    footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #222; font-size: 0.85rem; color: #888; }
    code { font-family: 'JetBrains Mono', monospace; background: #1a1a25; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #111118; border: 1px solid #2a2a35; border-radius: 8px; padding: 1rem 1.5rem; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
    pre code { background: none; padding: 0; }
    .endpoint { background: #111118; border: 1px solid #2a2a35; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; margin-right: 0.5rem; }
    .method-get { background: #1a3a2a; color: #4ade80; } .method-post { background: #3a2a1a; color: #fbbf24; }
    .base-url { background: rgba(143, 158, 124, 0.15); border: 1px solid #2a2a35; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; } th, td { border: 1px solid #2a2a35; padding: 0.5rem 1rem; text-align: left; font-size: 0.9rem; } th { background: #111118; color: #8f9e7c; }
  </style>
</head>
<body>
  <nav><a href="/">← Home</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/docs">API Docs</a> <a href="/openapi.json">OpenAPI Spec</a></nav>
  <h1>API Documentation</h1>
  <p>Supply Chain Risk Monitor exposes a public REST API for programmatic access to supply chain disruption intelligence. No authentication is required for read-only endpoints.</p>

  <div class="base-url">Base URL: <strong>${SITE_URL}/api</strong></div>

  <p><strong>Machine-readable spec:</strong> <a href="/openapi.json">/openapi.json</a> (OpenAPI 3.1.0)</p>

  <h2>Articles</h2>

  <div class="endpoint">
    <h3><span class="method method-get">GET</span> <code>/api/articles</code></h3>
    <p>Returns all ingested supply chain news articles, ordered by publication date (newest first).</p>
    <pre><code>curl -s ${SITE_URL}/api/articles | head -c 500</code></pre>
  </div>

  <div class="endpoint">
    <h3><span class="method method-post">POST</span> <code>/api/articles/sync</code></h3>
    <p>Triggers a live synchronization of all configured RSS feeds and NewsAPI sources. Returns the count of newly ingested articles.</p>
    <pre><code>curl -X POST ${SITE_URL}/api/articles/sync</code></pre>
    <p><strong>Response:</strong></p>
    <pre><code>{"success": true, "newArticlesFetched": 12, "timestamp": "2026-09-30T17:30:00Z"}</code></pre>
  </div>

  <div class="endpoint">
    <h3><span class="method method-get">GET</span> <code>/api/articles/sources</code></h3>
    <p>Returns article count breakdown by news source.</p>
  </div>

  <h2>Semantic Search</h2>

  <div class="endpoint">
    <h3><span class="method method-post">POST</span> <code>/api/query</code></h3>
    <p>Performs semantic AI search using vector embeddings (pgvector cosine similarity). Returns ranked matches with relevance scores and an AI-generated summary.</p>
    <pre><code>curl -X POST ${SITE_URL}/api/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "port congestion in Southeast Asia"}'</code></pre>
    <table>
      <tr><th>Field</th><th>Type</th><th>Description</th></tr>
      <tr><td>query</td><td>string</td><td>Natural language search query (required, 1-500 chars)</td></tr>
    </table>
  </div>

  <h2>Country Risk</h2>

  <div class="endpoint">
    <h3><span class="method method-get">GET</span> <code>/api/countries/active</code></h3>
    <p>Lists countries with active disruption news coverage, including ISO codes and geo-coordinates for map visualization.</p>
  </div>

  <div class="endpoint">
    <h3><span class="method method-get">GET</span> <code>/api/countries/risk?query={country}</code></h3>
    <p>Computes a real-time risk score (0-100) for a country. Returns categorical breakdown (geopolitical, logistics, weather, market), risk drivers, and matched articles.</p>
    <pre><code>curl "${SITE_URL}/api/countries/risk?query=India"</code></pre>
  </div>

  <h2>Error Handling</h2>
  <p>All error responses return structured JSON with <code>error.code</code>, <code>error.message</code>, and <code>error.hint</code> fields:</p>
  <pre><code>{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Query string must not be empty",
    "hint": "Check the API documentation at /docs for valid request formats."
  }
}</code></pre>

  <h2>Rate Limits</h2>
  <p>The API is hosted on Render's free tier, which may incur cold start delays of 30-60 seconds after periods of inactivity. There are no hard rate limits, but excessive request volumes may trigger temporary throttling.</p>

  <footer>
    <p>&copy; 2026 Supply Chain Risk Monitor — <a href="${SITE_URL}/">Home</a> · <a href="/openapi.json">OpenAPI Spec</a> · <a href="/llms.txt">llms.txt</a></p>
  </footer>
</body>
</html>`;

const DOCS_MARKDOWN = `# Supply Chain Risk Monitor — API Documentation

Base URL: \`${SITE_URL}/api\`
OpenAPI Spec: [/openapi.json](${SITE_URL}/openapi.json)

## Endpoints

### GET /api/articles
List all supply chain news articles (newest first). No auth required.

### POST /api/articles/sync
Trigger RSS feed synchronization. Returns count of new articles.

### GET /api/articles/sources
Article count breakdown by news source.

### POST /api/query
Semantic AI search. Body: \`{"query": "port congestion in Southeast Asia"}\`

### GET /api/countries/active
Countries with active disruption coverage.

### GET /api/countries/risk?query={country}
Country risk score (0-100) with categorical breakdown.

## Error Format
\`\`\`json
{"error": {"code": "BAD_REQUEST", "message": "...", "hint": "..."}}
\`\`\`

---

[Home](${SITE_URL}/) · [About](${SITE_URL}/about) · [OpenAPI Spec](${SITE_URL}/openapi.json)
`;

// ---------------------------------------------------------------------------
// MCP Manifest (Fix #13)
// ---------------------------------------------------------------------------
const MCP_MANIFEST = JSON.stringify({
  name: 'supply-chain-risk-monitor',
  description: 'Supply Chain Risk Monitor — Real-time global supply chain disruption intelligence. Query articles, run semantic search, and get country-level risk scores.',
  version: '1.0.0',
  transport: {
    type: 'http',
    url: `${SITE_URL}/api`,
  },
  tools: [
    {
      name: 'listArticles',
      description: 'List all supply chain disruption news articles, ordered by publication date descending.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'semanticSearch',
      description: 'Search for supply chain disruption articles using natural language. Uses vector embeddings for semantic similarity.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query (e.g., "port congestion in Southeast Asia").' },
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
        },
        required: ['query'],
      },
    },
    {
      name: 'getActiveCountries',
      description: 'List all countries that currently have active supply chain disruption news coverage.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'syncArticles',
      description: 'Trigger a live synchronization of RSS feeds and NewsAPI to ingest new articles.',
      inputSchema: { type: 'object', properties: {}, required: [] },
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
  <style>body{font-family:Inter,system-ui,sans-serif;background:#0a0a0f;color:#e0e0e0;max-width:600px;margin:0 auto;padding:3rem;text-align:center;line-height:1.7}h1{color:#8f9e7c;font-size:3rem;margin-bottom:0}p{color:#aaa}a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}.links{margin-top:2rem;display:flex;flex-wrap:wrap;gap:1rem;justify-content:center}</style>
</head>
<body>
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p>The page <code>${pathname}</code> does not exist.</p>
  <div class="links">
    <a href="/">Home</a> <a href="/docs">API Docs</a> <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/openapi.json">OpenAPI</a> <a href="/llms.txt">llms.txt</a>
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

// Pages served by middleware (trust anchors + docs)
const KNOWN_PAGES = {
  '/about': { html: ABOUT_HTML, md: ABOUT_MARKDOWN },
  '/contact': { html: CONTACT_HTML, md: CONTACT_MARKDOWN },
  '/privacy': { html: PRIVACY_HTML, md: PRIVACY_MARKDOWN },
  '/docs': { html: DOCS_HTML, md: DOCS_MARKDOWN },
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

  // MCP manifest (Fix #13)
  if (pathname === '/.well-known/mcp' || pathname === '/.well-known/mcp.json') {
    return new Response(MCP_MANIFEST, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
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
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return; // Let Vercel serve index.html
  }

  // Known pages (about, contact, privacy, docs)
  const page = KNOWN_PAGES[pathname];
  if (page) {
    if (usesMarkdown) {
      return new Response(page.md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return new Response(page.html, {
      status: 200,
      headers: {
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
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // HTML 404 for browser requests to unknown non-SPA paths
  // (Don't intercept SPA routes — only trigger for paths that look intentionally wrong)
  return new Response(generate404Html(pathname), {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Vary': 'Accept',
      'Cache-Control': 'no-cache',
    },
  });
}
