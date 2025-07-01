"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAudioUploadUrl,
  uploadAudioToS3,
  isValidAudioFile,
  isValidFileSize,
} from "@/lib/utils/audio";
import { ProgressBar } from "./ProgressBar";

interface FileUploaderProps {
  onTranscriptionComplete: (
    text: string,
    timestamps: { start: number; end: number }[]
  ) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
}

export default function FileUploader({
  onTranscriptionComplete,
  onError,
  isProcessing,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 処理中の状態を統合
  const isProcessingState = isUploading || isProcessing;
  const getProgressMessage = () => {
    if (isProcessing) return "文字起こしと校正を実行中...";
    if (uploadProgress) return uploadProgress;
    return "処理中...";
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
    setUploadProgress("アップロードの準備中...");
    try {
      // 1. S3に直接アップロード
      setUploadProgress("ファイルをアップロード中...");
      const fileUrl = await uploadToS3(selectedFile);

      // アップロード完了を確認
      await waitForUpload(fileUrl);

      // 2. 文字起こし処理
      setUploadProgress("文字起こしを開始します...");
      const result = await transcribe(fileUrl);

      // 校正後のテキストのみを表示するため、ここでは何もしない
      // 校正処理は親コンポーネントで行われ、その結果のみが表示される
      onTranscriptionComplete(result.text, result.timestamps);
    } catch (error) {
      console.error("Error:", error);
      onError(error instanceof Error ? error.message : "エラーが発生しました");
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

  const handleCancel = () => {
    if (isProcessingState) return;
    setSelectedFile(null);
    setUploadProgress("");
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isProcessingState
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 cursor-pointer"
        }`}
      >
        <input {...getInputProps()} disabled={isProcessingState} />
        <AnimatePresence mode="wait">
          {isProcessingState ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-gray-600">{getProgressMessage()}</p>
              <div className="w-full max-w-md mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse"></div>
              </div>
            </motion.div>
          ) : selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-green-600">
                選択されたファイル: {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                クリックまたはドロップで選び直せます
              </p>
            </motion.div>
          ) : isDragActive ? (
            <motion.p
              key="drag"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-blue-500"
            >
              ここにファイルをドロップしてください
            </motion.p>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <p className="text-gray-600">
                クリックまたはドラッグ＆ドロップで
                <br />
                音声ファイルを選択してください
              </p>
              <p className="text-sm text-gray-500">
                対応形式: MP3, WAV, M4A, OGG, WebM, AAC
                <br />
                最大サイズ: 25MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedFile && !isProcessingState && (
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={handleProcessFile}
            disabled={!selectedFile || isProcessingState}
            className={`px-4 py-2 rounded-md text-white ${
              !selectedFile || isProcessingState
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            文字起こしを開始
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessingState}
            className={`px-4 py-2 rounded-md ${
              isProcessingState
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
