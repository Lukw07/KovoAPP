import { authMiddleware } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Routes that don't require auth
const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/upload/", "/api/cron/"];

// Routes requiring ADMIN or MANAGER role (management panel)
const MANAGEMENT_ROUTES = ["/admin"];

export default authMiddleware((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth?.user;
  const userRole = req.auth?.user?.role;

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Management routes — accessible to ADMIN and MANAGER only
  if (MANAGEMENT_ROUTES.some((route) => pathname.startsWith(route))) {
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
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
