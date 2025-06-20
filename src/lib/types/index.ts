export interface DictionaryEntry {
  id?: number;
  incorrect: string;
  correct: string;
  category?: string;
  created_at?: string;
}

export interface TranscriptionResult {
  text: string;
  timestamps: {
    start: number;
    end: number;
  }[];
}

export interface Segment {
  text: string;
  start: number;
  end: number;
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
