"use client";

import { TranscriptionStatus } from "@/lib/types";

interface ProgressBarProps {
  status: TranscriptionStatus;
  progress: number;
}

export function ProgressBar({ status, progress }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-sm text-gray-600 text-center">
        {status === "transcribing" && "文字起こし中..."}
        {status === "correcting" && "校正中..."}
        {status === "completed" && "完了"}
      </div>
    </div>
  );
}
