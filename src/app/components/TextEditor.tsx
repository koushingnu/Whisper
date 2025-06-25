"use client";

import React, { useState, useEffect, useRef } from "react";
import { TranscriptionResult, Segment, DictionaryEntry } from "@/lib/types";

interface TextEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  readOnly: boolean;
  timestamps: { start: number; end: number }[];
}

export function TextEditor({
  initialText,
  onSave,
  readOnly,
  timestamps,
}: TextEditorProps) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showDictionaryForm, setShowDictionaryForm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<
    Partial<DictionaryEntry>
  >({
    incorrect: "",
    correct: "",
    category: "",
  });

  // テキストエリアの高さを自動調整する関数
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (!initialText) return;

    // テキストを整形
    const formattedText = formatText(initialText);
    setText(formattedText);

    // 次のレンダリングサイクルでテキストエリアの高さを調整
    setTimeout(adjustTextareaHeight, 0);

    const mergedSegments = mergeSegments(timestamps, formattedText);
    setSegments(mergedSegments);
  }, [initialText, timestamps]);

  // テキストが変更されたときに高さを調整
  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  // ウィンドウサイズが変更されたときに高さを再調整
  useEffect(() => {
    const handleResize = () => {
      adjustTextareaHeight();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // セグメントをマージする関数
  const mergeSegments = (
    rawSegments: { start: number; end: number }[],
    text: string
  ) => {
    const newSegments: Segment[] = [];
    let currentText = "";
    let currentStart = 0;
    let lastEnd = 0;

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

  // テキストを整形する関数
  const formatText = (text: string): string => {
    // 1. 不要な空白や改行を削除
    let formatted = text.trim().replace(/\s+/g, " ");

    // 2. 句点で改行を入れる
    formatted = formatted.replace(/([。！？])\s*/g, "$1\n");

    // 3. 長い文章を適度な長さで改行
    const lines = formatted.split("\n");
    const maxLength = 40; // 1行あたりの最大文字数

    const newLines = lines.map((line) => {
      if (line.length <= maxLength) return line;

      // 読点で分割して改行を入れる
      const segments = line.split(/([、，])/).filter(Boolean);
      let currentLine = "";
      const resultLines = [];

      segments.forEach((segment, index) => {
        if (currentLine.length + segment.length > maxLength) {
          resultLines.push(currentLine);
          currentLine = segment;
        } else {
          currentLine += segment;
        }

        // 最後のセグメントの処理
        if (index === segments.length - 1 && currentLine) {
          resultLines.push(currentLine);
        }
      });

      return resultLines.join("\n");
    });

    return newLines.join("\n");
  };

  const handleEdit = () => {
    setIsEditing(true);
    // 編集モード開始時にも高さを調整
    setTimeout(adjustTextareaHeight, 0);
  };

  const handleSave = () => {
    setIsEditing(false);
    onSave(text);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setText(initialText);
    // キャンセル時にも高さを調整
    setTimeout(adjustTextareaHeight, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // テキスト変更時に高さを調整（useEffectでも処理される）
    adjustTextareaHeight();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">文字起こし結果</h2>
        {!readOnly && (
          <div className="space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                編集
              </button>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          disabled={!isEditing || readOnly}
          className={`w-full p-4 border rounded-lg font-sans text-base leading-relaxed overflow-hidden ${
            isEditing && !readOnly
              ? "bg-white border-blue-300"
              : "bg-gray-50 border-gray-200"
          }`}
          style={{
            lineHeight: "1.8",
            letterSpacing: "0.5px",
            resize: "none",
            minHeight: "auto",
            height: "auto",
          }}
        />
        {timestamps.length > 0 && !isEditing && (
          <div className="absolute right-2 top-2 bg-white/80 backdrop-blur-sm p-2 rounded shadow-sm">
            <p className="text-xs text-gray-600">
              {formatTime(timestamps[0].start)} -{" "}
              {formatTime(timestamps[timestamps.length - 1].end)}
            </p>
          </div>
        )}
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
