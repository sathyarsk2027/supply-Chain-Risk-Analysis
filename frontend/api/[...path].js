// Vercel Serverless API proxy — forwards /api/* and /api/v1/* requests to the backend
// and wraps errors in structured JSON (Fix #2: JSON error responses,
// Fix #3: Public API with reachable endpoints, Fix #2 (Round 3): Versioning & Deprecation,
// Fix #3 (Round 3): Standard RateLimit headers).

const BACKEND_URL = process.env.VITE_API_URL || 'https://supply-chain-risk-monitor-production.onrender.com';

const RATE_LIMIT_QUOTA = 100; // max requests per minute per IP
const RATE_WINDOW_MS = 60 * 1000;
const ipWindows = new Map();

/**
 * Tracks request count per client IP within a sliding 60-second window.
 */
function getRateLimitInfo(clientIp) {
  const now = Date.now();
  let entry = ipWindows.get(clientIp);

  // Periodically clean stale entries to prevent memory leak
  if (ipWindows.size > 1000) {
    for (const [key, value] of ipWindows.entries()) {
      if (now >= value.resetTime) {
        ipWindows.delete(key);
      }
    }
  }

  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_WINDOW_MS };
    ipWindows.set(clientIp, entry);
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_QUOTA - entry.count);
  const resetSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
  const resetTimestamp = Math.floor(entry.resetTime / 1000);

  return {
    limit: RATE_LIMIT_QUOTA,
    remaining,
    resetSeconds,
    resetTimestamp,
    policy: `${RATE_LIMIT_QUOTA};w=60`,
    isExceeded: entry.count > RATE_LIMIT_QUOTA,
  };
}

/**
 * Applies standard RFC RateLimit, legacy X-RateLimit, and API Versioning headers to response.
 */
function applyStandardHeaders(res, rl) {
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(rl.resetSeconds));
  res.setHeader('RateLimit-Policy', rl.policy);
  res.setHeader('X-RateLimit-Limit', String(rl.limit));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(rl.resetTimestamp));
  res.setHeader('API-Version', '1.0.0');
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('Deprecation', 'false');
  res.setHeader('Sunset', 'Fri, 31 Dec 2027 23:59:59 GMT');
  res.setHeader('Vary', 'Accept, X-API-Version');
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-API-Version, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('API-Version', '1.0.0');
    res.setHeader('X-API-Version', '1.0.0');
    return res.status(204).end();
  }

  // Get client identifier for rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
  const rl = getRateLimitInfo(clientIp);

  // Apply standard headers to all responses
  applyStandardHeaders(res, rl);

  // Check rate limit quota
  if (rl.isExceeded) {
    res.setHeader('Retry-After', String(rl.resetSeconds));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Standard quota is 100 requests per minute.',
        hint: `Slow down requests and inspect the RateLimit-Reset and Retry-After headers (${rl.resetSeconds}s remaining in window).`,
      },
    });
  }

  // Extract and normalize the API path from the request URL
  // Supports both /api/v1/... and /api/...
  let rawPath = req.url || '';
  
  // API Index / Discovery endpoints
  if (!rawPath || rawPath === '/api' || rawPath === '/api/' || rawPath === '/api/v1' || rawPath === '/api/v1/') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      name: 'Supply Chain Risk Monitor API',
      version: '1.0.0',
      active_version: 'v1',
      versioning_strategy: 'URL path (/api/v1/) and optional X-API-Version header',
      deprecation_policy: '6 months notice before retirement via RFC 8594 Sunset/Deprecation headers',
      documentation: 'https://supply-chain-risk-analysis-po64.vercel.app/docs',
      openapi: 'https://supply-chain-risk-analysis-po64.vercel.app/openapi.json',
      developer_portal: 'https://supply-chain-risk-analysis-po64.vercel.app/developers',
      sdk_documentation: 'https://supply-chain-risk-analysis-po64.vercel.app/sdk',
      rate_limits: {
        quota: '100 requests per minute per IP',
        policy: '100;w=60',
        headers: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Policy', 'Retry-After'],
      },
      endpoints: [
        { method: 'GET', path: '/api/v1/articles', description: 'List all supply chain news articles with filters' },
        { method: 'POST', path: '/api/v1/articles/sync', description: 'Trigger live RSS feed synchronization' },
        { method: 'GET', path: '/api/v1/articles/sources', description: 'Get article count by source' },
        { method: 'POST', path: '/api/v1/query', description: 'Semantic AI search across articles' },
        { method: 'GET', path: '/api/v1/countries/active', description: 'List countries with active coverage' },
        { method: 'GET', path: '/api/v1/countries/risk?query={country}', description: 'Country risk assessment' },
        { method: 'GET', path: '/api/v1/digest/ping', description: 'Health check' },
      ],
    });
  }

  // Normalize /api/v1/... to /api/... for backend proxying
  let backendPath = rawPath;
  if (backendPath.startsWith('/api/v1/')) {
    backendPath = '/api/' + backendPath.slice('/api/v1/'.length);
  } else if (backendPath.startsWith('/api/v1?')) {
    backendPath = '/api' + backendPath.slice('/api/v1'.length);
  }

  // Proxy the request to the backend
  const targetUrl = `${BACKEND_URL}${backendPath}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    // Forward request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const backendRes = await fetch(targetUrl, fetchOptions);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');

    // If backend returned an error, wrap it in structured JSON
    if (!backendRes.ok) {
      const statusCode = backendRes.status;
      let errorBody;
      try {
        errorBody = await backendRes.text();
      } catch {
        errorBody = '';
      }

      let code, message, hint;
      switch (statusCode) {
        case 400:
          code = 'BAD_REQUEST';
          message = errorBody || 'Invalid request parameters.';
          hint = 'Check the API documentation at /docs or /sdk for valid request formats.';
          break;
        case 404:
          code = 'NOT_FOUND';
          message = `The API endpoint ${rawPath} was not found.`;
          hint = 'Check available endpoints at /api/v1 or refer to the OpenAPI spec at /openapi.json.';
          break;
        case 429:
          code = 'RATE_LIMITED';
          message = 'Too many requests. Please slow down.';
          hint = 'Wait for the current rate limit window to reset (see RateLimit-Reset header).';
          res.setHeader('Retry-After', '60');
          break;
        case 503:
          code = 'SERVICE_UNAVAILABLE';
          message = 'The backend service is temporarily unavailable (may be waking up from cold start).';
          hint = 'Retry in 30-60 seconds. The Render free tier may need time to spin up.';
          break;
        default:
          code = 'INTERNAL_ERROR';
          message = `Backend returned HTTP ${statusCode}.`;
          hint = 'Check the API documentation at /docs or contact developer support.';
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(statusCode).json({ error: { code, message, hint } });
    }

    // Forward successful response
    const contentType = backendRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const body = await backendRes.text();
    return res.status(backendRes.status).send(body);

  } catch (err) {
    // Network error — backend unreachable
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({
      error: {
        code: 'BACKEND_UNREACHABLE',
        message: 'Could not connect to the backend API service.',
        hint: 'The backend may be starting up (Render free tier cold start). Retry in 30-60 seconds.',
      },
    });
  }
}
