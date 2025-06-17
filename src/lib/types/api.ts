/**
 * エラーコード
 */
export type ErrorCode =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT"
  | "API_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  retryCount?: number;
}

/**
 * APIレスポンス
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

/**
 * 処理ステージ
 */
export type ProcessingStage =
  | "INITIALIZATION"
  | "WHISPER"
  | "GPT"
  | "POST_PROCESSING";

/**
 * 処理ステータス
 */
export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number;
  startTime: number;
  currentChunk?: number;
  totalChunks?: number;
  error?: ErrorResponse;
}
