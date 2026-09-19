/**
 * extras/plausible-counter-worker.js
 * Cloudflare Worker: Privacy-Preserving Visitor Counter Proxy for Plausible Analytics
 *
 * PURPOSE:
 * Proxies the Plausible Analytics Stats API to serve total visitor counts
 * without exposing your Plausible API key to the client browser.
 *
 * FEATURES:
 * - Keeps your PLAUSIBLE_API_KEY securely stored as a Cloudflare Worker secret
 * - Enforces CORS to allow requests only from your blog origins
 * - Edge-caches responses for 5 minutes (300 seconds) to minimize Plausible API usage
 * - Returns a clean JSON payload: { "total": 12345 }
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Install Wrangler CLI if you haven't already:
 *      npm install -g wrangler
 *
 * 2. Login to your Cloudflare account:
 *      wrangler login
 *
 * 3. Create a wrangler.toml file in this folder (or run in wrangler directory):
 *      name = "plausible-counter"
 *      main = "plausible-counter-worker.js"
 *      compatibility_date = "2024-01-01"
 *
 *      [vars]
 *      PLAUSIBLE_SITE_ID = "blog.luckylinux.dev"
 *      PLAUSIBLE_API_HOST = "https://plausible.luckylinux.dev" # or https://plausible.io
 *
 * 4. Add your Plausible API secret:
 *      wrangler secret put PLAUSIBLE_API_KEY
 *      (Paste your token when prompted)
 *
 * 5. Deploy the worker:
 *      wrangler deploy
 *
 * 6. Set your worker URL in `js/config.js`:
 *      counter: {
 *        provider: "worker",
 *        workerUrl: "https://plausible-counter.<your-subdomain>.workers.dev"
 *      }
 */

// Allowed origins for CORS (Add custom domain and github.io)
const ALLOWED_ORIGINS = [
  "https://blog.luckylinux.dev",
  "https://kali-the-hacker.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

function getCorsHeaders(requestOrigin) {
  const isAllowed = ALLOWED_ORIGINS.includes(requestOrigin) || (requestOrigin && requestOrigin.endsWith(".github.io"));
  const allowOrigin = isAllowed ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400"
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(origin);

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    // Check Cloudflare Edge Cache
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Return cached response with updated CORS headers for this request origin
      const newHeaders = new Headers(cachedResponse.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.set("X-Cache-Status", "HIT");
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: newHeaders
      });
    }

    // Verify required environment variables
    const siteId = env.PLAUSIBLE_SITE_ID || "blog.luckylinux.dev";
    const apiKey = env.PLAUSIBLE_API_KEY;
    const apiHost = env.PLAUSIBLE_API_HOST || "https://plausible.io";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "PLAUSIBLE_API_KEY is not configured in Worker secrets." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    try {
      // Query Plausible Aggregate Stats API for all-time visitors
      const plausibleEndpoint = `${apiHost}/api/v1/stats/aggregate?site_id=${encodeURIComponent(siteId)}&period=custom&date=2020-01-01,2030-12-31&metrics=visitors`;

      const response = await fetch(plausibleEndpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        return new Response(
          JSON.stringify({ error: `Plausible API responded with ${response.status}`, details: errText }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      const data = await response.json();
      const visitors = data?.results?.visitors?.value ?? 0;

      const payload = JSON.stringify({
        total: visitors,
        cached_at: new Date().toISOString()
      });

      const responseToCache = new Response(payload, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300", // Cache for 5 minutes
          "X-Cache-Status": "MISS",
          ...corsHeaders
        }
      });

      // Asynchronously store in Cloudflare Edge Cache
      ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

      return responseToCache;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Internal worker error fetching analytics", message: err.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
