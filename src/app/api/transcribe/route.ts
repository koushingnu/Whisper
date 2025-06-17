import { NextRequest } from "next/server";
import { TranscriptionError } from "@/lib/utils/errors";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/errors";
import { splitAudioIntoChunks, getAudioMetadata } from "./services/audio";
import {
  transcribeChunks,
  mergeTranscriptionResults,
} from "./services/whisper";
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

    console.log(
      "Processing file:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type
    );

    // 処理開始時刻を記録
    const startTime = Date.now();

    try {
      // ファイルをチャンクに分割
      console.log("Splitting audio into chunks...");
      const chunks = await splitAudioIntoChunks(file);
      console.log("Split into", chunks.length, "chunks");

      // Whisper APIで文字起こし
      console.log("Starting transcription...");
      const transcriptionResults = await transcribeChunks(chunks);
      console.log("Transcription completed");
      const result = mergeTranscriptionResults(transcriptionResults);

      // 処理終了時刻を記録
      const endTime = Date.now();

      // レスポンスを作成
      const transcriptionResult: TranscriptionResult = {
        ...result,
        startTime,
        endTime,
      };

      return Response.json(createSuccessResponse(transcriptionResult));
    } catch (processingError) {
      console.error("Processing error:", processingError);
      throw processingError;
    }
  } catch (error) {
    // エラーハンドリング
    console.error("API error:", error);

    if (error instanceof TranscriptionError) {
      return Response.json(
        createErrorResponse(error.code, error.message, error.details),
        { status: getStatusCode(error) }
      );
    }

    // 予期せぬエラー
    return Response.json(
      createErrorResponse(
        "UNKNOWN_ERROR",
        "音声ファイルの処理中にエラーが発生しました",
        error instanceof Error ? error.message : String(error)
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
