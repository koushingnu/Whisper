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

  // デバッグ用：辞書の内容を出力
  console.log("Dictionary entries:", dictionary);

  // 長い文字列から先に置換するようにソート
  const sortedDictionary = [...dictionary].sort(
    (a, b) => (b.incorrect?.length || 0) - (a.incorrect?.length || 0)
  );

  sortedDictionary.forEach((entry) => {
    if (!entry.incorrect || !entry.correct) return;

    // 特殊文字をエスケープ
    const escapedIncorrect = entry.incorrect.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    // 単語境界を考慮した正規表現パターン
    const pattern = new RegExp(
      `(^|[\\s、。！？」』])${escapedIncorrect}($|[\\s、。！？「『])`,
      "g"
    );

    // マッチした部分を置換しながらカウント
    let count = 0;
    modifiedText = modifiedText.replace(pattern, (match, prefix, suffix) => {
      count++;
      return `${prefix}${entry.correct}${suffix}`;
    });

    // デバッグ用：各エントリーの置換結果を出力
    console.log(
      `Rule "${entry.incorrect}" → "${entry.correct}": ${count} matches`
    );

    if (count > 0) {
      appliedRules.push(
        `"${entry.incorrect}" → "${entry.correct}" (${count}箇所)`
      );
    }
  });

  // デバッグ用：最終的な適用ルールを出力
  console.log("Applied rules:", appliedRules);

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
      // より具体的な指示を追加
      rulesText += `- "${entry.incorrect}" は必ず "${entry.correct}" に変換してください（単語の一部分一致は避け、完全一致のみ変換）\n`;
    });
    rulesText += "\n";
  });

  rulesText += "注意事項：\n";
  rulesText += "1. 上記の変換は文脈に関係なく必ず行ってください\n";
  rulesText +=
    "2. 変換は完全一致で行い、単語の一部だけの変換は避けてください\n";
  rulesText +=
    "3. 変換後のテキストを必ず確認し、すべてのルールが適用されているか確認してください\n";

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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは高精度な日本語校正システムです。
以下の優先順位で校正を行ってください：

1. 辞書ルール（最優先・必須）
- 提供される辞書ルールは必ず適用してください
- 完全一致での変換を行い、単語の一部分のみの変換は避けてください
- 変換漏れは重大な問題となります
- 文脈に関係なく、指定された表現は必ず変換してください
- 変換後、必ずすべてのルールが適用されているか確認してください

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
2. 適用した辞書ルールの一覧（どのルールを適用したか、何箇所変換したか）
3. その他の修正点の要約

注意：辞書ルールの適用は必須です。変換漏れがないか、最後に必ず確認してください。
変換前と変換後のテキストを比較し、すべてのルールが正しく適用されているか確認してください。`,
        },
        {
          role: "user",
          content: `${dictionaryRules}\n\n以下のテキストを校正してください。既に一部の辞書ルールが適用されている可能性がありますが、漏れがないか確認してください：\n\n${modifiedText}\n\n変換前のテキスト（参考用）：\n${text}`,
        },
      ],
      temperature: 0.1, // より決定論的な出力に
    });

    // ChatGPTの出力を解析
    const content = response.choices[0].message.content || "";

    // 1. 校正後のテキスト
    const correctedTextMatch = content.match(
      /1\.\s*校正後のテキスト[：:]\s*([\s\S]*?)(?=\n2\.)/
    );
    const correctedText = correctedTextMatch
      ? correctedTextMatch[1].trim()
      : modifiedText;

    // 2. 適用したルール
    const appliedRulesMatch = content.match(
      /2\.\s*適用した(?:辞書)*ルール(?:の一覧)*[：:]\s*([\s\S]*?)(?=\n3\.)/
    );
    const chatGPTAppliedRules = appliedRulesMatch
      ? appliedRulesMatch[1].trim()
      : "ChatGPTによる追加の辞書ルール適用はありません";

    // 3. その他の修正
    const otherCorrectionsMatch = content.match(
      /3\.\s*その他(?:の修正点の要約)*[：:]\s*([\s\S]*?)$/
    );
    const otherCorrections = otherCorrectionsMatch
      ? otherCorrectionsMatch[1].trim()
      : "その他の修正はありません";

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
