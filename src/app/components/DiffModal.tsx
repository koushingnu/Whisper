import React, { useState, useEffect } from "react";
import { diffWords } from "diff";
import { motion } from "framer-motion";

interface DiffModalProps {
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

  const handleConfirm = () => {
    onConfirm(editedBeforeText, editedAfterText);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-6xl mx-4"
      >
        <h3 className="text-xl font-bold mb-6 text-gray-800">
          選択したテキストを編集
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Before (左カラム) */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">編集前のテキスト</h4>
            <textarea
              value={editedBeforeText}
              onChange={(e) => setEditedBeforeText(e.target.value)}
              className="w-full h-40 p-4 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base"
              placeholder="編集前のテキスト..."
            />
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600 mb-2">
                差分表示：
              </p>
              <div className="whitespace-pre-wrap text-base">
                {diffResult.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.removed
                        ? "bg-red-100 line-through text-red-700"
                        : part.added
                          ? "hidden"
                          : "text-gray-700"
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* After (右カラム) */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">編集後のテキスト</h4>
            <textarea
              value={editedAfterText}
              onChange={(e) => setEditedAfterText(e.target.value)}
              className="w-full h-40 p-4 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-base"
              placeholder="編集後のテキスト..."
              autoFocus
            />
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-600 mb-2">
                差分表示：
              </p>
              <div className="whitespace-pre-wrap text-base">
                {diffResult.map((part, index) => (
                  <span
                    key={index}
                    className={
                      part.added
                        ? "bg-green-100 text-green-700"
                        : part.removed
                          ? "hidden"
                          : "text-gray-700"
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            キャンセル
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            確定して保存
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
