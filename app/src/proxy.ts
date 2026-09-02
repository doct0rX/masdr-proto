import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessCodeConfigured, expectedAccessToken } from "@/lib/access";

const OPEN_PREFIXES = ["/access", "/api/access", "/api/health", "/_next", "/favicon", "/brand"];

export async function proxy(request: NextRequest) {
  if (!accessCodeConfigured()) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (OPEN_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (token && token === (await expectedAccessToken())) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Access code required" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|brand/|examples/).*)"],
};
