import React, { useState, useEffect } from "react";
import { diffWords } from "diff";

interface DiffModalProps {
  isOpen: boolean;
  beforeText: string;
  afterText: string;
  onConfirm: (beforeText: string, afterText: string) => void;
  onClose: () => void;
}

interface DiffSpan {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function DiffModal({
  isOpen,
  beforeText,
  afterText,
  onConfirm,
  onClose,
}: DiffModalProps) {
  const [editedBeforeText, setEditedBeforeText] = useState(beforeText);
  const [editedAfterText, setEditedAfterText] = useState(afterText);
  const [diffResult, setDiffResult] = useState<DiffSpan[]>([]);

  // テキストが変更されたときに差分を再計算
  useEffect(() => {
    const differences = diffWords(editedBeforeText, editedAfterText);
    setDiffResult(differences as DiffSpan[]);
  }, [editedBeforeText, editedAfterText]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(editedBeforeText, editedAfterText);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl mx-4">
        <h3 className="text-lg font-bold mb-4">テキストの変更内容を確認</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Before (左カラム) */}
          <div>
            <h4 className="font-semibold mb-2">編集前</h4>
            <textarea
              value={editedBeforeText}
              onChange={(e) => setEditedBeforeText(e.target.value)}
              className="w-full h-40 p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">差分表示：</p>
              <div className="whitespace-pre-wrap">
                {diffResult.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.removed
                        ? "bg-red-100 line-through"
                        : part.added
                          ? "hidden"
                          : ""
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* After (右カラム) */}
          <div>
            <h4 className="font-semibold mb-2">編集後</h4>
            <textarea
              value={editedAfterText}
              onChange={(e) => setEditedAfterText(e.target.value)}
              className="w-full h-40 p-2 border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">差分表示：</p>
              <div className="whitespace-pre-wrap">
                {diffResult.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.added ? "bg-green-100" : part.removed ? "hidden" : ""
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            確定して保存
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
