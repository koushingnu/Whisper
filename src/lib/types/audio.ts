/**
 * 音声メタデータ
 */
export interface AudioMetadata {
  duration: number; // 音声の長さ（秒）
  format: string; // ファイル形式
  channels: number; // チャンネル数
  sampleRate: number; // サンプルレート
  bitRate?: number; // ビットレート（オプショナル）
}

/**
 * 音声チャンク
 */
export interface AudioChunk {
  blob: Blob;
  start: number;
  end: number;
  size: number;
  type: string;
  name: string;
}

/**
 * サポートされている音声形式
 */
export type SupportedAudioFormat =
  | "audio/wav"
  | "audio/mp3"
  | "audio/mpeg"
  | "audio/m4a"
  | "audio/mp4"
  | "audio/x-m4a"
  | "audio/webm";

/**
 * Whisperレスポンス
 */
export interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

/**
 * Whisperセグメント
 */
export interface WhisperSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * 文字起こし結果
 */
export interface TranscriptionResult {
  text: string;
  segments: WhisperSegment[];
  language: string;
  startTime: number;
  endTime: number;
}
