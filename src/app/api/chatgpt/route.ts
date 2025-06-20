import { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { DictionaryEntry } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function loadDictionary() {
  try {
    const { data: entries, error } = await supabase
      .from("dictionary")
      .select("incorrect, correct, category")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return entries || [];
  } catch (error) {
    console.warn("辞書の読み込みに失敗しました:", error);
    return [];
  }
}

function formatDictionaryRules(dictionary: DictionaryEntry[]) {
  if (dictionary.length === 0) return "";

  // カテゴリーごとにグループ化
  const categorizedRules = dictionary.reduce(
    (acc, entry) => {
      const category = entry.category || "その他";
      if (!acc[category]) acc[category] = [];
      acc[category].push(entry);
      return acc;
    },
    {} as Record<string, DictionaryEntry[]>
  );

  let rulesText = "以下の辞書ルールを必ず適用してください：\n\n";

  // カテゴリーごとにルールを整形
  Object.entries(categorizedRules).forEach(([category, entries]) => {
    rulesText += `【${category}】\n`;
    entries.forEach((entry) => {
      rulesText += `- "${entry.incorrect}" → "${entry.correct}"\n`;
    });
    rulesText += "\n";
  });

  return rulesText;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "テキストが見つかりません" }),
        { status: 400 }
      );
    }

    const dictionary = await loadDictionary();
    const dictionaryRules = formatDictionaryRules(dictionary);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `あなたは高精度な日本語校正システムです。
以下の優先順位で校正を行ってください：

1. 辞書ルール
- 提供される辞書ルールを最優先で適用
- 部分一致も含めて確実に変換
- カテゴリーごとの文脈を考慮

2. 文章の自然さ
- 句読点の位置の最適化
- 助詞の適切な使用
- 敬語の統一性
- 冗長な表現の改善

3. フォーマット
- 適切な改行位置
- インデントの統一
- スペースの統一

変換後は以下を出力してください：
1. 変換したテキスト
2. 適用した辞書ルールの一覧（どのルールを適用したか）
3. その他の修正点の要約`,
        },
        {
          role: "user",
          content:
            dictionaryRules + "以下のテキストを校正してください：\n\n" + text,
        },
      ],
      temperature: 0.3, // より決定論的な出力に
    });

    // レスポンスをパースして構造化
    const content = response.choices[0].message.content || "";
    const sections = content.split(/\n{2,}/);

    return new Response(
      JSON.stringify({
        correctedText: sections[0], // 最初のセクションが校正済みテキスト
        appliedRules: sections[1] || "適用された辞書ルールはありません",
        otherCorrections: sections[2] || "その他の修正はありません",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("ChatGPT API error:", error);
    return new Response(
      JSON.stringify({
        error: "校正中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
}
