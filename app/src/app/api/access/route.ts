import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessCodeConfigured, expectedAccessToken } from "@/lib/access";

export async function POST(req: NextRequest) {
  if (!accessCodeConfigured()) return NextResponse.json({ ok: true, open: true });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (!body.code || body.code !== process.env.ACCESS_CODE) {
    return NextResponse.json({ ok: false, error: "Incorrect access code" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, await expectedAccessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
