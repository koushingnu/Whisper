"use client";

import { useMemo } from "react";
import { TranscriptionResult as TranscriptionResultType } from "@/lib/types";

interface TranscriptionResultProps {
  result: TranscriptionResultType;
  onDownload: () => void;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  result,
  onDownload,
}) => {
  return (
    <div className="space-y-6">
      <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg">
        <div className="flex justify-end">
          <button
            onClick={onDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ダウンロード
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg">
        <div className="space-y-6">
          {result.segments.map((segment, index) => (
            <div
              key={index}
              className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </span>
              </div>
              <p className="text-base leading-relaxed">{segment.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
