"use client";

import React, { useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { ProgressBar } from "./components/ProgressBar";
import { TextEditor } from "./components/TextEditor";
import { TranscriptionStatus } from "@/lib/types";
import GlossaryEditor from "./components/GlossaryEditor";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<{
    text: string;
  } | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setTranscriptionStatus("transcribing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      setTranscriptionResult(result);
      setTranscriptionStatus("completed");
      setProgress(100);
    } catch (error) {
      console.error("Error:", error);
      setTranscriptionStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (text: string) => {
    try {
      const response = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Correction failed");
      }

      const result = await response.json();
      setTranscriptionResult(result);
    } catch (error) {
      console.error("Error:", error);
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

        {transcriptionStatus !== "idle" && (
          <ProgressBar status={transcriptionStatus} progress={progress} />
        )}

        {transcriptionResult && (
          <TextEditor
            transcriptionResult={transcriptionResult}
            onSave={handleSave}
          />
        )}
      </div>

      {/* 用語集セクション */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">用語集</h2>
        <GlossaryEditor />
      </div>
    </main>
  );
}
