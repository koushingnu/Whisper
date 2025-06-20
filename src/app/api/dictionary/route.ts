import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractDictionaryEntries } from "@/lib/utils";
import { DictionaryEntry } from "@/lib/types";

// 辞書エントリーを追加する関数
async function addDictionaryEntries(entries: DictionaryEntry[]) {
  console.log("Adding entries to Supabase:", entries);

  const { data, error } = await supabase
    .from("dictionary")
    .insert(
      entries.map((entry) => ({
        incorrect: entry.incorrect,
        correct: entry.correct,
        created_at: new Date().toISOString(),
      }))
    )
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  console.log("Successfully added entries:", data);
  return data;
}

// 既存のエントリーをチェックする関数
async function checkExistingEntries(entries: DictionaryEntry[]) {
  const incorrectTexts = entries.map((e) => e.incorrect);
  console.log("Checking existing entries for:", incorrectTexts);

  const { data: existingEntries, error } = await supabase
    .from("dictionary")
    .select("incorrect, correct")
    .in("incorrect", incorrectTexts);

  if (error) {
    console.error("Supabase select error:", error);
    throw error;
  }

  console.log("Found existing entries:", existingEntries);

  // 既存のエントリーを除外
  const uniqueEntries = entries.filter(
    (entry) =>
      !existingEntries?.some(
        (existing) =>
          existing.incorrect === entry.incorrect &&
          existing.correct === entry.correct
      )
  );

  console.log("Unique entries to be added:", uniqueEntries);
  return uniqueEntries;
}

export async function POST(request: NextRequest) {
  try {
    const { originalText, correctedText } = await request.json();
    console.log("Received texts:", { originalText, correctedText });

    if (!originalText || !correctedText) {
      return new Response(
        JSON.stringify({ error: "元のテキストと修正後のテキストが必要です" }),
        { status: 400 }
      );
    }

    // 差分を抽出
    const newEntries = extractDictionaryEntries(originalText, correctedText);
    console.log("Extracted entries:", newEntries);

    // 既存のエントリーをチェック
    const uniqueEntries = await checkExistingEntries(newEntries);

    let addedEntries = [];
    if (uniqueEntries.length > 0) {
      // 新しいエントリーを追加
      addedEntries = await addDictionaryEntries(uniqueEntries);
    }

    return new Response(
      JSON.stringify({
        message: "辞書を更新しました",
        addedEntries: addedEntries,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("辞書の更新に失敗しました:", error);
    return new Response(
      JSON.stringify({
        error: "辞書の更新に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data: entries, error } = await supabase
      .from("dictionary")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      throw error;
    }

    console.log("Retrieved dictionary entries:", entries);
    return new Response(JSON.stringify(entries), { status: 200 });
  } catch (error) {
    console.error("辞書の取得に失敗しました:", error);
    return new Response(
      JSON.stringify({
        error: "辞書の取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
