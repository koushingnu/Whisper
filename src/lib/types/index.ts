export interface DictionaryEntry {
  incorrect: string;
  correct: string;
}

export interface TranscriptionResult {
  text: string;
}

export type TranscriptionStatus =
  | "idle"
  | "transcribing"
  | "correcting"
  | "completed"
  | "error";

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}
