"use client";

import * as React from "react";
import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { TranscriptionStatus } from "@/lib/types";

interface ProgressBarProps {
  status: TranscriptionStatus;
}

export function ProgressBar({ status }: ProgressBarProps) {
  return (
    <div className="w-full space-y-2">
      <Progress.Root
        className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
        style={{
          transform: "translateZ(0)",
        }}
        value={status.progress}
      >
        <Progress.Indicator
          className="h-full w-full bg-blue-500 transition-transform duration-500"
          style={{ transform: `translateX(-${100 - status.progress}%)` }}
        />
      </Progress.Root>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {status.message}
      </div>
    </div>
  );
}
