"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AudioUploader } from "@/app/components/AudioUploader";
import { TranscriptionProgress } from "@/app/components/TranscriptionProgress";
import { TranscriptionResult } from "@/app/components/TranscriptionResult";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ProcessingStatus } from "@/lib/types/api";
import { TranscriptionResult as TranscriptionResultType } from "@/lib/types/audio";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [result, setResult] = useState<TranscriptionResultType | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setStatus({
        stage: "INITIALIZATION",
        progress: 0,
        startTime: Date.now(),
      });

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
      toast({
        title: "文字起こし完了",
        description: "文字起こしが正常に完了しました。",
      });
    } catch (error) {
      console.error("Transcription error:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description:
          error instanceof Error
            ? error.message
            : "予期せぬエラーが発生しました",
      });
    } finally {
      setIsProcessing(false);
      setStatus(null);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsProcessing(false);
    setStatus(null);
    toast({
      description: "処理をキャンセルしました",
    });
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
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">音声文字起こし</h1>
          <p className="text-muted-foreground">
            Whisper APIとGPT-4を使用した高精度な文字起こしサービス
          </p>
        </motion.div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* アップローダー */}
          <AudioUploader
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
          />

          {/* 進捗表示 */}
          {status && (
            <TranscriptionProgress status={status} onCancel={handleCancel} />
          )}

          {/* 結果表示 */}
          {result && !isProcessing && (
            <TranscriptionResult result={result} onDownload={handleDownload} />
          )}
        </div>
      </div>

      {/* トースト */}
      <Toaster />
    </main>
  );
}
