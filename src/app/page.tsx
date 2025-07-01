"use client";

import React, { useState, useEffect } from "react";
import FileUploader from "./components/FileUploader";
import { ProgressBar } from "./components/ProgressBar";
import { TextEditor } from "./components/TextEditor";
import { TranscriptionStatus, TranscriptionResult } from "@/lib/types";
import GlossaryEditor from "./components/GlossaryEditor";

export default function Home() {
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);
  const [correctionResult, setCorrectionResult] = useState<{
    correctedText: string;
    appliedRules: string;
    otherCorrections: string;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 文字起こし完了状態を追加
  const isTranscriptionComplete =
    transcriptionStatus === "completed" && transcriptionResult !== null;

  // リセット処理を追加
  const handleReset = () => {
    setTranscriptionStatus("idle");
    setProgress(0);
    setTranscriptionResult(null);
    setCorrectionResult(null);
    setError(null);
  };

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

  const handleTranscriptionComplete = async (
    text: string,
    timestamps: { start: number; end: number }[]
  ) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setTranscriptionStatus("correcting");
    setProgress(50);
    setError(null);
    setCorrectionResult(null);

    // 校正を実行
    try {
      const correctionResponse = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!correctionResponse.ok) {
        if (correctionResponse.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("校正に失敗しました");
      }

      const correctionResult = await correctionResponse.json();
      setCorrectionResult(correctionResult);

      // 校正完了後にのみテキストを表示
      setTranscriptionResult({
        text: correctionResult.correctedText,
        timestamps,
      });

      setTranscriptionStatus("completed");
      setProgress(100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "校正中にエラーが発生しました";
      setError(errorMessage);
      console.error("校正処理中にエラーが発生しました:", error);
      setTranscriptionStatus("error");
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTranscriptionStatus("error");
    setProgress(0);
  };

  const handleSave = async (text: string) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setError(null);
    setTranscriptionStatus("correcting");

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
      setCorrectionResult(result);

      // 校正結果を新しいtranscriptionResultとして設定
      if (transcriptionResult && result.correctedText) {
        setTranscriptionResult({
          text: result.correctedText,
          timestamps: transcriptionResult.timestamps,
        });
      }

      setTranscriptionStatus("completed");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "校正中にエラーが発生しました";
      setError(errorMessage);
      console.error("校正中にエラーが発生しました:", error);
      setTranscriptionStatus("error");
    }
  };

  // ダウンロード処理を追加
  const handleDownload = () => {
    if (!transcriptionResult) return;

    const text = transcriptionResult.text;
    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">音声文字起こし</h1>

      <div className="space-y-8">
        <FileUploader
          onTranscriptionComplete={handleTranscriptionComplete}
          onError={handleError}
          isProcessing={
            transcriptionStatus === "processing" ||
            transcriptionStatus === "correcting"
          }
        />

        {transcriptionStatus !== "idle" && (
          <ProgressBar
            progress={progress}
            status={transcriptionStatus}
            error={error}
          />
        )}

        {transcriptionStatus === "completed" && transcriptionResult && (
          <div className="space-y-4">
            <TextEditor
              initialText={transcriptionResult.text}
              onSave={handleSave}
              readOnly={transcriptionStatus === "correcting"}
              timestamps={transcriptionResult.timestamps}
            />

            {correctionResult && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h2 className="text-lg font-semibold">校正情報</h2>
                {correctionResult.appliedRules && (
                  <div>
                    <h3 className="font-medium">適用されたルール：</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {correctionResult.appliedRules}
                    </p>
                  </div>
                )}
                {correctionResult.otherCorrections && (
                  <div>
                    <h3 className="font-medium">その他の修正：</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {correctionResult.otherCorrections}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={handleReset}
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
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

              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                ダウンロード
              </button>
            </div>
          </div>
        )}

        {isAuthenticated && <GlossaryEditor />}
      </div>
    </main>
  );
}
