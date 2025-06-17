"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AUDIO_CONFIG, UI_CONFIG } from "@/lib/utils/constants";

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onFileSelect,
  isProcessing,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: `ファイルサイズが大きすぎます（上限: ${AUDIO_CONFIG.MAX_FILE_SIZE_MB}MB）`,
      });
      return false;
    }

    if (!AUDIO_CONFIG.SUPPORTED_FORMATS.includes(file.type as any)) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "対応していないファイル形式です",
      });
      return false;
    }

    return true;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(
      AUDIO_CONFIG.SUPPORTED_FORMATS.map((format) => [format, []])
    ),
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`
          relative
          min-h-[${UI_CONFIG.DROPZONE.MIN_HEIGHT}]
          rounded-lg
          border-2
          border-dashed
          transition-colors
          duration-${UI_CONFIG.ANIMATION.DURATION}
          ${UI_CONFIG.ANIMATION.TIMING}
          ${
            isDragActive
              ? `border-primary bg-primary/5`
              : "border-muted-foreground/25 hover:border-primary/50"
          }
          ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="file-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4"
              >
                <FileAudio className="w-12 h-12 text-primary" />
                <div>
                  <p className="text-lg font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                {!isProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    クリア
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4"
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive
                      ? "ここにファイルをドロップ"
                      : "音声ファイルをドラッグ＆ドロップ"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    または、クリックしてファイルを選択
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>対応形式: {AUDIO_CONFIG.SUPPORTED_FORMATS.join(", ")}</p>
                  <p>最大サイズ: {AUDIO_CONFIG.MAX_FILE_SIZE_MB}MB</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};
