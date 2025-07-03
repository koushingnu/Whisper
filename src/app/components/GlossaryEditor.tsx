"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from "lodash";

interface GlossaryTerm {
  id: number;
  term: string;
  description: string;
  category?: string;
  created_at: string;
}

interface GlossaryEditorProps {
  onSave?: (term: Omit<GlossaryTerm, "id" | "created_at">) => void;
}

export default function GlossaryEditor({ onSave }: GlossaryEditorProps) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newTerm, setNewTerm] = useState({
    term: "",
    description: "",
    category: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 用語一覧を取得
  const fetchTerms = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);

      const response = await fetch(`/api/glossary?${params.toString()}`);
      if (!response.ok) throw new Error("用語の取得に失敗しました");

      const data = await response.json();
      setTerms(data);

      // カテゴリー一覧を更新
      const categories = data
        .map((term: GlossaryTerm) => term.category)
        .filter((category: string | undefined): category is string =>
          Boolean(category)
        );

      const uniqueCategories: string[] = Array.from(
        new Set<string>(categories)
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  // デバウンスされた検索処理
  const debouncedFetchTerms = useCallback(
    debounce(() => {
      fetchTerms();
    }, 500),
    [fetchTerms]
  );

  // 初回読み込み時と検索条件変更時に用語一覧を取得
  useEffect(() => {
    if (!isExpanded) return; // 展開されていない場合は取得しない
    debouncedFetchTerms();
    return () => {
      debouncedFetchTerms.cancel();
    };
  }, [searchQuery, selectedCategory, isExpanded, debouncedFetchTerms]);

  // 展開時に初回データを取得
  useEffect(() => {
    if (isExpanded) {
      fetchTerms();
    }
  }, [isExpanded, fetchTerms]);

  // 新しい用語を追加
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.term || !newTerm.description) return;

    try {
      const response = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTerm),
      });

      if (!response.ok) throw new Error("用語の追加に失敗しました");

      // フォームをリセット
      setNewTerm({ term: "", description: "", category: "" });
      // 用語一覧を更新
      fetchTerms();

      if (onSave) {
        onSave(newTerm);
      }
    } catch (error) {
      console.error("Error adding term:", error);
    }
  };

  return (
    <div className="space-y-2 border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex justify-between items-center bg-white hover:bg-gray-50"
      >
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">用語集</h2>
          <span className="text-sm text-gray-500">({terms.length}件)</span>
        </div>
        <svg
          className={`w-5 h-5 transform transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-4 space-y-6">
              {/* 検索フィルター */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="用語を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="">全てのカテゴリー</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* 新規用語追加フォーム */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4 p-4 border rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="用語"
                    value={newTerm.term}
                    onChange={(e) =>
                      setNewTerm({ ...newTerm, term: e.target.value })
                    }
                    className="px-4 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="カテゴリー"
                    value={newTerm.category}
                    onChange={(e) =>
                      setNewTerm({ ...newTerm, category: e.target.value })
                    }
                    className="px-4 py-2 border rounded-lg"
                  />
                </div>
                <textarea
                  placeholder="説明"
                  value={newTerm.description}
                  onChange={(e) =>
                    setNewTerm({ ...newTerm, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  追加
                </button>
              </form>

              {/* 用語一覧 */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center">読み込み中...</div>
                ) : terms.length === 0 ? (
                  <div className="text-center text-gray-500">
                    用語が見つかりません
                  </div>
                ) : (
                  terms.map((term) => (
                    <div key={term.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{term.term}</h3>
                          {term.category && (
                            <span className="text-sm text-gray-500">
                              {term.category}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(term.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-700">{term.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
