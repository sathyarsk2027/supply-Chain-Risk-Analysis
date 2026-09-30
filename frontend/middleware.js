// Vercel Edge Middleware — handles content negotiation for text/markdown
// on the homepage and produces markdown 404 error bodies for missing paths.

const SITE_URL = 'https://supply-chain-risk-analysis-po64.vercel.app';

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

## Links

- [Homepage](${SITE_URL}/)
- [Sitemap](${SITE_URL}/sitemap.xml)
- [llms.txt](${SITE_URL}/llms.txt)

---

*Built for supply chain professionals, logistics analysts, and risk managers.*
`;

/**
 * Generates a markdown 404 error body for the given path.
 */
function generate404Markdown(pathname) {
  return `# 404 — Page Not Found

The page \`${pathname}\` does not exist on Supply Chain Risk Monitor.

## What you can do

- Visit the [homepage](${SITE_URL}/) for the main dashboard
- Check the [sitemap](${SITE_URL}/sitemap.xml) for all available pages
- Read [llms.txt](${SITE_URL}/llms.txt) for machine-readable site information

---

*Supply Chain Risk Monitor — Real-Time Global Disruption Intelligence*
`;
}

/**
 * Returns true if the Accept header prefers text/markdown.
 */
function prefersMarkdown(request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/markdown');
}

/**
 * Set of paths that should be served as static assets (not caught by middleware).
 */
const STATIC_EXTENSIONS = /\.(js|css|json|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|xml|txt)$/i;

export const config = {
  matcher: ['/((?!_next|api).*)'],
};

export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Don't intercept static asset requests
  if (STATIC_EXTENSIONS.test(pathname)) {
    return;
  }

  // Only handle text/markdown content negotiation
  if (!prefersMarkdown(request)) {
    return;
  }

  // Homepage markdown response
  if (pathname === '/' || pathname === '') {
    return new Response(HOMEPAGE_MARKDOWN, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // All other non-static paths: return markdown 404
  return new Response(generate404Markdown(pathname), {
    status: 404,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'Cache-Control': 'no-cache',
    },
  });
}
