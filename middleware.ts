import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const isAuthenticated = Boolean(request.auth);
  const pathname = request.nextUrl.pathname;
  const isProfileRoute = pathname.startsWith("/profile");
  const isLoginRoute = pathname.startsWith("/login");

  if (isProfileRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isLoginRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/profile", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/login", "/profile/:path*"],
};
