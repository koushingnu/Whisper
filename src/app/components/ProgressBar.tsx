"use client";

import { TranscriptionStatus } from "@/lib/types";

interface ProgressBarProps {
  progress: number;
  status: TranscriptionStatus;
  error: string | null;
}

export function ProgressBar({ progress, status, error }: ProgressBarProps) {
  const getStatusText = () => {
    switch (status) {
      case "transcribing":
        return "文字起こしを実行中...";
      case "correcting":
        return "校正を実行中...";
      case "completed":
        return "完了";
      case "error":
        return "エラーが発生しました";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            status === "error"
              ? "bg-red-600"
              : status === "completed"
                ? "bg-green-600"
                : "bg-blue-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">{getStatusText()}</span>
        <span className="text-gray-600">{progress}%</span>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
