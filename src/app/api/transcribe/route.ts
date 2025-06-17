import { NextRequest } from "next/server";
import { TranscriptionError } from "@/lib/utils/errors";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/errors";
import { PROCESSING_CONFIG, COSTS } from "@/lib/utils/constants";
import { splitAudioIntoChunks, getAudioMetadata } from "./services/audio";
import {
  transcribeChunks,
  mergeTranscriptionResults,
} from "./services/whisper";
import { formatTranscription } from "./services/gpt";
import { TranscriptionResult } from "@/lib/types/audio";

// Route Handlerの設定
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * 文字起こしAPIのエンドポイント
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストのバリデーション
    if (!request.body) {
      throw new TranscriptionError("VALIDATION_ERROR", "No request body");
    }

    // ファイルの取得
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      throw new TranscriptionError("VALIDATION_ERROR", "No file uploaded");
    }

    // 処理開始時刻を記録
    const startTime = Date.now();

    // 音声メタデータを取得
    const metadata = await getAudioMetadata(file);

    // ファイルをチャンクに分割
    const chunks = await splitAudioIntoChunks(file);

    // Whisper APIで文字起こし
    const transcriptionResults = await transcribeChunks(chunks);
    const mergedResult = mergeTranscriptionResults(transcriptionResults);

    // GPT-4でテキストを整形
    const formattedResult = await formatTranscription(mergedResult);

    // 処理終了時刻を記録
    const endTime = Date.now();

    // コストを計算
    const whisperCost = (metadata.duration / 60) * COSTS.WHISPER.BASE;
    const gptCost = (formattedResult.text.length / 1000) * COSTS.GPT4.INPUT;

    // レスポンスを作成
    const result: TranscriptionResult = {
      ...formattedResult,
      startTime,
      endTime,
      costs: {
        whisper: whisperCost,
        gpt: gptCost,
      },
    };

    return Response.json(createSuccessResponse(result));
  } catch (error) {
    // エラーハンドリング
    if (error instanceof TranscriptionError) {
      return Response.json(
        createErrorResponse(error.code, error.message, error.details),
        { status: getStatusCode(error) }
      );
    }

    // 予期せぬエラー
    console.error("Unexpected error:", error);
    return Response.json(
      createErrorResponse(
        "UNKNOWN_ERROR",
        "An unexpected error occurred",
        error
      ),
      { status: 500 }
    );
  }
}

/**
 * エラーに応じたHTTPステータスコードを取得
 */
function getStatusCode(error: TranscriptionError): number {
  switch (error.code) {
    case "VALIDATION_ERROR":
    case "FILE_TOO_LARGE":
    case "UNSUPPORTED_FORMAT":
      return 400;
    case "RATE_LIMIT":
      return 429;
    case "API_ERROR":
      return 502;
    default:
      return 500;
  }
}

// オプション設定
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5分
