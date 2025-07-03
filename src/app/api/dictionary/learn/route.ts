import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface DictionaryChange {
  incorrect: string;
  correct: string;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { changes } = await request.json();

    if (!Array.isArray(changes) || changes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid input format",
          details: "Changes must be a non-empty array",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // バリデーション
    const validChanges = changes.filter((change: DictionaryChange) => {
      if (!change.incorrect || !change.correct) return false;
      if (change.incorrect === change.correct) return false;
      if (
        typeof change.incorrect !== "string" ||
        typeof change.correct !== "string"
      )
        return false;
      return true;
    });

    if (validChanges.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No valid changes to process",
          updatedEntries: 0,
          updates: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 重複を除去
    const uniqueChanges = validChanges.filter(
      (change, index, self) =>
        index ===
        self.findIndex(
          (c) =>
            c.incorrect === change.incorrect && c.correct === change.correct
        )
    );

    // 既存のエントリーをチェック
    for (const change of uniqueChanges) {
      const { data: existingEntries } = await supabase
        .from("dictionary")
        .select("*")
        .eq("incorrect", change.incorrect.trim())
        .eq("correct", change.correct.trim());

      if (existingEntries && existingEntries.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Duplicate entry",
            details: "この修正内容は既に辞書に登録されています",
            existingEntry: existingEntries[0],
          }),
          {
            status: 409, // Conflict
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // データベースに保存
    const { data, error } = await supabase.from("dictionary").insert(
      uniqueChanges.map((change) => ({
        incorrect: change.incorrect.trim(),
        correct: change.correct.trim(),
        category: change.category || "自動学習",
        created_at: new Date().toISOString(),
      }))
    );

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update dictionary",
          details: error.message,
          code: error.code,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedEntries: uniqueChanges.length,
        updates: uniqueChanges,
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
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
