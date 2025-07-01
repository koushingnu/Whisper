import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// 単語レベルの差分を抽出する関数
function extractWordDifferences(
  original: string,
  edited: string
): { incorrect: string; correct: string }[] {
  // 簡単な前処理
  const cleanText = (text: string) => text.trim().replace(/\s+/g, " ");
  const originalWords = cleanText(original).split(" ");
  const editedWords = cleanText(edited).split(" ");

  const differences: { incorrect: string; correct: string }[] = [];

  // 最長共通部分列を使用して差分を検出
  let i = 0;
  let j = 0;

  while (i < originalWords.length && j < editedWords.length) {
    if (originalWords[i] !== editedWords[j]) {
      // 単純な1単語の置換として扱う
      differences.push({
        incorrect: originalWords[i],
        correct: editedWords[j],
      });
      i++;
      j++;
    } else {
      i++;
      j++;
    }
  }

  return differences;
}

export async function POST(request: NextRequest) {
  try {
    const { changes } = await request.json();

    if (!Array.isArray(changes)) {
      return new Response(JSON.stringify({ error: "Invalid input format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const dictionaryUpdates: { incorrect: string; correct: string }[] = [];

    // 各変更から単語レベルの差分を抽出
    changes.forEach((change) => {
      if (!change.original || !change.edited) {
        throw new Error("Missing original or edited text");
      }
      const differences = extractWordDifferences(
        change.original,
        change.edited
      );
      dictionaryUpdates.push(...differences);
    });

    // 重複を除去
    const uniqueUpdates = dictionaryUpdates.filter(
      (update, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.incorrect === update.incorrect && t.correct === update.correct
        )
    );

    // 辞書に追加
    if (uniqueUpdates.length > 0) {
      const { error } = await supabase.from("dictionary").upsert(
        uniqueUpdates.map((update) => ({
          incorrect: update.incorrect,
          correct: update.correct,
          category: "自動学習",
          created_at: new Date().toISOString(),
        })),
        { onConflict: "incorrect" }
      );

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedEntries: uniqueUpdates.length,
        updates: uniqueUpdates,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dictionary learning error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update dictionary",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
