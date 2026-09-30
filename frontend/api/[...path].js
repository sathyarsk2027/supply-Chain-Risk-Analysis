// Vercel Serverless API proxy — forwards /api/* requests to the backend
// and wraps errors in structured JSON (Fix #2: JSON error responses,
// Fix #3: Public API with reachable endpoints).

const BACKEND_URL = process.env.VITE_API_URL || 'https://supply-chain-risk-monitor-production.onrender.com';

/**
 * Produces a structured JSON error response compatible with LLM function-calling.
 */
function jsonError(statusCode, code, message, hint) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Vary': 'Accept',
    },
    body: JSON.stringify({
      error: { code, message, hint },
    }),
  };
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Extract the API path from the request URL
  // req.url will be something like /api/articles or /api/countries/risk?query=India
  const apiPath = req.url;

  if (!apiPath || apiPath === '/api' || apiPath === '/api/') {
    // Return API index with link to docs
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      name: 'Supply Chain Risk Monitor API',
      version: '1.0.0',
      documentation: 'https://supply-chain-risk-analysis-po64.vercel.app/docs',
      openapi: 'https://supply-chain-risk-analysis-po64.vercel.app/openapi.json',
      endpoints: [
        { method: 'GET', path: '/api/articles', description: 'List all supply chain news articles' },
        { method: 'POST', path: '/api/articles/sync', description: 'Trigger live RSS feed synchronization' },
        { method: 'GET', path: '/api/articles/sources', description: 'Get article count by source' },
        { method: 'POST', path: '/api/query', description: 'Semantic AI search across articles' },
        { method: 'GET', path: '/api/countries/active', description: 'List countries with active coverage' },
        { method: 'GET', path: '/api/countries/risk?query={country}', description: 'Country risk assessment' },
        { method: 'GET', path: '/api/digest/ping', description: 'Health check' },
      ],
    });
  }

  // Proxy the request to the backend
  const targetUrl = `${BACKEND_URL}${apiPath}`;

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

    // Set CORS and content headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Vary', 'Accept');

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
          hint = 'Check the API documentation at /docs for valid request formats.';
          break;
        case 404:
          code = 'NOT_FOUND';
          message = `The API endpoint ${apiPath} was not found.`;
          hint = 'Check available endpoints at /api or refer to the OpenAPI spec at /openapi.json.';
          break;
        case 429:
          code = 'RATE_LIMITED';
          message = 'Too many requests. Please slow down.';
          hint = 'Wait a few seconds before retrying.';
          break;
        case 503:
          code = 'SERVICE_UNAVAILABLE';
          message = 'The backend service is temporarily unavailable (may be waking up from cold start).';
          hint = 'Retry in 30-60 seconds. The Render free tier may need time to spin up.';
          break;
        default:
          code = 'INTERNAL_ERROR';
          message = `Backend returned HTTP ${statusCode}.`;
          hint = 'Check the API documentation at /docs or contact the API maintainer.';
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
