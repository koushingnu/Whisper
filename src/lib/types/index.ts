export interface DictionaryEntry {
  incorrect: string;
  correct: string;
}

export interface TranscriptionStatus {
  status:
    | "idle"
    | "uploading"
    | "transcribing"
    | "correcting"
    | "completed"
    | "error";
  progress: number;
  message: string;
}

export interface TranscriptionResult {
  originalText: string;
  correctedText: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
