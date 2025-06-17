"use client";

import { useState, useCallback } from "react";
import { AudioUploader } from "@/app/components/AudioUploader";
import { TranscriptionResult } from "@/app/components/TranscriptionResult";
import { TranscriptionResult as TranscriptionResultType } from "@/lib/types/audio";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResultType | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "文字起こしに失敗しました");
      }

      setResult(data.data);
    } catch (error) {
      console.error("Transcription error:", error);
      alert(
        error instanceof Error ? error.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">音声文字起こし</h1>
          <p className="text-muted-foreground">
            Whisper APIを使用した文字起こしサービス
          </p>
        </div>

        <div className="space-y-8">
          <AudioUploader
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
          />

          {result && !isProcessing && (
            <TranscriptionResult result={result} onDownload={handleDownload} />
          )}
        </div>
      </div>
    </main>
  );
}
