import { NextRequest } from "next/server";
import { generatePresignedUrl } from "@/lib/utils/s3";

export async function POST(request: NextRequest) {
  try {
    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: "ファイル名とContent-Typeは必須です" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { uploadUrl, fileUrl } = await generatePresignedUrl(
      fileName,
      contentType
    );

    return new Response(JSON.stringify({ uploadUrl, fileUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({
        error: "署名付きURLの生成中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// OPTIONSリクエストのハンドラを追加
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
