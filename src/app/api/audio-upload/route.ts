import { NextRequest } from "next/server";
import { generatePresignedUrl } from "@/lib/utils/s3";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { fileName, fileType } = data;

    if (!fileName || !fileType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ファイル名とファイルタイプは必須です",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 許可する音声ファイルタイプ
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/ogg",
      "audio/x-m4a",
      "audio/aac",
    ];

    if (!allowedTypes.includes(fileType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "許可されていないファイルタイプです",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { uploadUrl, fileUrl } = await generatePresignedUrl(
      fileName,
      fileType
    );

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        fileUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Audio upload URL generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
