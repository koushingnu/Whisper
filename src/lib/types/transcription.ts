import { AudioMetadata } from "./audio";

/**
 * 話者の種類
 */
export type SpeakerType = "staff" | "customer" | "unknown";

/**
 * 文字起こしセグメント
 */
export interface TranscriptionSegment {
  id: number; // セグメントID
  start: number; // 開始時間（秒）
  end: number; // 終了時間（秒）
  text: string; // 文字起こしテキスト
  speaker?: SpeakerType; // 話者（オプショナル）
  confidence?: number; // 信頼度（オプショナル）
}

/**
 * コスト情報
 */
export interface TranscriptionCosts {
  whisperCost: number; // Whisper APIのコスト
  gpt4Cost: number; // GPT-4のコスト
  totalCost: number; // 合計コスト
}

/**
 * 文字起こし結果
 */
export interface TranscriptionResult {
  text: string; // 生の文字起こしテキスト
  formatted: string; // 整形済みテキスト
  segments: TranscriptionSegment[]; // セグメント情報
  metadata: {
    processingTime: number; // 処理時間（ミリ秒）
    audioMetadata: AudioMetadata; // 音声メタデータ
    costs: TranscriptionCosts; // コスト情報
  };
}

/**
 * チャンク処理の進捗
 */
export interface ChunkProgress {
  total: number; // 全チャンク数
  completed: number; // 完了したチャンク数
  failed: number; // 失敗したチャンク数
  retrying: number; // リトライ中のチャンク数
}
