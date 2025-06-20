import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!process.env.APP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500 }
      );
    }

    if (password === process.env.APP_PASSWORD) {
      // セッションクッキーを設定
      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Set-Cookie": `auth=true; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`,
        },
      });

      return response;
    }

    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 401,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
