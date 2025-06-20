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

    for (let i = 0; i < rawSegments.length; i++) {
      const segment = rawSegments[i];

      // 現在のセグメントのテキストを取得
      let segmentText = "";
      if (i < rawSegments.length - 1) {
        const nextSegmentStart = text.indexOf(" ", textStartIndex);
        segmentText = text.slice(
          textStartIndex,
          nextSegmentStart > -1 ? nextSegmentStart : undefined
        );
        textStartIndex =
          nextSegmentStart > -1 ? nextSegmentStart + 1 : text.length;
      } else {
        segmentText = text.slice(textStartIndex);
      }

      // 最初のセグメントまたは時間が離れている場合は新しいセグメントを開始
      if (newSegments.length === 0 || segment.start - lastEnd > 1.0) {
        if (currentText) {
          newSegments.push({
            text: currentText.trim(),
            start: currentStart,
            end: lastEnd,
          });
        }
        currentText = segmentText;
        currentStart = segment.start;
      } else {
        currentText += " " + segmentText;
      }
      lastEnd = segment.end;

      // 文の区切りに達した場合はセグメントを確定
      if (
        currentText.includes("。") ||
        currentText.includes("！") ||
        currentText.includes("？")
      ) {
        newSegments.push({
          text: currentText.trim(),
          start: currentStart,
          end: lastEnd,
        });
        currentText = "";
        currentStart = lastEnd;
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
            className="mb-4 p-2 hover:bg-gray-50 border-b last:border-b-0"
          >
            <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">
              [{formatTime(segment.start)} - {formatTime(segment.end)}]
            </span>
            <span className="text-gray-900 block mt-1">{segment.text}</span>
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
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );
}
