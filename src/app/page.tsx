"use client";

import React, { useState, useEffect } from "react";
import { FileUploader } from "./components/FileUploader";
import { ProgressBar } from "./components/ProgressBar";
import { TextEditor } from "./components/TextEditor";
import { TranscriptionStatus, TranscriptionResult } from "@/lib/types";
import GlossaryEditor from "./components/GlossaryEditor";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleFileSelect = async (file: File) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setIsProcessing(true);
    setTranscriptionStatus("transcribing");
    setProgress(0);
    setError(null);
    setCorrectionResult(null);
    setTranscriptionResult(null);

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
      setProgress(50);
      setTranscriptionStatus("correcting");

      // 文字起こし完了後、自動的に校正を実行
      try {
        const correctionResponse = await fetch("/api/chatgpt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: result.text }),
        });

        if (correctionResponse.ok) {
          const correctionResult = await correctionResponse.json();
          setCorrectionResult(correctionResult);
          // 校正結果を新しいtranscriptionResultとして設定
          setTranscriptionResult({
            text: correctionResult.correctedText,
            timestamps: result.timestamps,
          });
        } else {
          throw new Error("校正に失敗しました");
        }

        setTranscriptionStatus("completed");
        setProgress(100);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "校正中にエラーが発生しました";
        setError(errorMessage);
        console.error("校正処理中にエラーが発生しました:", error);
        setTranscriptionStatus("error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "文字起こし中にエラーが発生しました";
      setError(errorMessage);
      console.error("文字起こし中にエラーが発生しました:", error);
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
          isTranscriptionComplete={isTranscriptionComplete}
          onReset={handleReset}
        />

        {isProcessing && (
          <div className="space-y-2">
            <ProgressBar status={transcriptionStatus} progress={progress} />
            <p className="text-sm text-gray-600 text-center">
              {transcriptionStatus === "transcribing"
                ? "文字起こしを実行中..."
                : "校正を実行中..."}
            </p>
          </div>
        )}

        {transcriptionResult && (
          <div
            className={`space-y-4 ${isTranscriptionComplete ? "mt-2" : "mt-8"}`}
          >
            <div className="flex justify-end">
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>テキストをダウンロード</span>
              </button>
            </div>

            <TextEditor
              transcriptionResult={transcriptionResult}
              onSave={handleSave}
            />

            {correctionResult && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-6">
                <h2 className="text-lg font-semibold mb-4">校正内容</h2>

                {correctionResult.appliedRules && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">
                      適用された修正ルール
                    </h3>
                    <div className="pl-4 space-y-1 text-sm">
                      {correctionResult.appliedRules.split("\n").map(
                        (rule, index) =>
                          rule.trim() && (
                            <p key={index} className="text-gray-600">
                              • {rule.trim()}
                            </p>
                          )
                      )}
                    </div>
                  </div>
                )}

                {correctionResult.otherCorrections && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">
                      その他の修正点
                    </h3>
                    <div className="pl-4 space-y-1 text-sm">
                      {correctionResult.otherCorrections.split("\n").map(
                        (correction, index) =>
                          correction.trim() && (
                            <p key={index} className="text-gray-600">
                              • {correction.trim()}
                            </p>
                          )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <GlossaryEditor />
      </div>
    </main>
  );
}
