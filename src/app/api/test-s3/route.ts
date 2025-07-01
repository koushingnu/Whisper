import { generatePresignedUrl } from "@/lib/utils/s3";

// APIルートのエクスポート設定を修正
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 環境変数の確認
    const envCheck = {
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    };

    console.log("Environment variables check:", envCheck);

    if (!process.env.S3_BUCKET_NAME) {
      throw new Error("S3_BUCKET_NAME is not set");
    }

    // テスト用の値
    const fileName = "test.txt";
    const contentType = "text/plain";

    const { uploadUrl, fileUrl } = await generatePresignedUrl(
      fileName,
      contentType
    );

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        fileUrl,
        envCheck,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // CORSヘッダーを追加
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      }
    );
  } catch (error) {
    console.error("S3 test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
