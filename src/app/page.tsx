"use client";

import React, { useState, useEffect } from "react";
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/glossary");
        setIsAuthenticated(response.ok);
      } catch (error) {
        setIsAuthenticated(false);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "認証の確認中にエラーが発生しました";
        setError(errorMessage);
      }
    };
    checkAuth();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setIsProcessing(true);
    setTranscriptionStatus("transcribing");
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("文字起こしに失敗しました");
      }

      const result = await response.json();
      setTranscriptionResult(result);
      setTranscriptionStatus("completed");
      setProgress(100);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "文字起こし中にエラーが発生しました";
      setError(errorMessage);
      setTranscriptionStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (text: string) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setError(null);

    try {
      const response = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("校正に失敗しました");
      }

      const result = await response.json();
      setTranscriptionResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "校正中にエラーが発生しました";
      setError(errorMessage);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">音声文字起こし＆校正アプリ</h1>

      <div className="space-y-8">
        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800">
              文字起こしを開始するには
              <a
                href="/login"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ログイン
              </a>
              が必要です
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <FileUploader
          onFileSelect={handleFileSelect}
          isProcessing={isProcessing}
          isAuthenticated={isAuthenticated}
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
