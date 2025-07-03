"use client";

import React, { useState, useEffect } from "react";
import FileUploader from "./components/FileUploader";

import { TextEditor } from "./components/TextEditor";
import { TranscriptionStatus, TranscriptionResult } from "@/lib/types";
import GlossaryEditor from "./components/GlossaryEditor";
import { formatText } from "@/lib/utils/text";

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
    timestamps: { start: number; end: number }[],
    fileSize: number
  ) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setTranscriptionStatus("correcting");
    // ファイルサイズに基づいて進捗を計算
    // 25MBを100%として、現在のファイルサイズの割合を計算
    const baseProgress = Math.min((fileSize / (25 * 1024 * 1024)) * 100, 100);
    setProgress(Math.round(baseProgress * 0.5)); // 文字起こし完了時点で50%まで
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

  // ダウンロード処理を追加
  const handleDownload = () => {
    if (!transcriptionResult) return;

    // テキストを整形してダウンロード
    const formattedText = formatText(transcriptionResult.text);
    const blob = new Blob([formattedText], { type: "text/plain" });
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
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          音声文字起こし
        </h1>
        <p className="text-center text-gray-600 mb-12">
          AIを使って音声を自動で文字に起こし、校正まで行います
        </p>

        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {transcriptionStatus === "completed" ? (
              <div className="flex justify-between items-center">
                <button
                  onClick={handleReset}
                  className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 transition-colors duration-200"
                >
                  <svg
                    className="w-5 h-5"
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
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
                  <span>ダウンロード</span>
                </button>
              </div>
            ) : (
              <FileUploader
                onTranscriptionComplete={handleTranscriptionComplete}
                onError={handleError}
                isProcessing={
                  transcriptionStatus === "transcribing" ||
                  transcriptionStatus === "correcting"
                }
                progress={progress}
                status={transcriptionStatus}
                error={error}
              />
            )}
          </div>

          {transcriptionStatus === "completed" && transcriptionResult && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <TextEditor
                  initialText={transcriptionResult.text}
                  readOnly={["transcribing", "correcting"].includes(
                    transcriptionStatus
                  )}
                />
              </div>

              {correctionResult && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    校正情報
                  </h2>
                  {correctionResult.appliedRules && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-700">
                        適用されたルール
                      </h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                        {correctionResult.appliedRules}
                      </p>
                    </div>
                  )}
                  {correctionResult.otherCorrections && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-700">
                        その他の修正
                      </h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                        {correctionResult.otherCorrections}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isAuthenticated && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <GlossaryEditor />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
