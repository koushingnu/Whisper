"use client";

import React, { useState, useEffect, useRef } from "react";
import { DiffModal } from "./DiffModal";

interface TextEditorProps {
  initialText: string;
  readOnly: boolean;
  onSave?: (text: string) => Promise<void>;
  timestamps?: { start: number; end: number }[];
}

interface LineData {
  id: number;
  text: string;
  isEditing: boolean;
  originalText: string;
}

interface TextDiff {
  beforeText: string;
  afterText: string;
}

export function TextEditor({
  initialText,
  readOnly,
  onSave,
  timestamps,
}: TextEditorProps) {
  const [lines, setLines] = useState<LineData[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0);
  const [textDiffs, setTextDiffs] = useState<TextDiff[]>([]);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>(
    {}
  );

  // テキストエリアの参照を設定する関数
  const setTextareaRef = (
    lineId: number,
    element: HTMLTextAreaElement | null
  ) => {
    textareaRefs.current[lineId] = element;
  };

  // テキストを行に分割する関数
  const splitIntoLines = (text: string): LineData[] => {
    return text.split("\n").map((line, index) => ({
      id: index,
      text: line,
      isEditing: false,
      originalText: line,
    }));
  };

  // 初期テキストの設定
  useEffect(() => {
    if (!initialText) return;
    const formattedText = formatText(initialText);
    setLines(splitIntoLines(formattedText));
  }, [initialText]);

  // テキストを整形する関数
  const formatText = (text: string): string => {
    if (!text) return "";

    let formatted = text
      .trim()
      .replace(/\n+/g, "\n")
      .replace(/[ 　]+/g, " ")
      .replace(/([。！？、]) /g, "$1");

    formatted = formatted
      .replace(/([。！？])(?![」』）\)])/g, "$1\n")
      .replace(/([、])(?![」』）\)])/g, "$1 ");

    return formatted;
  };

  // 行の編集を開始
  const handleEditLine = (lineId: number) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, isEditing: true } : line
      )
    );
  };

  // 行の編集をキャンセル
  const handleCancelEdit = (lineId: number) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, isEditing: false, text: line.originalText }
          : line
      )
    );
  };

  // 修正箇所の前後のコンテキストを抽出する関数
  const extractContext = (
    text: string,
    modifiedText: string
  ): { before: string; after: string } => {
    // 日本語の文字（漢字、ひらがな、カタカナ）、英数字、記号で分割
    const splitPattern =
      /([一-龯ぁ-んァ-ヶー々〆〤ヽヾ゛゜a-zA-Z0-9]+|[、。！？．，\s])/g;
    const words = text.match(splitPattern) || [];
    const modifiedWords = modifiedText.match(splitPattern) || [];

    let startIndex = 0;
    let endIndex = words.length - 1;
    let modifiedStartIndex = 0;
    let modifiedEndIndex = modifiedWords.length - 1;

    // 先頭から一致する部分をスキップ
    while (
      startIndex < words.length &&
      modifiedStartIndex < modifiedWords.length &&
      words[startIndex] === modifiedWords[modifiedStartIndex]
    ) {
      startIndex++;
      modifiedStartIndex++;
    }

    // 末尾から一致する部分をスキップ
    while (
      endIndex > startIndex &&
      modifiedEndIndex > modifiedStartIndex &&
      words[endIndex] === modifiedWords[modifiedEndIndex]
    ) {
      endIndex--;
      modifiedEndIndex--;
    }

    // 前後のコンテキストを含めて抽出（句読点で区切られた単位で）
    const contextSize = 3; // 前後3文節まで含める
    let beforeStart = startIndex;
    let afterEnd = endIndex;
    let modifiedBeforeStart = modifiedStartIndex;
    let modifiedAfterEnd = modifiedEndIndex;

    // 前方のコンテキストを探す
    let sentenceCount = 0;
    for (let i = startIndex - 1; i >= 0 && sentenceCount < contextSize; i--) {
      beforeStart = i;
      if (/[。！？]/.test(words[i])) {
        sentenceCount++;
      }
    }

    // 後方のコンテキストを探す
    sentenceCount = 0;
    for (
      let i = endIndex + 1;
      i < words.length && sentenceCount < contextSize;
      i++
    ) {
      afterEnd = i;
      if (/[。！？]/.test(words[i])) {
        sentenceCount++;
      }
    }

    // 修正後のテキストも同様に処理
    sentenceCount = 0;
    for (
      let i = modifiedStartIndex - 1;
      i >= 0 && sentenceCount < contextSize;
      i--
    ) {
      modifiedBeforeStart = i;
      if (/[。！？]/.test(modifiedWords[i])) {
        sentenceCount++;
      }
    }

    sentenceCount = 0;
    for (
      let i = modifiedEndIndex + 1;
      i < modifiedWords.length && sentenceCount < contextSize;
      i++
    ) {
      modifiedAfterEnd = i;
      if (/[。！？]/.test(modifiedWords[i])) {
        sentenceCount++;
      }
    }

    return {
      before: words.slice(beforeStart, afterEnd + 1).join(""),
      after: modifiedWords
        .slice(modifiedBeforeStart, modifiedAfterEnd + 1)
        .join(""),
    };
  };

  // 行の変更を保存
  const handleSaveLine = (lineId: number) => {
    setLines((prev) => {
      const updatedLines = prev.map((line) =>
        line.id === lineId ? { ...line, isEditing: false } : line
      );

      // 変更を検出して差分配列に追加
      const changedLine = prev.find((l) => l.id === lineId);
      if (changedLine && changedLine.text !== changedLine.originalText) {
        const { before, after } = extractContext(
          changedLine.originalText,
          changedLine.text
        );
        setTextDiffs([
          {
            beforeText: before,
            afterText: after,
          },
        ]);
        setCurrentDiffIndex(0);
        setShowDiffModal(true);
      }

      return updatedLines;
    });
  };

  // 差分モーダルでの確定処理
  const handleConfirmDiff = async (beforeText: string, afterText: string) => {
    try {
      // 辞書に保存
      const response = await fetch("/api/dictionary/learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: [
            {
              original: beforeText,
              edited: afterText,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Dictionary update failed:", errorData);
        throw new Error(errorData.error || "Failed to update dictionary");
      }

      const result = await response.json();
      console.log("Dictionary update result:", result);

      // モーダルを閉じる
      setShowDiffModal(false);
      setTextDiffs([]);
      setCurrentDiffIndex(0);

      // 変更を確定
      setLines((prev) =>
        prev.map((line) =>
          line.text !== line.originalText
            ? { ...line, originalText: line.text }
            : line
        )
      );
    } catch (error) {
      console.error("Failed to save changes to dictionary:", error);
      alert(
        "辞書の更新に失敗しました: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  // モーダルを閉じる
  const handleCloseDiffModal = () => {
    // 編集をキャンセルして元の状態に戻す
    setLines((prev) =>
      prev.map((line) =>
        line.text !== line.originalText
          ? { ...line, text: line.originalText }
          : line
      )
    );
    setShowDiffModal(false);
    setTextDiffs([]);
    setCurrentDiffIndex(0);
  };

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // 行のテキスト変更時の処理
  const handleLineChange = (lineId: number, value: string) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, text: value } : line))
    );

    if (textareaRefs.current[lineId]) {
      adjustTextareaHeight(textareaRefs.current[lineId]!);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="relative group">
            {line.isEditing ? (
              <div className="flex items-start space-x-2">
                <textarea
                  ref={(el) => setTextareaRef(line.id, el)}
                  value={line.text}
                  onChange={(e) => handleLineChange(line.id, e.target.value)}
                  className="flex-1 p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  style={{
                    minHeight: "2.5rem",
                    lineHeight: "1.8",
                    letterSpacing: "0.5px",
                    fontFamily: "'Noto Sans JP', sans-serif",
                    fontSize: "16px",
                    resize: "none",
                  }}
                  onFocus={(e) => adjustTextareaHeight(e.target)}
                />
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleSaveLine(line.id)}
                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => handleCancelEdit(line.id)}
                    className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center group relative">
                <p className="flex-1 p-2 pr-24 rounded-lg hover:bg-gray-50">
                  {line.text}
                </p>
                {!readOnly && (
                  <button
                    onClick={() => handleEditLine(line.id)}
                    className="opacity-0 group-hover:opacity-100 absolute right-2 px-4 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-opacity"
                  >
                    編集
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 差分確認モーダル */}
      <DiffModal
        isOpen={showDiffModal}
        beforeText={textDiffs[currentDiffIndex]?.beforeText || ""}
        afterText={textDiffs[currentDiffIndex]?.afterText || ""}
        onConfirm={handleConfirmDiff}
        onClose={handleCloseDiffModal}
      />
    </div>
  );
}
