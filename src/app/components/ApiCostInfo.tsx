import React from "react";
import { calculateApiCosts, getRatesPerMinute } from "@/lib/utils/text";
import { useDailyUsage } from "@/lib/hooks/useDailyUsage";

interface ApiCostInfoProps {
  audioDuration?: number;
  className?: string;
  showActualCost?: boolean;
}

export default function ApiCostInfo({
  audioDuration,
  className = "",
  showActualCost = true,
}: ApiCostInfoProps) {
  const ratesPerMinute = getRatesPerMinute();
  const actualCosts = audioDuration ? calculateApiCosts(audioDuration) : null;
  const { remainingBudget } = useDailyUsage();

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <div className="font-medium text-gray-600 mb-2">
        API利用料金（1分あたり）
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Whisper API:</span>
          <span className="font-mono">
            ¥{ratesPerMinute.whisper.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>ChatGPT API (GPT-4):</span>
          <span className="font-mono">
            ¥{ratesPerMinute.chatgpt.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between font-medium border-t border-gray-100 pt-1 mt-1">
          <span>合計:</span>
          <span className="font-mono">¥{ratesPerMinute.total.toFixed(2)}</span>
        </div>
      </div>

      {showActualCost && actualCosts && (
        <>
          <div className="mt-4">
            <div className="font-medium text-gray-600 mb-2">予定利用料金</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Whisper API:</span>
                <span className="font-mono">
                  ¥{actualCosts.whisper.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ChatGPT API (GPT-4):</span>
                <span className="font-mono">
                  ¥{actualCosts.chatgpt.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-100 pt-1 mt-1">
                <span>合計:</span>
                <span className="font-mono">
                  ¥{actualCosts.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 利用制限の表示 */}
          {remainingBudget < actualCosts.total && (
            <div className="mt-2 text-red-500">
              ※ 予定利用料金が本日の残り利用可能額（¥
              {remainingBudget.toFixed(2)}）を超過します
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 実際の料金詳細を表示するコンポーネント
export function ActualCostInfo({ audioDuration }: { audioDuration: number }) {
  const actualCosts = calculateApiCosts(audioDuration);
  const durationMinutes = Math.ceil(audioDuration / 60);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="text-sm">
        <div className="font-medium text-gray-700 mb-4">今回の利用料金</div>
        <div className="space-y-3">
          <div className="text-xs text-gray-500">
            音声の長さ: {durationMinutes}分
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Whisper API:</span>
              <span className="font-mono text-gray-700">
                ¥{actualCosts.whisper.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ChatGPT API (GPT-4):</span>
              <span className="font-mono text-gray-700">
                ¥{actualCosts.chatgpt.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-medium text-gray-800">
              <span>合計:</span>
              <span className="font-mono">¥{actualCosts.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
