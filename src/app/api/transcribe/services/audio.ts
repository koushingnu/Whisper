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

    // チャンクサイズの計算（バイト単位）
    const chunkSize = AUDIO_CONFIG.CHUNK_SIZE_MB * 1024 * 1024;
    const chunks: AudioChunk[] = [];

    // ファイルをチャンクに分割
    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      chunks.push({
        blob: chunk,
        start,
        end,
        size: chunk.size,
        type: file.type,
        name: `${file.name.replace(/\.[^/.]+$/, "")}_chunk_${chunks.length + 1}${getFileExtension(file.name)}`,
      });
    }

    return chunks;
  } catch (error) {
    if (error instanceof TranscriptionError) {
      throw error;
    }
    throw new TranscriptionError("UNKNOWN_ERROR", undefined, error);
  }
}

/**
 * チャンクをBase64エンコード
 */
export async function encodeChunkToBase64(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => {
      reject(
        new TranscriptionError(
          "UNKNOWN_ERROR",
          "Failed to encode chunk to base64"
        )
      );
    };
    reader.readAsDataURL(chunk);
  });
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
