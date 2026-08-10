import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Routes that require authentication
const protectedRoutes = ["/profile", "/library", "/social", "/users"];
// Routes that redirect to profile if already logged in
const authRoutes = ["/login"];

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth);
  const pathname = request.nextUrl.pathname;

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
  ],
};
