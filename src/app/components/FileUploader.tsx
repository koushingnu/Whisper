"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export function FileUploader({
  onFileSelect,
  isProcessing,
}: {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/x-m4a": [".m4a"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center
        transition-colors duration-200 ease-in-out
        ${
          isProcessing
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
        {isProcessing ? (
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
              <p className="text-lg font-medium text-gray-700">処理中...</p>
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
                対応形式: .mp3, .wav, .m4a
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
