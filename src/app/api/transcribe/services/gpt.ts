import OpenAI from "openai";
import { TranscriptionError } from "@/lib/utils/errors";
import { PROCESSING_CONFIG } from "@/lib/utils/constants";
import { WhisperResponse, WhisperSegment } from "@/lib/types/audio";

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GPT-4でテキストを整形
 */
export async function formatWithGPT(
  text: string,
  retryCount = 0
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `
あなたは音声文字起こしの結果を整形する専門家です。
以下の点に注意して文字起こしテキストを整形してください：

1. 句読点を適切に配置
2. 誤字脱字の修正
3. 話し言葉を自然な文章に変換
4. 文脈に応じて適切な改行を挿入
5. 固有名詞の表記を統一

元のニュアンスは保持しつつ、読みやすい文章に整形してください。
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    return response.choices[0]?.message.content || text;
  } catch (error: any) {
    // レート制限エラーの場合
    if (error?.status === 429) {
      if (retryCount < PROCESSING_CONFIG.MAX_RETRIES) {
        // 待機してリトライ
        await new Promise((resolve) =>
          setTimeout(resolve, PROCESSING_CONFIG.RETRY_DELAY_MS)
        );
        return formatWithGPT(text, retryCount + 1);
      }
      throw new TranscriptionError("RATE_LIMIT");
    }

    // APIエラーの場合
    if (error?.status >= 400) {
      throw new TranscriptionError(
        "API_ERROR",
        `GPT API error: ${error.message}`,
        error
      );
    }

    // その他のエラー
    throw new TranscriptionError("UNKNOWN_ERROR", undefined, error);
  }
}

/**
 * セグメントごとにテキストを整形
 */
export async function formatSegments(
  segments: WhisperSegment[]
): Promise<WhisperSegment[]> {
  const formattedSegments: WhisperSegment[] = [];

  for (const segment of segments) {
    try {
      const formattedText = await formatWithGPT(segment.text);
      formattedSegments.push({
        ...segment,
        text: formattedText,
      });

      // レート制限を考慮して待機
      await new Promise((resolve) =>
        setTimeout(resolve, PROCESSING_CONFIG.RATE_LIMIT.COOLDOWN_MS)
      );
    } catch (error) {
      // エラーが発生した場合は元のテキストを使用
      formattedSegments.push(segment);
    }
  }

  return formattedSegments;
}

/**
 * 文字起こし結果全体を整形
 */
export async function formatTranscription(
  result: WhisperResponse
): Promise<WhisperResponse> {
  // 全体のテキストを整形
  const formattedText = await formatWithGPT(result.text);

  // セグメントごとに整形
  const formattedSegments = await formatSegments(result.segments);

  return {
    ...result,
    text: formattedText,
    segments: formattedSegments,
  };
}
