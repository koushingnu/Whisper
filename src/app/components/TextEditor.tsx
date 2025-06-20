"use client";

import React, { useState, useEffect } from "react";
import { TranscriptionResult, Segment, DictionaryEntry } from "@/lib/types";

interface TextEditorProps {
  transcriptionResult: TranscriptionResult;
  onSave: (text: string) => void;
}

export function TextEditor({ transcriptionResult, onSave }: TextEditorProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showDictionaryForm, setShowDictionaryForm] = useState(false);
  const [dictionaryEntry, setDictionaryEntry] = useState<
    Partial<DictionaryEntry>
  >({
    incorrect: "",
    correct: "",
    category: "",
  });

  // セグメントをマージする関数
  const mergeSegments = (
    rawSegments: { start: number; end: number }[],
    text: string
  ) => {
    const newSegments: Segment[] = [];
    let currentText = "";
    let currentStart = 0;
    let lastEnd = 0;
    let textStartIndex = 0;

    // 文章を分割（。！？で区切る）
    const sentences = text.match(/[^。！？]+[。！？]?/g) || [text];
    let currentSentenceIndex = 0;

    for (let i = 0; i < rawSegments.length; i++) {
      const segment = rawSegments[i];

      // 現在の文を取得
      if (currentSentenceIndex < sentences.length) {
        const sentence = sentences[currentSentenceIndex].trim();

        // 新しいセグメントを開始する条件
        if (
          newSegments.length === 0 || // 最初のセグメント
          segment.start - lastEnd > 1.0 || // 時間が離れている
          currentText.length > 100 || // テキストが長くなりすぎている
          sentence.endsWith("。") || // 文末
          sentence.endsWith("！") ||
          sentence.endsWith("？")
        ) {
          if (currentText) {
            newSegments.push({
              text: currentText.trim(),
              start: currentStart,
              end: lastEnd,
            });
          }
          currentText = sentence;
          currentStart = segment.start;
        } else {
          currentText += sentence;
        }

        lastEnd = segment.end;
        currentSentenceIndex++;
      }
    }

    // 残りのテキストがあれば最後のセグメントとして追加
    if (currentText) {
      newSegments.push({
        text: currentText.trim(),
        start: currentStart,
        end: lastEnd,
      });
    }

    return newSegments;
  };

  // 文字起こし結果をセグメントに分割
  useEffect(() => {
    if (!transcriptionResult?.text) return;

    const mergedSegments = mergeSegments(
      transcriptionResult.timestamps,
      transcriptionResult.text
    );
    setSegments(mergedSegments);
  }, [transcriptionResult]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setDictionaryEntry((prev) => ({
        ...prev,
        incorrect: selection.toString().trim(),
      }));
      setShowDictionaryForm(true);
    }
  };

  const handleDictionarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dictionaryEntry),
      });

      if (!response.ok) throw new Error("辞書の登録に失敗しました");

      // フォームをリセット
      setDictionaryEntry({ incorrect: "", correct: "", category: "" });
      setShowDictionaryForm(false);

      // 成功メッセージを表示
      alert("辞書に登録しました");
    } catch (error) {
      console.error("Error:", error);
      alert("辞書の登録に失敗しました");
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleSave = () => {
    const text = segments.map((segment) => segment.text).join(" ");
    onSave(text);
  };

  return (
    <div className="space-y-4">
      <div
        className="w-full p-4 border rounded-lg bg-white"
        onMouseUp={handleTextSelection}
      >
        {segments.map((segment, index) => (
          <div
            key={index}
            className="mb-4 p-3 hover:bg-gray-50 border-b last:border-b-0 relative"
          >
            <div className="flex items-start gap-3">
              <span className="text-sm text-gray-500 whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                {formatTime(segment.start)} - {formatTime(segment.end)}
              </span>
              <span className="text-gray-900 flex-1 leading-relaxed">
                {segment.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showDictionaryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">辞書に登録</h3>
            <form onSubmit={handleDictionarySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  変換前のテキスト
                </label>
                <input
                  type="text"
                  value={dictionaryEntry.incorrect}
                  onChange={(e) =>
                    setDictionaryEntry((prev) => ({
                      ...prev,
                      incorrect: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  変換後のテキスト
                </label>
                <input
                  type="text"
                  value={dictionaryEntry.correct}
                  onChange={(e) =>
                    setDictionaryEntry((prev) => ({
                      ...prev,
                      correct: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  カテゴリー
                </label>
                <input
                  type="text"
                  value={dictionaryEntry.category}
                  onChange={(e) =>
                    setDictionaryEntry((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDictionaryForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
