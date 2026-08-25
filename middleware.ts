import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Routes that require authentication
const protectedRoutes = ["/profile", "/library", "/social", "/users"];
// Routes that redirect to profile if already logged in
const authRoutes = ["/login"];

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth);
  const pathname = request.nextUrl.pathname;

  // 1. Rate Limiting for API routes
  if (pathname.startsWith("/api")) {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip, isAuthenticated, {
      windowMs: 60 * 1000,
      guestMax: 50, // 50 requests per minute for guests
      authMax: 200, // 200 requests per minute for logged-in users
    });

    if (!rateLimit.success) {
      const retryAfter = Math.max(1, rateLimit.reset - Math.ceil(Date.now() / 1000));
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.reset),
          },
        }
      );
    }
  }

  // 2. Page Protections
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/profile", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/profile",
    "/profile/:path*",
    "/library",
    "/library/:path*",
    "/social",
    "/social/:path*",
    "/users",
    "/users/:path*",
    "/api/:path*",
  ],
};
