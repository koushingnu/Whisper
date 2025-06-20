import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { DictionaryEntry } from "@/lib/types";

// 辞書エントリーを追加する関数
async function addDictionaryEntry(entry: Partial<DictionaryEntry>) {
  console.log("Adding entry to Supabase:", entry);

  const { data, error } = await supabase
    .from("dictionary")
    .insert({
      incorrect: entry.incorrect,
      correct: entry.correct,
      category: entry.category,
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }

  console.log("Successfully added entry:", data);
  return data;
}

// 既存のエントリーをチェックする関数
async function checkExistingEntry(entry: Partial<DictionaryEntry>) {
  console.log("Checking existing entry for:", entry.incorrect);

  const { data: existingEntries, error } = await supabase
    .from("dictionary")
    .select("incorrect, correct")
    .eq("incorrect", entry.incorrect);

  if (error) {
    console.error("Supabase select error:", error);
    throw error;
  }

  console.log("Found existing entries:", existingEntries);
  return existingEntries;
}

export async function POST(request: NextRequest) {
  try {
    const entry = await request.json();
    console.log("Received entry:", entry);

    if (!entry.incorrect || !entry.correct) {
      return new Response(
        JSON.stringify({
          error: "変換前のテキストと変換後のテキストが必要です",
        }),
        { status: 400 }
      );
    }

    // 既存のエントリーをチェック
    const existingEntries = await checkExistingEntry(entry);

    // 同じ incorrect と correct の組み合わせが存在する場合はエラー
    if (existingEntries?.some((e) => e.correct === entry.correct)) {
      return new Response(
        JSON.stringify({ error: "同じ変換ルールが既に存在します" }),
        { status: 400 }
      );
    }

    // 新しいエントリーを追加
    const addedEntry = await addDictionaryEntry(entry);

    return new Response(
      JSON.stringify({
        message: "辞書を更新しました",
        addedEntry: addedEntry,
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
