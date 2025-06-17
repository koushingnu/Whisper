"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Clock, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { TranscriptionResult as TranscriptionResultType } from "@/lib/types";

interface TranscriptionResultProps {
  result: TranscriptionResultType;
  onDownload: () => void;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  result,
  onDownload,
}) => {
  // 処理時間を計算
  const processingTime = useMemo(() => {
    const seconds = Math.floor((result.endTime - result.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, [result.startTime, result.endTime]);

  // コストを計算
  const totalCost = useMemo(() => {
    return (result.costs.whisper + result.costs.gpt).toFixed(3);
  }, [result.costs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* メタ情報 */}
      <Card className="w-full max-w-2xl mx-auto p-6">
        <div className="flex flex-wrap gap-6 justify-between items-center">
          <div className="flex items-center gap-6">
            {/* 処理時間 */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                処理時間: {processingTime}
              </span>
            </div>

            {/* コスト */}
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    コスト: ${totalCost}
                  </span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">コスト内訳</h4>
                  <div className="text-sm">
                    <p>Whisper API: ${result.costs.whisper.toFixed(3)}</p>
                    <p>GPT-4 API: ${result.costs.gpt.toFixed(3)}</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>

          {/* ダウンロードボタン */}
          <Button onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            ダウンロード
          </Button>
        </div>
      </Card>

      {/* 文字起こし結果 */}
      <Card className="w-full max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          {/* セグメント */}
          {result.segments.map((segment, index) => (
            <div
              key={index}
              className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
            >
              {/* タイムスタンプ */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </span>
                {segment.confidence && (
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="cursor-help">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm">
                        信頼度: {(segment.confidence * 100).toFixed(1)}%
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                )}
              </div>

              {/* テキスト */}
              <p className="text-base leading-relaxed">{segment.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

// 時間をフォーマット（mm:ss）
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
