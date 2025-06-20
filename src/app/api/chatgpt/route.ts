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

// テキスト内の辞書ルールに該当する部分を強制的に置換
function applyDictionaryRules(text: string, dictionary: DictionaryEntry[]) {
  let modifiedText = text;
  const appliedRules: string[] = [];

  dictionary.forEach((entry) => {
    if (!entry.incorrect || !entry.correct) return;

    const regex = new RegExp(entry.incorrect, "g");
    if (regex.test(modifiedText)) {
      modifiedText = modifiedText.replace(regex, entry.correct);
      appliedRules.push(`"${entry.incorrect}" → "${entry.correct}"`);
    }
  });

  return { modifiedText, appliedRules };
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

  let rulesText =
    "以下の辞書ルールを必ず適用してください。これらは必須の変換ルールです：\n\n";

  // カテゴリーごとにルールを整形
  Object.entries(categorizedRules).forEach(([category, entries]) => {
    rulesText += `【${category}】\n`;
    entries.forEach((entry) => {
      rulesText += `- "${entry.incorrect}" は必ず "${entry.correct}" に変換してください\n`;
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

    // まず機械的に辞書ルールを適用
    const { modifiedText, appliedRules } = applyDictionaryRules(
      text,
      dictionary
    );

    // ChatGPTによる追加の校正
    const dictionaryRules = formatDictionaryRules(dictionary);
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `あなたは高精度な日本語校正システムです。
以下の優先順位で校正を行ってください：

1. 辞書ルール（最優先・必須）
- 提供される辞書ルールは必ず適用してください
- 部分一致も含めて、指定された表現は確実に変換してください
- 変換漏れは重大な問題となります
- 文脈に関係なく、指定された表現は必ず変換してください

2. 文章の自然さ（辞書ルール適用後）
- 句読点の位置の最適化
- 助詞の適切な使用
- 敬語の統一性
- 冗長な表現の改善

3. フォーマット
- 適切な改行位置
- インデントの統一
- スペースの統一

出力形式：
1. 校正後のテキスト
2. 適用した辞書ルールの一覧（どのルールを適用したか）
3. その他の修正点の要約

注意：辞書ルールの適用は必須です。変換漏れがないか、最後に必ず確認してください。`,
        },
        {
          role: "user",
          content: `${dictionaryRules}\n\n以下のテキストを校正してください。既に一部の辞書ルールが適用されている可能性がありますが、漏れがないか確認してください：\n\n${modifiedText}`,
        },
      ],
      temperature: 0.1, // より決定論的な出力に
    });

    // ChatGPTの出力を解析
    const content = response.choices[0].message.content || "";
    const sections = content.split(/\n{2,}/);

    // 最終的な校正結果
    const correctedText = sections[0] || modifiedText;
    const chatGPTAppliedRules =
      sections[1] || "ChatGPTによる追加の辞書ルール適用はありません";
    const otherCorrections = sections[2] || "その他の修正はありません";

    // 機械的な適用とChatGPTの適用を組み合わせた結果を返す
    return new Response(
      JSON.stringify({
        correctedText,
        appliedRules: [
          "【自動適用されたルール】",
          ...appliedRules,
          "",
          "【ChatGPTが確認・適用したルール】",
          chatGPTAppliedRules,
        ].join("\n"),
        otherCorrections,
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
