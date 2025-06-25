"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  isAuthenticated: boolean;
  isTranscriptionComplete?: boolean;
  onReset?: () => void;
}

export function FileUploader({
  onFileSelect,
  isProcessing,
  isAuthenticated,
  isTranscriptionComplete = false,
  onReset,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
    }
  }, []);

  const handleStartTranscription = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/x-m4a": [".m4a"],
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024, // 25MB制限
    disabled: isProcessing || !isAuthenticated,
  });

  return (
    <AnimatePresence>
      {!isTranscriptionComplete && (
        <motion.div
          initial={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center
              transition-colors duration-200 ease-in-out
              ${
                !isAuthenticated
                  ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-50"
                  : isProcessing
                    ? "border-gray-300 bg-gray-100 cursor-not-allowed"
                    : isDragActive
                      ? "border-blue-500 bg-blue-50 cursor-pointer"
                      : selectedFile
                        ? "border-green-500 bg-green-50 cursor-pointer"
                        : "border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              {!isAuthenticated ? (
                <>
                  <div className="flex justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-12a9 9 0 110 18 9 9 0 010-18z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      ログインが必要です
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      文字起こしを開始するにはログインしてください
                    </p>
                  </div>
                </>
              ) : isProcessing ? (
                <>
                  <div className="flex justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      処理中...
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      処理が完了するまでお待ちください
                    </p>
                  </div>
                </>
              ) : selectedFile ? (
                <>
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-green-600">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      クリックまたはドラッグ＆ドロップで別のファイルを選択
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      音声ファイルをドラッグ＆ドロップ、またはクリックして選択
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      対応形式: .mp3, .wav, .m4a (最大25MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {selectedFile && !isProcessing && (
            <button
              onClick={handleStartTranscription}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              文字起こしを開始
            </button>
          )}
        </motion.div>
      )}
      {isTranscriptionComplete && onReset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <button
            onClick={onReset}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>新しい文字起こしを開始</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
