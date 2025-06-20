import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // ログインページへのアクセスは常に許可
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  // APIルートへのアクセスは認証をチェック
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const authCookie = request.cookies.get("auth");
    if (!authCookie?.value) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.next();
  }

  // その他のページへのアクセスは認証をチェックしてリダイレクト
  const authCookie = request.cookies.get("auth");
  if (!authCookie?.value) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
