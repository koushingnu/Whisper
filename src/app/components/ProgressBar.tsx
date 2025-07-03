"use client";

import { TranscriptionStatus } from "@/lib/types";
import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  status: TranscriptionStatus;
  error: string | null;
  fileSize?: number; // ファイルサイズを追加（バイト単位）
}

export function ProgressBar({
  progress,
  status,
  error,
  fileSize,
}: ProgressBarProps) {
  // ファイルサイズに基づいて進捗を調整
  const calculateAdjustedProgress = () => {
    if (!fileSize) return Math.min(progress, 99);

    // ファイルサイズに基づいて進捗を調整（最大25MB）
    const maxSize = 25 * 1024 * 1024;
    const sizeRatio = Math.min(fileSize / maxSize, 1);

    // 文字起こし中は0-75%、校正中は76-99%の範囲で進捗を表示（より早く進む）
    if (status === "transcribing") {
      return Math.min(progress * 0.75 * (1 + sizeRatio), 75);
    } else if (status === "correcting") {
      return Math.min(75 + progress * 0.24, 99);
    } else if (status === "completed") {
      return 100;
    }

    return Math.min(progress, 99);
  };

  const adjustedProgress = calculateAdjustedProgress();

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

  const getStatusIcon = () => {
    switch (status) {
      case "transcribing":
      case "correcting":
        return (
          <motion.svg
            className="h-5 w-5"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </motion.svg>
        );
      case "completed":
        return (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        );
      case "error":
        return (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </motion.svg>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
    >
      <div className="flex items-center space-x-3">
        <span
          className={`${
            status === "error"
              ? "text-red-600"
              : status === "completed"
                ? "text-green-600"
                : "text-blue-600"
          }`}
        >
          {getStatusIcon()}
        </span>
        <span className="font-medium text-gray-800">{getStatusText()}</span>
        <span className="ml-auto font-semibold text-gray-700">
          {Math.round(adjustedProgress)}%
        </span>
      </div>

      <div className="relative">
        <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${adjustedProgress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
              status === "error"
                ? "bg-red-500"
                : status === "completed"
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-blue-500 to-blue-600"
            }`}
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">{error}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
