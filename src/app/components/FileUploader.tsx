"use client";

import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { TranscriptionStatus } from "@/lib/types";
import {
  getAudioUploadUrl,
  uploadAudioToS3,
  isValidAudioFile,
  isValidFileSize,
} from "@/lib/utils/audio";
import { checkUsageLimit, recordUsage } from "@/lib/utils/usage";
import { useDailyUsage } from "@/lib/hooks/useDailyUsage";

interface FileUploaderProps {
  onTranscriptionComplete: (
    text: string,
    timestamps: { start: number; end: number }[],
    fileSize: number
  ) => void;
  onError: (error: string) => void;
  onAudioDurationChange: (duration: number) => void;
  isProcessing: boolean;
  progress: number;
  status: TranscriptionStatus;
  error: string | null;
}

export default function FileUploader({
  onTranscriptionComplete,
  onError,
  onAudioDurationChange,
  isProcessing,
  progress,
  status,
  error,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [correctionStartTime, setCorrectionStartTime] = useState<number | null>(
    null
  );
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const { refetch: refetchDailyUsage } = useDailyUsage();

  // 処理中の状態を統合
  const isProcessingState = isUploading || isProcessing;

  // 音声の長さが変更されたときにコールバックを呼び出す
  useEffect(() => {
    if (audioDuration > 0) {
      onAudioDurationChange(audioDuration);
    }
  }, [audioDuration, onAudioDurationChange]);

  // 進捗状態の計算と更新
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;

    const updateProgress = () => {
      let newProgress = 0;

      if (status === "completed") {
        newProgress = 100;
        setShowProgressBar(true);
      } else if (status === "error") {
        newProgress = progressPercentage;
      } else if (isUploading) {
        // ファイルアップロード中は0-20%
        newProgress = Math.min(20, progress);
        setShowProgressBar(true);
      } else if (status === "transcribing") {
        // 文字起こし中は20-60%
        newProgress = 20 + Math.min((progress / 100) * 40, 40);
        setShowProgressBar(true);
      } else if (status === "correcting") {
        setShowProgressBar(true);
        // 校正中は60-99%
        if (audioDuration === 0 || !correctionStartTime) {
          newProgress = 60;
        } else {
          // 進捗スピードを調整
          const baseSpeed = 10; // 1分あたりの秒数
          const expectedDuration = (audioDuration / 60) * baseSpeed;
          const elapsedTime = (Date.now() - correctionStartTime) / 1000;
          const calculatedProgress = (elapsedTime / expectedDuration) * 39; // 60-99%の範囲で計算
          newProgress = 60 + Math.min(calculatedProgress, 39);

          // 2秒ごとに進捗を更新（パフォーマンス改善）
          if (!progressInterval) {
            progressInterval = setInterval(() => {
              if (!correctionStartTime) return;
              const currentElapsedTime =
                (Date.now() - correctionStartTime) / 1000;
              const currentProgress =
                (currentElapsedTime / expectedDuration) * 39;
              const totalProgress = 60 + Math.min(currentProgress, 39);

              setProgressPercentage(Math.round(totalProgress));

              // 95%に達したら停止（余裕を持たせる）
              if (totalProgress >= 95) {
                if (progressInterval) {
                  clearInterval(progressInterval);
                }
              }
            }, 2000); // 更新間隔を2秒に延長
          }
        }
      } else {
        setShowProgressBar(false);
      }

      setProgressPercentage(Math.round(newProgress));
    };

    updateProgress();

    // クリーンアップ関数
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [
    status,
    progress,
    isUploading,
    audioDuration,
    correctionStartTime,
    progressPercentage,
  ]);

  const getElapsedTime = () => {
    if (!correctionStartTime) return 0;
    return Math.floor((Date.now() - correctionStartTime) / 1000);
  };

  const getProgressMessage = () => {
    if (error) return error;
    if (!isProcessingState)
      return "ファイルをドロップまたはクリックしてアップロード";
    if (uploadProgress) return uploadProgress;

    switch (status) {
      case "transcribing":
        return "文字起こしを実行中...";
      case "correcting":
        if (!correctionStartTime) return "校正を実行中...";
        return `校正を実行中... (${getElapsedTime()}秒)`;
      case "completed":
        return "処理が完了しました";
      default:
        return "処理中...";
    }
  };

  // 残り時間の計算
  const calculateRemainingTime = () => {
    if (status !== "correcting" || audioDuration === 0 || !correctionStartTime)
      return "";

    // 音声1分あたり10秒で校正時間を計算
    const baseSpeed = 10; // 1分あたりの秒数
    const expectedDuration = (audioDuration / 60) * baseSpeed;
    const elapsedTime = (Date.now() - correctionStartTime) / 1000;
    const remainingSeconds = Math.max(0, expectedDuration - elapsedTime);

    // 進捗率から残り時間を調整（95%以上なら「まもなく完了」と表示）
    if (progressPercentage >= 95) {
      return "まもなく完了";
    }

    // 10秒未満の場合は「まもなく完了」と表示
    if (remainingSeconds < 10) {
      return "まもなく完了";
    } else if (remainingSeconds < 60) {
      // 60秒未満は秒数のみ表示
      return `残り${Math.round(remainingSeconds)}秒`;
    } else {
      // 1分以上は分と秒を表示
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = Math.round(remainingSeconds % 60);
      return `残り${minutes}分${seconds}秒`;
    }
  };

  // 音声ファイルの長さを取得
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          audio.src = e.target.result as string;
          audio.onloadedmetadata = () => {
            resolve(audio.duration);
          };
        } else {
          resolve(0);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // ファイルの存在を確認する関数
  const checkFileExists = async (fileUrl: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/check-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      if (!response.ok) {
        throw new Error("ファイルの確認に失敗しました");
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("File check error:", error);
      return false;
    }
  };

  // アップロード完了を待つ関数
  const waitForUpload = async (
    fileUrl: string,
    maxAttempts = 10
  ): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
      setUploadProgress(`アップロード確認中... (${i + 1}/${maxAttempts})`);
      if (await checkFileExists(fileUrl)) {
        console.log("File existence confirmed");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 3秒待機
    }
    throw new Error("ファイルのアップロードを確認できませんでした");
  };

  const transcribe = async (
    fileUrl: string
  ): Promise<{
    text: string;
    timestamps: { start: number; end: number }[];
  }> => {
    setUploadProgress("文字起こしを開始します...");
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl }),
      });

      if (!response.ok) {
        throw new Error("文字起こしに失敗しました");
      }

      const result = await response.json();

      // 校正開始時刻を記録
      setCorrectionStartTime(Date.now());

      return {
        text: result.text,
        timestamps: result.timestamps || [],
      };
    } catch (error) {
      console.error("Transcription error:", error);
      throw error;
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    try {
      // 音声ファイルの長さを取得
      const duration = await getAudioDuration(selectedFile);
      setAudioDuration(duration);

      // 利用制限チェック
      const { canProceed, reason, estimatedCost } =
        await checkUsageLimit(duration);
      if (!canProceed) {
        onError(reason || "利用制限に達しました");
        return;
      }

      setIsUploading(true);
      setProgressPercentage(0);
      setUploadProgress("アップロードの準備中...");

      // 1. S3に直接アップロード
      setUploadProgress("ファイルをアップロード中...");
      const fileUrl = await uploadToS3(selectedFile);

      // アップロード完了を確認
      await waitForUpload(fileUrl);
      setProgressPercentage(20);

      // 2. 文字起こしを実行
      const { text, timestamps } = await transcribe(fileUrl);
      setProgressPercentage(60);

      // 3. 利用記録を保存
      await recordUsage({
        userId: "anonymous", // または適切なユーザーID
        audioDuration: Math.ceil(duration),
        whisperCost: estimatedCost.whisper,
        chatgptCost: estimatedCost.chatgpt,
      });

      // 4. 料金表示を更新
      await refetchDailyUsage();

      // 5. 完了コールバックを呼び出し
      onTranscriptionComplete(text, timestamps, selectedFile.size);
    } catch (error) {
      console.error("Processing error:", error);
      onError(
        error instanceof Error ? error.message : "処理中にエラーが発生しました"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    // ファイルの検証
    if (!isValidAudioFile(file)) {
      throw new Error("許可されていない音声ファイル形式です");
    }
    if (!isValidFileSize(file)) {
      throw new Error("ファイルサイズは25MB以下にしてください");
    }

    // 1. 署名付きURLを取得
    const { uploadUrl, fileUrl } = await getAudioUploadUrl(file);

    // 2. S3に直接アップロード
    await uploadAudioToS3(file, uploadUrl);

    // 3. アップロード直後に1回確認
    console.log("Verifying upload immediately...");
    if (await checkFileExists(fileUrl)) {
      console.log("File verified immediately after upload");
      return fileUrl;
    }

    // 4. 確認できなかった場合は待機処理へ
    return fileUrl;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac"],
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      setSelectedFile(acceptedFiles[0]);
    },
    disabled: isProcessingState,
    noClick: isProcessingState,
    noDrag: isProcessingState,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          isProcessingState
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
        }`}
      >
        <input {...getInputProps()} disabled={isProcessingState} />

        <div className="space-y-4">
          {isProcessingState ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center justify-center space-y-3">
                {status !== "completed" && (
                  <motion.svg
                    className="w-12 h-12 text-blue-500"
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </motion.svg>
                )}
                <div className="text-base font-medium text-gray-600">
                  {getProgressMessage()}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <svg
                className={`w-12 h-12 ${
                  isDragActive ? "text-blue-500" : "text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>

              <div className="flex flex-col space-y-1 text-sm">
                <span
                  className={`font-medium ${
                    isDragActive ? "text-blue-500" : "text-gray-500"
                  }`}
                >
                  {isDragActive
                    ? "ファイルをドロップしてください"
                    : selectedFile
                      ? selectedFile.name
                      : "クリックまたはドラッグ＆ドロップでファイルを選択"}
                </span>
                <span className="text-gray-400">
                  最大25MB（mp3, wav, m4a, ogg, webm, aac）
                </span>
              </div>
            </div>
          )}

          {selectedFile && !isProcessingState && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                handleProcessFile();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              文字起こしを開始
            </motion.button>
          )}
        </div>
      </div>

      {/* 進捗バーを別コンポーネントとして切り出し */}
      <AnimatePresence>
        {(showProgressBar || status === "completed") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-2"
          >
            {/* ステータスと進捗率の表示 */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-2">
                {status === "transcribing" && (
                  <svg
                    className="animate-spin h-4 w-4 text-blue-500"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {status === "correcting" && (
                  <svg
                    className="animate-spin h-4 w-4 text-indigo-500"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {status === "completed" && (
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                <span
                  className={`font-medium ${
                    status === "error"
                      ? "text-red-600"
                      : status === "completed"
                        ? "text-green-600"
                        : status === "transcribing"
                          ? "text-blue-600"
                          : status === "correcting"
                            ? "text-indigo-600"
                            : "text-gray-600"
                  }`}
                >
                  {getProgressMessage()}
                </span>
              </div>
              <span className="font-semibold text-gray-700">
                {progressPercentage}%
              </span>
            </div>

            {/* プログレスバー */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    {status === "transcribing"
                      ? "文字起こし"
                      : status === "correcting"
                        ? "校正"
                        : status === "completed"
                          ? "完了"
                          : "準備中"}
                  </span>
                </div>
                {status === "correcting" && (
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {calculateRemainingTime()}
                    </span>
                  </div>
                )}
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                  }}
                  className={`
                    shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center
                    ${
                      status === "error"
                        ? "bg-red-500"
                        : status === "completed"
                          ? "bg-green-500"
                          : status === "transcribing"
                            ? "bg-gradient-to-r from-blue-400 to-blue-500"
                            : "bg-gradient-to-r from-indigo-400 to-indigo-500"
                    }
                  `}
                >
                  {/* シャイニングエフェクトを削除してパフォーマンスを改善 */}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* エラーメッセージの表示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 bg-red-50 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
