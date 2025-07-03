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

interface FileUploaderProps {
  onTranscriptionComplete: (
    text: string,
    timestamps: { start: number; end: number }[],
    fileSize: number
  ) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  progress: number;
  status: TranscriptionStatus;
}

export default function FileUploader({
  onTranscriptionComplete,
  onError,
  isProcessing,
  progress,
  status,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [correctionStartTime, setCorrectionStartTime] = useState<number>(0);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [showProgressBar, setShowProgressBar] = useState(false);

  // 処理中の状態を統合
  const isProcessingState = isUploading || isProcessing;

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
        // ファイルアップロード中は0-10%
        newProgress = Math.min(10, progress);
        setShowProgressBar(true);
      } else if (status === "transcribing") {
        // 文字起こし中は10-30%
        newProgress = 10 + Math.min((progress / 100) * 20, 20);
        setShowProgressBar(true);
      } else if (status === "correcting") {
        setShowProgressBar(true);
        // 校正中は30-99%
        if (audioDuration === 0) {
          newProgress = 30 + Math.min((progress / 100) * 69, 69);
        } else {
          // 進捗スピードを調整
          // 9分のファイルで1分40秒を基準に、より早く進むように調整
          const baseSpeed = 2.5; // 基準速度を上げる（元の1.67から2.5に）
          const expectedDuration = (audioDuration / 60) * (100 / 9) * baseSpeed;
          const elapsedTime = (Date.now() - correctionStartTime) / 1000;
          const calculatedProgress = (elapsedTime / expectedDuration) * 69;
          newProgress = 30 + Math.min(calculatedProgress, 69);

          // 1秒ごとに進捗を更新（より頻繁に更新）
          if (!progressInterval) {
            progressInterval = setInterval(() => {
              const currentElapsedTime =
                (Date.now() - correctionStartTime) / 1000;
              const currentProgress =
                (currentElapsedTime / expectedDuration) * 69;
              // 進捗の加速を追加
              const acceleratedProgress = currentProgress * 1.2; // 20%加速
              const totalProgress = 30 + Math.min(acceleratedProgress, 69);

              setProgressPercentage(Math.round(totalProgress));

              // 99%に達したら停止
              if (totalProgress >= 99) {
                if (progressInterval) {
                  clearInterval(progressInterval);
                }
              }
            }, 500); // 更新間隔を500msに短縮
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
  }, [status, progress, isUploading, audioDuration, correctionStartTime]);

  // 進捗メッセージの取得
  const getProgressMessage = () => {
    if (status === "completed") return "完了";
    if (status === "error") return "エラーが発生しました";
    if (isUploading) return uploadProgress || "アップロード中...";
    if (status === "transcribing") return "文字起こしを実行中...";
    if (status === "correcting") {
      const remainingTime = calculateRemainingTime();
      return `校正を実行中... (残り約${remainingTime})`;
    }
    return "処理中...";
  };

  // 残り時間の計算
  const calculateRemainingTime = () => {
    if (status !== "correcting" || audioDuration === 0) return "";

    const expectedDuration = (audioDuration / 60) * (100 / 9) * 1.67;
    const elapsedTime = (Date.now() - correctionStartTime) / 1000;
    const remainingSeconds = Math.max(0, expectedDuration - elapsedTime);

    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)}秒`;
    } else {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = Math.round(remainingSeconds % 60);
      return `${minutes}分${seconds}秒`;
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

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgressPercentage(0);
    setUploadProgress("アップロードの準備中...");

    try {
      // 音声ファイルの長さを取得
      const duration = await getAudioDuration(selectedFile);
      setAudioDuration(duration);

      // 1. S3に直接アップロード
      setUploadProgress("ファイルをアップロード中...");
      const fileUrl = await uploadToS3(selectedFile);

      // アップロード完了を確認
      await waitForUpload(fileUrl);
      setProgressPercentage(10);

      // 2. 文字起こし処理
      setUploadProgress("文字起こしを開始します...");
      try {
        const result = await transcribe(fileUrl);
        setProgressPercentage(30);

        // 校正開始時刻を記録
        setCorrectionStartTime(Date.now());

        onTranscriptionComplete(
          result.text,
          result.timestamps,
          selectedFile.size
        );
      } catch (error) {
        // エラーメッセージを適切に処理
        const errorMessage =
          error instanceof Error ? error.message : "エラーが発生しました";
        onError(errorMessage);
        throw error; // エラーを再スローしてfinally句を実行
      }
    } catch (error) {
      console.error("Error:", error);
      // エラーメッセージを適切に処理
      const errorMessage =
        error instanceof Error ? error.message : "エラーが発生しました";
      onError(errorMessage);
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

  const transcribe = async (fileUrl: string) => {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      // エラーメッセージを適切に処理
      if (response.status === 429) {
        throw new Error(
          error.error ||
            "APIの利用制限に達しました。しばらく時間をおいて再度お試しください。"
        );
      }
      throw new Error(error.error || "文字起こしに失敗しました");
    }

    return response.json();
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
            className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${
                status === "error"
                  ? "bg-red-500"
                  : status === "completed"
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-blue-500 to-blue-600"
              }`}
            />
            <div className="text-sm font-medium text-gray-500 mt-1 text-center">
              {progressPercentage}%
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
