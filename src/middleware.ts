import { authMiddleware } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Routes that don't require auth
const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/upload/", "/api/cron/", "/manifest.json", "/firebase-messaging-sw.js"];

// Routes requiring ADMIN or MANAGER role (management panel)
const MANAGEMENT_ROUTES = ["/admin"];

// ============================================================================
// Security Headers — defense-in-depth against XSS, clickjacking, MIME sniffing
// ============================================================================

function addSecurityHeaders(response: NextResponse, req?: Request): NextResponse {
  // Strict Transport Security — enforce HTTPS for 2 years + subdomains
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  // Prevent MIME-type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking — only allow our own origin to frame
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // XSS protection fallback for older browsers
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy — don't leak full URL to external sites
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy — disable unused browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  // Content Security Policy — strict but functional
  // Dynamically allow WebSocket connections for Socket.IO on the same domain
  const host = req?.headers.get("host")?.split(":")[0] ?? "localhost";
  const socketConnectSrc = `https://${host}:* wss://${host}:* http://${host}:* ws://${host}:*`;

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.kovo.cz https://lh3.googleusercontent.com",
      "font-src 'self' data:",
      `connect-src 'self' ${socketConnectSrc} https://fcm.googleapis.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );

  // Prevent caching of sensitive pages
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  response.headers.set("Pragma", "no-cache");

  return response;
}

// ============================================================================
// Brute-force / Abuse detection at edge level
// NOTE: This runs in Edge Runtime where Redis (ioredis) is NOT available.
// For single-replica Docker/Coolify deployments, in-memory is sufficient here.
// The server-action rate limiters in rate-limit.ts use Redis for cross-instance
// consistency. If you scale to multiple edge workers, consider using a KV store
// like Vercel KV or Upstash Redis (which have Edge-compatible SDKs).
// ============================================================================

const edgeRateLimitMap = new Map<
  string,
  { count: number; resetAt: number; blocked: boolean }
>();
const EDGE_WINDOW_MS = 10_000; // 10 seconds
const EDGE_MAX_REQUESTS = 200; // 200 requests per 10s per IP
const BLOCK_DURATION_MS = 30_000; // Block for 30 seconds if exceeded

function getEdgeClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function checkEdgeRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = edgeRateLimitMap.get(ip);

  if (entry?.blocked && now < entry.resetAt) {
    return false; // Still blocked
  }

  if (!entry || now > entry.resetAt) {
    edgeRateLimitMap.set(ip, {
      count: 1,
      resetAt: now + EDGE_WINDOW_MS,
      blocked: false,
    });
    return true;
  }

  entry.count++;

  if (entry.count > EDGE_MAX_REQUESTS) {
    entry.blocked = true;
    entry.resetAt = now + BLOCK_DURATION_MS;
    return false;
  }

  return true;
}

// Periodic cleanup
if (typeof globalThis !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of edgeRateLimitMap) {
      if (now > entry.resetAt && !entry.blocked) {
        edgeRateLimitMap.delete(key);
      }
      if (entry.blocked && now > entry.resetAt) {
        edgeRateLimitMap.delete(key);
      }
    }
  }, 30_000);
  if (cleanup.unref) cleanup.unref();
}

// ============================================================================
// Main Middleware
// ============================================================================

export default authMiddleware((req) => {
  const { pathname } = req.nextUrl;

  // ── Edge-level rate limiting (DDoS / abuse protection) ───────────────
  // Skip rate limiting for auth endpoints (session checks must always work)
  const isAuthRoute = pathname.startsWith("/api/auth");
  const clientIp = getEdgeClientIp(req);
  if (!isAuthRoute && !checkEdgeRateLimit(clientIp)) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": "30",
        "Content-Type": "text/plain",
      },
    });
  }

  // ── Block suspicious request patterns ────────────────────────────────
  const suspiciousPathPatterns = [
    /\.\./, // Directory traversal
    /\x00/, // Null byte injection
    /%00/, // URL-encoded null byte
    /\/\/(\/)+/, // Multiple slashes
    /<script/i, // XSS in URL
    /\b(union|select|insert|drop|delete|update|exec)\b.*\b(from|into|table|database)\b/i, // SQL injection patterns
    /\/\.(env|git|svn|htaccess|htpasswd)/i, // Hidden files
    /\/(wp-admin|wp-login|xmlrpc|phpmyadmin)/i, // Common attack paths
    /\/\.(php|asp|aspx|jsp|cgi)$/i, // Unsupported server scripts
  ];

  if (suspiciousPathPatterns.some((pattern) => pattern.test(pathname))) {
    console.warn(
      `[SECURITY] Blocked suspicious request: ${pathname} from ${clientIp}`,
    );
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Allow public routes ──────────────────────────────────────────────
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, req);
  }

  const isLoggedIn = !!req.auth?.user;
  const userRole = req.auth?.user?.role;

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response, req);
  }

  // Management routes — accessible to ADMIN and MANAGER only
  if (MANAGEMENT_ROUTES.some((route) => pathname.startsWith(route))) {
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      const response = NextResponse.redirect(
        new URL("/dashboard", req.nextUrl.origin),
      );
      return addSecurityHeaders(response, req);
    }
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    const response = NextResponse.redirect(
      new URL("/dashboard", req.nextUrl.origin),
    );
    return addSecurityHeaders(response, req);
  }

  const response = NextResponse.next();

  // Add request ID for traceability
  response.headers.set("X-Request-Id", crypto.randomUUID());

  return addSecurityHeaders(response, req);
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
