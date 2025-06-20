import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as diff from "diff";
import { DictionaryEntry } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 文字列をトークンに分割する関数
function tokenize(text: string): string[] {
  // 基本的な日本語の区切り文字で分割
  return text
    .split(/([、。！？．，\s])/)
    .filter((token) => token.trim().length > 0);
}

// 編集距離を計算する関数
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// 2つのトークンが似ているかどうかを判定する関数
function areSimilarTokens(token1: string, token2: string): boolean {
  if (token1 === token2) return false; // 完全一致は除外

  // 記号のみの場合は除外
  if (/^[\s\p{P}]+$/u.test(token1) || /^[\s\p{P}]+$/u.test(token2))
    return false;

  // 長すぎるトークンは除外
  if (token1.length > 10 || token2.length > 10) return false;

  // 短すぎるトークンは除外
  if (token1.length < 2 || token2.length < 2) return false;

  // 編集距離が近いものを類似とみなす
  const maxLength = Math.max(token1.length, token2.length);
  const distance = levenshteinDistance(token1, token2);
  return distance <= Math.min(2, maxLength * 0.4); // 40%以下の編集距離なら類似と判定
}

// 2つのテキスト間の差分を抽出する関数
export function extractDictionaryEntries(
  originalText: string,
  correctedText: string
): DictionaryEntry[] {
  const originalTokens = tokenize(originalText);
  const correctedTokens = tokenize(correctedText);
  const entries: DictionaryEntry[] = [];

  // 各トークンについて、最も似ているトークンを探す
  for (let i = 0; i < originalTokens.length; i++) {
    const originalToken = originalTokens[i];

    // 記号は無視
    if (/^[\s\p{P}]+$/u.test(originalToken)) continue;

    for (
      let j = Math.max(0, i - 2);
      j < Math.min(correctedTokens.length, i + 3);
      j++
    ) {
      const correctedToken = correctedTokens[j];

      if (areSimilarTokens(originalToken, correctedToken)) {
        // 前後のトークンも含めてコンテキストをチェック
        const prevOriginal = originalTokens[i - 1] || "";
        const nextOriginal = originalTokens[i + 1] || "";
        const prevCorrected = correctedTokens[j - 1] || "";
        const nextCorrected = correctedTokens[j + 1] || "";

        // 前後のコンテキストが大きく異なる場合は除外
        if (prevOriginal !== prevCorrected && nextOriginal !== nextCorrected)
          continue;

        entries.push({
          incorrect: originalToken,
          correct: correctedToken,
        });
        break;
      }
    }
  }

  return entries;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
