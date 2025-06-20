import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("file") as Blob;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "ファイルが見つかりません" }),
        {
          status: 400,
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
      { status: 200 }
    );
  } catch (error) {
    console.error("Whisper API error:", error);
    return new Response(
      JSON.stringify({
        error: "文字起こし処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
