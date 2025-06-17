"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AUDIO_CONFIG } from "@/lib/utils/constants";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  isProcessing,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(
        `ファイルサイズが大きすぎます（上限: ${AUDIO_CONFIG.MAX_FILE_SIZE_MB}MB）`
      );
      return false;
    }

    if (!AUDIO_CONFIG.SUPPORTED_FORMATS.includes(file.type as any)) {
      alert("対応していないファイル形式です");
      return false;
    }

    return true;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleTranscribe = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(
      AUDIO_CONFIG.SUPPORTED_FORMATS.map((format) => [format, []])
    ),
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg">
      <div
        {...getRootProps()}
        className={`
          relative
          min-h-[200px]
          rounded-lg
          border-2
          border-dashed
          p-6
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTranscribe();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  文字起こしを開始
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg font-medium">
                {isDragActive
                  ? "ここにファイルをドロップ"
                  : "音声ファイルをドラッグ＆ドロップ"}
              </p>
              <p className="text-sm text-gray-500">
                または、クリックしてファイルを選択
              </p>
              <div className="text-xs text-gray-500">
                <p>対応形式: {AUDIO_CONFIG.SUPPORTED_FORMATS.join(", ")}</p>
                <p>最大サイズ: {AUDIO_CONFIG.MAX_FILE_SIZE_MB}MB</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
