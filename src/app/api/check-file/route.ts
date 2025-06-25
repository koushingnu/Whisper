import { NextRequest } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();
    console.log("Checking file existence for:", fileUrl);

    const url = new URL(fileUrl);
    const bucket = process.env.S3_BUCKET_NAME!;

    // URLパスから先頭のスラッシュを除去
    const pathname = url.pathname.slice(1);

    // パーセントエンコードされた文字列をそのまま使用
    // %がさらにエンコードされている場合（%25）は元の%に戻す
    const key = pathname.replace(/%25/g, "%");

    console.log("S3 params:", { bucket, key });

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const result = await s3Client.send(command);
      console.log("S3 HeadObject result:", result);

      return new Response(JSON.stringify({ exists: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.log("S3 HeadObject error:", error);
      if (
        (error as any).name === "NotFound" ||
        (error as any).name === "UnknownError"
      ) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error checking file existence:", error);
    return new Response(
      JSON.stringify({
        error: "ファイルの確認中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

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
