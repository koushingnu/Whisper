import React from "react";
import { useDailyUsage } from "@/lib/hooks/useDailyUsage";

export function DailyUsageInfo() {
  const { dailyUsage, remainingBudget, isLoading, error } = useDailyUsage();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // エラー時は表示しない（既存のUIに影響を与えない）
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="text-sm">
        <div className="font-medium text-gray-700 mb-4">本日の利用状況</div>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Whisper API:</span>
              <span className="font-mono text-gray-700">
                ¥{dailyUsage.total_whisper_cost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ChatGPT API:</span>
              <span className="font-mono text-gray-700">
                ¥{dailyUsage.total_chatgpt_cost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-medium text-gray-800">
              <span>合計:</span>
              <span className="font-mono">
                ¥{dailyUsage.total_cost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 残り利用可能額 */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">残り利用可能額:</span>
              <span className="font-mono font-medium text-gray-800">
                ¥{remainingBudget.toFixed(2)}
              </span>
            </div>
            {/* プログレスバー */}
            <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((dailyUsage.total_cost / 100) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
