import { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function loadDictionary() {
  try {
    const { data: entries, error } = await supabase
      .from("dictionary")
      .select("incorrect, correct")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return entries || [];
  } catch (error) {
    console.warn("辞書の読み込みに失敗しました:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "テキストが見つかりません" }),
        {
          status: 400,
        }
      );
    }

    const dictionary = await loadDictionary();
    const dictionaryText =
      dictionary.length > 0
        ? "以下の辞書に従って変換してください：\n" +
          dictionary
            .map((entry) => `${entry.incorrect} → ${entry.correct}`)
            .join("\n") +
          "\n\n"
        : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "与えられたテキストを日本語として校正し、より自然な表現に修正してください。" +
            "句読点の位置、助詞の使い方、敬語の統一性などに注意を払ってください。" +
            "辞書に記載された変換ルールは必ず適用してください。",
        },
        {
          role: "user",
          content:
            dictionaryText + "以下のテキストを校正してください：\n\n" + text,
        },
      ],
    });

    return new Response(
      JSON.stringify({ text: response.choices[0].message.content }),
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
