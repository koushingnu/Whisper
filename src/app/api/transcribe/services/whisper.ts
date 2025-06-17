import OpenAI from "openai";
import { TranscriptionError } from "@/lib/utils/errors";
import { API_ENDPOINTS, PROCESSING_CONFIG } from "@/lib/utils/constants";
import { AudioChunk, WhisperResponse } from "@/lib/types";

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
    // FormDataを作成
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([chunk.blob], { type: chunk.type }),
      chunk.name
    );
    formData.append("model", "whisper-1");
    formData.append("language", "ja");
    formData.append("response_format", "verbose_json");

    // APIリクエスト
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new TranscriptionError(
        "API_ERROR",
        `Whisper API error: ${error.error?.message || "Unknown error"}`,
        error
      );
    }

    const data = await response.json();

    if (!data.text || !data.segments) {
      throw new TranscriptionError(
        "API_ERROR",
        "Invalid response from Whisper API"
      );
    }

    return {
      text: data.text,
      segments: data.segments.map((segment: any) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end,
      })),
      language: data.language || "ja",
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
    if (error instanceof TranscriptionError) {
      throw error;
    }

    // その他のエラー
    console.error("Whisper API error:", error);
    throw new TranscriptionError(
      "UNKNOWN_ERROR",
      "音声の文字起こしに失敗しました",
      error
    );
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
