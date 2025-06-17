import OpenAI from "openai";
import { TranscriptionError } from "@/lib/utils/errors";
import { API_ENDPOINTS, PROCESSING_CONFIG } from "@/lib/utils/constants";
import { AudioChunk, WhisperResponse } from "@/lib/types";
import { encodeChunkToBase64 } from "./audio";

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Whisper APIで文字起こしを実行
 */
export async function transcribeWithWhisper(
  chunk: AudioChunk,
  retryCount = 0
): Promise<WhisperResponse> {
  try {
    // チャンクをBase64エンコード
    const base64Audio = await encodeChunkToBase64(chunk.blob);

    // APIリクエスト
    const response = await openai.audio.transcriptions.create({
      file: new File([chunk.blob], chunk.name, { type: chunk.type }),
      model: "whisper-1",
      language: "ja",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return {
      text: response.text,
      segments: response.segments.map((segment) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
        confidence: segment.confidence,
      })),
      language: response.language,
    };
  } catch (error: any) {
    // レート制限エラーの場合
    if (error?.status === 429) {
      if (retryCount < PROCESSING_CONFIG.MAX_RETRIES) {
        // 待機してリトライ
        await new Promise((resolve) =>
          setTimeout(resolve, PROCESSING_CONFIG.RETRY_DELAY_MS)
        );
        return transcribeWithWhisper(chunk, retryCount + 1);
      }
      throw new TranscriptionError("RATE_LIMIT");
    }

    // APIエラーの場合
    if (error?.status >= 400) {
      throw new TranscriptionError(
        "API_ERROR",
        `Whisper API error: ${error.message}`,
        error
      );
    }

    // その他のエラー
    throw new TranscriptionError("UNKNOWN_ERROR", undefined, error);
  }
}

/**
 * 複数チャンクを並行処理
 */
export async function transcribeChunks(
  chunks: AudioChunk[]
): Promise<WhisperResponse[]> {
  const results: WhisperResponse[] = [];
  const errors: Error[] = [];

  // チャンクを並行処理
  for (
    let i = 0;
    i < chunks.length;
    i += PROCESSING_CONFIG.MAX_PARALLEL_CHUNKS
  ) {
    const batch = chunks.slice(i, i + PROCESSING_CONFIG.MAX_PARALLEL_CHUNKS);
    const promises = batch.map((chunk) => transcribeWithWhisper(chunk));

    try {
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } catch (error) {
      errors.push(error as Error);
    }

    // エラーが発生した場合は処理を中断
    if (errors.length > 0) {
      throw errors[0];
    }

    // レート制限を考慮して待機
    if (i + PROCESSING_CONFIG.MAX_PARALLEL_CHUNKS < chunks.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, PROCESSING_CONFIG.RATE_LIMIT.COOLDOWN_MS)
      );
    }
  }

  return results;
}

/**
 * 文字起こし結果を結合
 */
export function mergeTranscriptionResults(
  results: WhisperResponse[]
): WhisperResponse {
  return {
    text: results.map((r) => r.text).join(" "),
    segments: results.flatMap((r) => r.segments),
    language: results[0]?.language || "ja",
  };
}
