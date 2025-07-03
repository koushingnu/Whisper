import { supabase } from "../supabase";
import { calculateApiCosts } from "./text";
import { DAILY_USAGE_LIMIT } from "../constants";

// 日次利用額の取得
export async function getDailyUsage(date: string) {
  const { data, error } = await supabase
    .from("daily_usage")
    .select("*")
    .eq("date", date)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116: データが見つからない
    throw error;
  }

  return (
    data || {
      total_whisper_cost: 0,
      total_chatgpt_cost: 0,
      total_cost: 0,
    }
  );
}

// 利用制限チェック
export async function checkUsageLimit(audioDuration: number): Promise<{
  canProceed: boolean;
  reason?: string;
  estimatedCost: {
    whisper: number;
    chatgpt: number;
    total: number;
  };
}> {
  const today = new Date().toISOString().split("T")[0];

  // 現在の利用額を取得
  const dailyUsage = await getDailyUsage(today);

  // 予定利用額を計算
  const estimatedCost = calculateApiCosts(audioDuration);
  const projectedTotal = dailyUsage.total_cost + estimatedCost.total;

  return {
    canProceed: projectedTotal <= DAILY_USAGE_LIMIT,
    reason:
      projectedTotal > DAILY_USAGE_LIMIT
        ? `本日の利用制限額（${DAILY_USAGE_LIMIT.toLocaleString()}円）を超過します`
        : undefined,
    estimatedCost,
  };
}

// 利用記録の保存
export async function recordUsage(params: {
  userId: string;
  audioDuration: number;
  whisperCost: number;
  chatgptCost: number;
}) {
  const { userId, audioDuration, whisperCost, chatgptCost } = params;
  const date = new Date().toISOString().split("T")[0];

  const { error } = await supabase.rpc("record_usage", {
    p_user_id: userId,
    p_date: date,
    p_audio_duration: audioDuration,
    p_whisper_cost: whisperCost,
    p_chatgpt_cost: chatgptCost,
  });

  if (error) {
    throw error;
  }
}

// 型定義
export type DailyUsage = {
  date: string;
  total_whisper_cost: number;
  total_chatgpt_cost: number;
  total_cost: number;
  last_updated: string;
};
