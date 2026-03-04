import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/authentication",
  "/clinic/select",
  "/clinic/unavailable",
]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/appointments",
  "/patients",
  "/doctors",
  "/employees",
  "/financials",
  "/support-tickets",
  "/clinic",
];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname.startsWith(prefix));

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (startsWithAny(pathname, PROTECTED_PREFIXES) && !token) {
    return NextResponse.redirect(new URL("/authentication", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
