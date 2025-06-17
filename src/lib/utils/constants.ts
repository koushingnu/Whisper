import { SupportedAudioFormat } from "../types";

/**
 * API エンドポイント
 */
export const API_ENDPOINTS = {
  WHISPER: "https://api.openai.com/v1/audio/transcriptions",
  GPT: "https://api.openai.com/v1/chat/completions",
} as const;

/**
 * 音声ファイルの設定
 */
export const AUDIO_CONFIG = {
  MAX_FILE_SIZE_MB: 100,
  CHUNK_SIZE_MB: 25,
  SUPPORTED_FORMATS: [
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/webm",
  ] as SupportedAudioFormat[],
  SAMPLE_RATE: 16000,
} as const;

/**
 * 処理の設定
 */
export const PROCESSING_CONFIG = {
  MAX_PARALLEL_CHUNKS: 3,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TIMEOUT_MS: 300000, // 5分
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 50,
    COOLDOWN_MS: 1200,
  },
} as const;

/**
 * コスト設定
 */
export const COSTS = {
  WHISPER: {
    BASE: 0.006, // USD/分
    MINIMUM_CHARGE: 0.006, // 最小課金単位（1分）
  },
  GPT4: {
    INPUT: 0.01, // USD/1Kトークン
    OUTPUT: 0.03, // USD/1Kトークン
    MINIMUM_TOKENS: 1000, // 最小トークン数
  },
} as const;

/**
 * コスト計算用の定数
 */
export const COST_CALCULATION = {
  JAPANESE_CHARS_PER_TOKEN: 0.5, // 日本語1文字あたりの平均トークン数
  AUDIO_MINUTES_PER_MB: 1, // 1MBあたりの音声時間（分）
  SAFETY_MARGIN: 1.1, // 安全マージン
} as const;

/**
 * エラーメッセージ
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (size: number) =>
    `ファイルサイズが大きすぎます（上限: ${size}MB）`,
  UNSUPPORTED_FORMAT: "対応していないファイル形式です",
  RATE_LIMIT:
    "リクエスト制限に達しました。しばらく待ってから再試行してください",
  TIMEOUT: "処理がタイムアウトしました",
  API_ERROR: "APIエラーが発生しました",
  VALIDATION_ERROR: "バリデーションエラーが発生しました",
  UNKNOWN_ERROR: "予期せぬエラーが発生しました",
} as const;

/**
 * UI関連の定数
 */
export const UI_CONFIG = {
  DROPZONE: {
    MIN_HEIGHT: "200px",
    BORDER_RADIUS: "8px",
    BORDER_COLOR: {
      DEFAULT: "rgb(203 213 225)",
      HOVER: "rgb(59 130 246)",
      DRAG: "rgb(59 130 246)",
    },
  },
  ANIMATION: {
    DURATION: "200ms",
    TIMING: "ease-in-out",
  },
  TOAST: {
    DURATION: 5000, // 5秒
  },
} as const;
