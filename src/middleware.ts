import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証が必要なパスかどうかをチェック
function isProtectedPath(pathname: string): boolean {
  // 認証が必要なパスのリスト
  const protectedPaths = [
    "/api/transcribe",
    "/api/chatgpt",
    "/api/dictionary",
    "/api/glossary",
  ];

  // APIパスのチェック
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    return true;
  }

  // ルートパスは認証必要
  if (pathname === "/") {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ログインページへのアクセスは常に許可
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // 保護されたパスのみ認証チェック
  if (isProtectedPath(pathname)) {
    const authCookie = request.cookies.get("auth");
    if (!authCookie?.value) {
      // APIルートの場合は401を返す
      if (pathname.startsWith("/api/")) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      // それ以外はログインページにリダイレクト
      const url = new URL("/login", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// ミドルウェアを適用するパスを設定
export const config = {
  matcher: [
    "/",
    "/login",
    "/api/transcribe/:path*",
    "/api/chatgpt/:path*",
    "/api/dictionary/:path*",
    "/api/glossary/:path*",
  ],
};
