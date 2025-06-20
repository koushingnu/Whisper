"use client";

import React, { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { ProgressBar } from "./components/ProgressBar";
import { TextEditor } from "./components/TextEditor";
import { TranscriptionStatus } from "@/lib/types";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>({
    status: "idle",
    progress: 0,
    message: "音声ファイルを選択してください",
  });
  const [correctedText, setCorrectedText] = useState("");
  const [timestamps, setTimestamps] = useState<
    { start: number; end: number }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalText, setOriginalText] = useState("");

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setStatus({
      status: "idle",
      progress: 0,
      message: "ファイルが選択されました",
    });
  };

  const handleTranscribe = async () => {
    if (!selectedFile || isProcessing) return;

    try {
      setIsProcessing(true);

      // アップロード開始
      setStatus({
        status: "uploading",
        progress: 20,
        message: "ファイルをアップロード中...",
      });

      const formData = new FormData();
      formData.append("file", selectedFile);

      // Whisper APIで文字起こし
      setStatus({
        status: "transcribing",
        progress: 40,
        message: "文字起こし中...",
      });

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error("文字起こしに失敗しました");
      }

      const transcribeData = await transcribeResponse.json();
      setOriginalText(transcribeData.text);
      setTimestamps(transcribeData.timestamps || []);

      // ChatGPTで校正
      setStatus({
        status: "correcting",
        progress: 70,
        message: "辞書を使用して校正中...",
      });

      const correctResponse = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: transcribeData.text,
        }),
      });

      if (!correctResponse.ok) {
        throw new Error("校正に失敗しました");
      }

      const correctedData = await correctResponse.json();
      setCorrectedText(correctedData.text);

      // 完了
      setStatus({
        status: "completed",
        progress: 100,
        message: "文字起こしと校正が完了しました",
      });
    } catch (error) {
      setStatus({
        status: "error",
        progress: 0,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">音声文字起こし＆校正アプリ</h1>

      <div className="space-y-8">
        <FileUploader
          onFileSelect={handleFileSelect}
          isProcessing={isProcessing}
        />

        {selectedFile && (
          <button
            onClick={handleTranscribe}
            className={`w-full py-2 text-white rounded-md transition-colors ${
              isProcessing
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? "処理中..." : "文字起こし開始"}
          </button>
        )}

        {status.status !== "idle" && <ProgressBar status={status} />}

        {status.status === "completed" && (
          <TextEditor
            correctedText={correctedText}
            timestamps={timestamps}
            onCorrectedTextChange={setCorrectedText}
          />
        )}
      </div>
    </main>
  );
}
