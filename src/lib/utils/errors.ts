import { ErrorCode, APIResponse } from "../types";
import { ERROR_MESSAGES } from "./constants";

/**
 * 文字起こし処理用のカスタムエラークラス
 */
export class TranscriptionError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: unknown
  ) {
    super(message || getErrorMessage(code, details));
    this.name = "TranscriptionError";
  }
}

/**
 * エラーメッセージを取得
 */
export function getErrorMessage(code: ErrorCode, details?: unknown): string {
  const message = ERROR_MESSAGES[code];
  if (typeof message === "function" && details) {
    return message(details as number);
  }
  return message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * エラーレスポンスを作成
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: unknown
): APIResponse {
  return {
    success: false,
    error: {
      code,
      message: message || getErrorMessage(code, details),
      details,
    },
  };
}

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * エラーに応じたHTTPステータスコードを取得
 */
export function getStatusCode(error: unknown): number {
  if (error instanceof TranscriptionError) {
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
  return 500;
}

/**
 * エラーをログ出力
 */
export function logError(message: string, error: unknown): void {
  console.error(`[ERROR] ${message}`);

  if (error instanceof Error) {
    console.error(`Name: ${error.name}`);
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);

    if (error instanceof TranscriptionError) {
      console.error(`Code: ${error.code}`);
      if (error.details) {
        console.error(`Details: ${JSON.stringify(error.details, null, 2)}`);
      }
    }
  } else {
    console.error("Unknown error:", error);
  }
}
