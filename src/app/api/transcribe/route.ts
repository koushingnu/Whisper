import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("file") as Blob;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "ファイルが見つかりません" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ファイルサイズチェック
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: "ファイルサイズが大きすぎます",
          details: "ファイルサイズは25MB以下にしてください",
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // OpenAI APIにファイルを直接送信
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ja",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // レスポンスからタイムスタンプ情報を抽出
    const segments = response.segments || [];
    const timestamps = segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
    }));

    return new Response(
      JSON.stringify({
        text: response.text,
        timestamps: timestamps,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Whisper API error:", error);
    return new Response(
      JSON.stringify({
        error: "文字起こし処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
