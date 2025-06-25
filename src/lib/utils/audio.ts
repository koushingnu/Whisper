/**
 * 音声ファイルをS3にアップロードするための署名付きURLを取得
 */
export async function getAudioUploadUrl(file: File): Promise<{
  uploadUrl: string;
  fileUrl: string;
}> {
  const timestamp = Date.now();
  const fileName = encodeURIComponent(`${timestamp}-${file.name}`);
  const key = `temp/${fileName}`;

  const response = await fetch("/api/audio-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: fileName,
      fileType: file.type,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get upload URL");
  }

  const { uploadUrl, fileUrl } = await response.json();
  return { uploadUrl, fileUrl };
}

/**
 * 署名付きURLを使用して音声ファイルをS3にアップロード
 */
export async function uploadAudioToS3(
  file: File,
  uploadUrl: string
): Promise<void> {
  // アップロードを試行
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to upload file to S3");
  }

  // アップロード完了を確認（最大3回試行）
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1秒待機
    try {
      const checkResponse = await fetch("/api/check-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl: uploadUrl.split("?")[0] }),
      });

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json();
        if (exists) {
          console.log("File upload confirmed");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking file existence:", error);
    }
  }

  throw new Error("Failed to confirm file upload");
}

/**
 * 音声ファイルのMIMEタイプをチェック
 */
export function isValidAudioFile(file: File): boolean {
  const validTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/x-m4a",
    "audio/aac",
  ];
  return validTypes.includes(file.type);
}

/**
 * ファイルサイズをチェック（25MB以下）
 */
export function isValidFileSize(file: File): boolean {
  const maxSize = 25 * 1024 * 1024; // 25MB
  return file.size <= maxSize;
}
