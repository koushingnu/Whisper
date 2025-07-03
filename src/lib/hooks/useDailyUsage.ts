import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DAILY_USAGE_LIMIT } from "@/lib/constants";

export type DailyUsage = {
  total_whisper_cost: number;
  total_chatgpt_cost: number;
  total_cost: number;
};

export function useDailyUsage() {
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({
    total_whisper_cost: 0,
    total_chatgpt_cost: 0,
    total_cost: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 利用データを取得する関数
  const fetchDailyUsage = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_usage")
        .select("*")
        .eq("date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116: データが見つからない
        throw error;
      }

      setDailyUsage(
        data || {
          total_whisper_cost: 0,
          total_chatgpt_cost: 0,
          total_cost: 0,
        }
      );
      setError(null);
    } catch (err) {
      console.error("Error fetching daily usage:", err);
      setError(
        err instanceof Error ? err.message : "利用額の取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 初回データ取得
    fetchDailyUsage();

    // 10秒ごとにデータを更新
    const interval = setInterval(fetchDailyUsage, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    dailyUsage,
    isLoading,
    error,
    remainingBudget: DAILY_USAGE_LIMIT - dailyUsage.total_cost,
    refetch: fetchDailyUsage,
  };
}
