import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 認証が不要なパスかどうかをチェック
function isPublicPath(pathname: string): boolean {
  // 認証が不要なパスのリスト
  const publicPaths = [
    "/login",
    "/api/auth/login", // ログインAPIは認証不要
    "/_next", // Next.jsの静的アセット
    "/favicon.ico",
  ];

  // パスのチェック
  return publicPaths.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 認証が不要なパスは常に許可
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // それ以外のすべてのパスで認証チェック
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

  return NextResponse.next();
}

// ミドルウェアを適用するパスを設定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
