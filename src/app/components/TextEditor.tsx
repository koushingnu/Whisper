"use client";

import React, { useState, useEffect } from "react";
import { extractDictionaryEntries } from "@/lib/utils";

interface TextEditorProps {
  correctedText: string;
  timestamps: { start: number; end: number }[];
  onCorrectedTextChange: (text: string) => void;
}

interface Sentence {
  id: number;
  text: string;
  originalText: string;
  isEditing: boolean;
  timestamp: {
    start: number;
    end: number;
  };
}

export function TextEditor({
  correctedText,
  timestamps,
  onCorrectedTextChange,
}: TextEditorProps) {
  const [sentences, setSentences] = useState<Sentence[]>([]);

  // 時間を「分:秒」形式に変換する関数
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // 文章を文単位に分割する関数
  const splitIntoSentences = (text: string): string[] => {
    // 句点で分割し、空の文を除外
    return text
      .split(/([。！？])/g)
      .reduce((acc: string[], curr: string, i: number, arr: string[]) => {
        // 句点とその前の文をくっつける
        if (i % 2 === 0) {
          const nextPunct = arr[i + 1] || "";
          acc.push(curr + nextPunct);
        }
        return acc;
      }, [])
      .filter((s) => s.trim().length > 0);
  };

  // テキストが変更されたときに文単位の配列を更新
  useEffect(() => {
    const sentenceTexts = splitIntoSentences(correctedText);

    const sentenceObjects = sentenceTexts.map((text, index) => ({
      id: index,
      text,
      originalText: text,
      isEditing: false,
      timestamp: timestamps[index] || { start: 0, end: 0 },
    }));
    setSentences(sentenceObjects);
  }, [correctedText, timestamps]);

  // 個別の文が編集されたときの処理
  const handleSentenceChange = (id: number, newText: string) => {
    const updatedSentences = sentences.map((sentence) =>
      sentence.id === id ? { ...sentence, text: newText } : sentence
    );
    setSentences(updatedSentences);
  };

  // 編集モードの切り替え
  const toggleEdit = (id: number) => {
    setSentences(
      sentences.map((sentence) =>
        sentence.id === id
          ? { ...sentence, isEditing: !sentence.isEditing }
          : sentence
      )
    );
  };

  // 文の編集完了時の処理
  const handleSentenceEditComplete = async (sentence: Sentence) => {
    if (!sentence.isEditing) return;

    try {
      // 元のテキストと編集後のテキストが異なる場合のみ辞書に追加
      if (sentence.text !== sentence.originalText) {
        const response = await fetch("/api/dictionary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalText: sentence.originalText,
            correctedText: sentence.text,
          }),
        });

        if (!response.ok) {
          throw new Error("辞書の更新に失敗しました");
        }
      }

      // 編集モードを終了
      toggleEdit(sentence.id);

      // 全体のテキストを更新
      const updatedText = sentences.map((s) => s.text).join("");
      onCorrectedTextChange(updatedText);
    } catch (error) {
      console.error("辞書の更新に失敗しました:", error);
      alert(
        `辞書の更新に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
      );
    }
  };

  return (
    <div className="space-y-4">
      {sentences.map((sentence) => (
        <div
          key={sentence.id}
          className="border rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {formatTime(sentence.timestamp.start)} -{" "}
              {formatTime(sentence.timestamp.end)}
            </span>
            <div className="flex items-center space-x-2">
              {sentence.isEditing ? (
                <>
                  <button
                    onClick={() => handleSentenceEditComplete(sentence)}
                    className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      // 編集をキャンセルして元のテキストに戻す
                      handleSentenceChange(sentence.id, sentence.originalText);
                      toggleEdit(sentence.id);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  >
                    キャンセル
                  </button>
                </>
              ) : (
                <button
                  onClick={() => toggleEdit(sentence.id)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  編集
                </button>
              )}
            </div>
          </div>
          {sentence.isEditing ? (
            <textarea
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={sentence.text}
              onChange={(e) =>
                handleSentenceChange(sentence.id, e.target.value)
              }
              rows={2}
              autoFocus
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded-md">{sentence.text}</div>
          )}
        </div>
      ))}
    </div>
  );
}
