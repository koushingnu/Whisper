"use client";

import React, { useState, useEffect, useRef } from "react";
import { DiffModal } from "./DiffModal";
import { motion, AnimatePresence } from "framer-motion";
import { formatText } from "@/lib/utils/text";

interface TextEditorProps {
  initialText: string;
  readOnly: boolean;
}

interface LineData {
  id: number;
  text: string;
  originalText: string;
}

interface TextDiff {
  beforeText: string;
  afterText: string;
}

interface NotificationProps {
  message: string;
  type: "success" | "info" | "warning" | "error";
  onClose: () => void;
}

// 通知メッセージコンポーネント
const Notification = ({ message, type, onClose }: NotificationProps) => {
  const styles = {
    success: "bg-green-100 border-green-400 text-green-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
    error: "bg-red-100 border-red-400 text-red-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 border px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 ${styles[type]}`}
    >
      <div className="flex-1">{message}</div>
      <button
        onClick={onClose}
        className={`hover:opacity-75 focus:outline-none`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </motion.div>
  );
};

export function TextEditor({ initialText, readOnly }: TextEditorProps) {
  const [lines, setLines] = useState<LineData[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "info" | "warning" | "error";
  }>({ show: false, message: "", type: "success" });

  // テキストを行に分割する関数
  const splitIntoLines = (text: string): LineData[] => {
    return text.split("\n").map((line, index) => ({
      id: index,
      text: line,
      originalText: line,
    }));
  };

  // 初期テキストの設定
  useEffect(() => {
    if (!initialText) return;
    const formattedText = formatText(initialText);
    setLines(splitIntoLines(formattedText));
  }, [initialText]);

  // テキスト選択時の処理
  const handleTextSelection = (lineId: number) => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    setSelectedText(selectedText);
    setSelectedLineId(lineId);
    setShowDiffModal(true);
  };

  // 差分モーダルでの確定処理
  const handleConfirmDiff = async (beforeText: string, afterText: string) => {
    try {
      if (beforeText === afterText) {
        setShowDiffModal(false);
        // 同じテキストの場合は通知を表示
        setNotification({
          show: true,
          message: "修正前と修正後が同じです",
          type: "info",
        });
        setTimeout(() => {
          setNotification((prev) => ({ ...prev, show: false }));
        }, 3000);
        return;
      }

      const response = await fetch("/api/dictionary/learn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changes: [
            {
              incorrect: beforeText,
              correct: afterText,
              category: "ユーザー修正",
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 重複エントリーの場合は特別なメッセージを表示
        if (response.status === 409) {
          setShowDiffModal(false);
          setNotification({
            show: true,
            message: data.details || "この修正内容は既に登録されています",
            type: "warning",
          });
          setTimeout(() => {
            setNotification((prev) => ({ ...prev, show: false }));
          }, 3000);
          return;
        }

        throw new Error(
          `Dictionary update failed: ${data.details || data.error || "Unknown error"}`
        );
      }

      if (!data.success) {
        throw new Error(data.message || "Failed to update dictionary");
      }

      // テキストを更新
      if (selectedLineId !== null) {
        setLines((prev) =>
          prev.map((line) =>
            line.id === selectedLineId
              ? {
                  ...line,
                  text: line.text.replace(beforeText, afterText),
                  originalText: line.text.replace(beforeText, afterText),
                }
              : line
          )
        );
      }

      // モーダルを閉じる
      setShowDiffModal(false);
      setSelectedText("");
      setSelectedLineId(null);

      // 成功メッセージを表示
      setNotification({
        show: true,
        message: "辞書を更新しました",
        type: "success",
      });
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
    } catch (error) {
      console.error("Error updating dictionary:", error);
      setNotification({
        show: true,
        message:
          error instanceof Error ? error.message : "辞書の更新に失敗しました",
        type: "error",
      });
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  // モーダルを閉じる
  const handleCloseDiffModal = () => {
    setShowDiffModal(false);
    setSelectedText("");
    setSelectedLineId(null);
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {notification.show && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() =>
              setNotification((prev) => ({ ...prev, show: false }))
            }
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-0.5"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className="group relative bg-white rounded-lg py-1.5 px-4 hover:bg-gray-50 transition-colors"
            onMouseUp={() => handleTextSelection(line.id)}
          >
            <p className="text-base leading-snug text-gray-800">{line.text}</p>
          </div>
        ))}
      </motion.div>

      {showDiffModal && (
        <DiffModal
          beforeText={selectedText}
          afterText={selectedText}
          onConfirm={handleConfirmDiff}
          onClose={handleCloseDiffModal}
        />
      )}
    </div>
  );
}
