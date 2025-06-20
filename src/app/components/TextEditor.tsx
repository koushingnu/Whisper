"use client";

import React, { useState } from "react";
import { TranscriptionResult } from "@/lib/types";

interface TextEditorProps {
  transcriptionResult: TranscriptionResult;
  onSave: (text: string) => void;
}

export function TextEditor({ transcriptionResult, onSave }: TextEditorProps) {
  const [editingText, setEditingText] = useState(transcriptionResult.text);

  const handleSave = () => {
    onSave(editingText);
  };

  return (
    <div className="space-y-4">
      <textarea
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        className="w-full h-64 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        保存
      </button>
    </div>
  );
}
