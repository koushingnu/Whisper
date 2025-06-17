"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProcessingStatus } from "@/lib/types";

interface TranscriptionProgressProps {
  status: ProcessingStatus;
  onCancel: () => void;
}

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({
  status,
  onCancel,
}) => {
  // ステージに応じたメッセージを取得
  const stageMessage = useMemo(() => {
    switch (status.stage) {
      case "INITIALIZATION":
        return "初期化中...";
      case "WHISPER":
        return "文字起こし中...";
      case "GPT":
        return "テキスト整形中...";
      case "POST_PROCESSING":
        return "後処理中...";
      default:
        return "処理中...";
    }
  }, [status.stage]);

  // 進捗メッセージを生成
  const progressMessage = useMemo(() => {
    if (status.currentChunk !== undefined && status.totalChunks) {
      return `${status.currentChunk}/${status.totalChunks} チャンク処理完了`;
    }
    return null;
  }, [status.currentChunk, status.totalChunks]);

  // 経過時間を計算
  const elapsedTime = useMemo(() => {
    const seconds = Math.floor((Date.now() - status.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, [status.startTime]);

  // 進捗バーのアニメーション
  useEffect(() => {
    // プログレスバーのスムーズなアニメーション用のコード
  }, [status.progress]);

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* ステータスヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5 text-primary" />
            </motion.div>
            <h3 className="text-lg font-medium">{stageMessage}</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-destructive hover:text-destructive"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
        </div>

        {/* プログレスバー */}
        <div className="space-y-2">
          <Progress value={status.progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(status.progress)}%</span>
            <span>経過時間: {elapsedTime}</span>
          </div>
        </div>

        {/* 追加情報 */}
        {progressMessage && (
          <p className="text-sm text-center text-muted-foreground">
            {progressMessage}
          </p>
        )}

        {/* エラー表示 */}
        {status.error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <p className="font-medium">エラーが発生しました</p>
            <p>{status.error.message}</p>
            {status.error.retryCount !== undefined && (
              <p>リトライ回数: {status.error.retryCount}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
