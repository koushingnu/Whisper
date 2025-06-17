import { TranscriptionError } from "@/lib/utils/errors";
import { AUDIO_CONFIG } from "@/lib/utils/constants";
import { AudioChunk } from "@/lib/types";

/**
 * 音声ファイルをチャンクに分割
 */
export async function splitAudioIntoChunks(file: File): Promise<AudioChunk[]> {
  try {
    // ファイルサイズのバリデーション
    if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new TranscriptionError(
        "FILE_TOO_LARGE",
        undefined,
        AUDIO_CONFIG.MAX_FILE_SIZE_MB
      );
    }

    // ファイル形式のバリデーション
    if (!AUDIO_CONFIG.SUPPORTED_FORMATS.includes(file.type as any)) {
      throw new TranscriptionError("UNSUPPORTED_FORMAT");
    }

    // 現時点では分割せずに1つのチャンクとして処理
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    return [
      {
        blob,
        start: 0,
        end: file.size,
        size: file.size,
        type: file.type,
        name: file.name,
      },
    ];
  } catch (error) {
    console.error("Error splitting audio:", error);
    if (error instanceof TranscriptionError) {
      throw error;
    }
    throw new TranscriptionError(
      "UNKNOWN_ERROR",
      "音声ファイルの処理に失敗しました",
      error
    );
  }
}

/**
 * チャンクをBase64エンコード
 */
export async function encodeChunkToBase64(chunk: Blob): Promise<string> {
  try {
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  } catch (error) {
    throw new TranscriptionError(
      "UNKNOWN_ERROR",
      "Failed to encode chunk to base64",
      error
    );
  }
}

/**
 * ファイル拡張子を取得
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^/.]+$/);
  return match ? match[0] : "";
}

/**
 * 音声メタデータを取得
 */
export async function getAudioMetadata(file: File): Promise<{
  duration: number;
  sampleRate: number;
}> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: audio.duration,
        sampleRate: AUDIO_CONFIG.SAMPLE_RATE, // Web Audio APIの制限により、実際のサンプルレートは取得できない
      });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new TranscriptionError("UNKNOWN_ERROR", "Failed to get audio metadata")
      );
    };

    audio.src = url;
  });
}
