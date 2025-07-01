"use client";

import { useState } from "react";

interface S3TestResult {
  success?: boolean;
  uploadUrl?: string;
  fileUrl?: string;
  envCheck?: {
    bucket: string | undefined;
    region: string | undefined;
    hasAccessKey: boolean;
    hasSecretKey: boolean;
  };
  uploadSuccess?: boolean;
  uploadStatus?: number;
  fileExists?: boolean;
  fileCheckError?: string;
}

export default function TestS3Page() {
  const [result, setResult] = useState<S3TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testS3Connection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Testing S3 connection...");
      const response = await fetch("/api/test-s3", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);
      setResult(data);
    } catch (err) {
      console.error("Error in testS3Connection:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const testFileUpload = async () => {
    if (!result?.uploadUrl) {
      setError("先にS3接続テストを実行してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log("Starting file upload test...");
      // テスト用のテキストファイルを作成
      const testContent = new Blob(["This is a test file"], {
        type: "text/plain",
      });

      console.log("Uploading to URL:", result.uploadUrl);

      // 署名付きURLを使用してアップロード
      const uploadResponse = await fetch(result.uploadUrl, {
        method: "PUT",
        body: testContent,
        headers: {
          "Content-Type": "text/plain",
        },
      });

      console.log("Upload response:", uploadResponse);
      console.log("Upload status:", uploadResponse.status);

      if (!uploadResponse.ok) {
        let errorMessage = `Upload failed with status: ${uploadResponse.status}`;
        try {
          const errorText = await uploadResponse.text();
          console.error("Upload error response:", errorText);
          errorMessage += ` - ${errorText}`;
        } catch (e) {
          console.error("Could not read error response:", e);
        }
        throw new Error(errorMessage);
      }

      // アップロード成功後、ファイルの存在を確認
      try {
        if (!result.fileUrl) {
          throw new Error("File URL is undefined");
        }
        const checkResponse = await fetch(result.fileUrl, { method: "HEAD" });
        console.log("File check status:", checkResponse.status);

        setResult({
          ...result,
          uploadSuccess: true,
          uploadStatus: uploadResponse.status,
          fileExists: checkResponse.ok,
          fileUrl: result.fileUrl,
        });
      } catch (checkError) {
        console.warn("File check failed:", checkError);
        // ファイルチェックの失敗はエラーとして扱わない
        setResult({
          ...result,
          uploadSuccess: true,
          uploadStatus: uploadResponse.status,
          fileCheckError: "ファイルの確認に失敗しました",
        });
      }
    } catch (err) {
      console.error("Error in testFileUpload:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">S3 Connection Test</h1>

      <div className="space-x-4 mb-4">
        <button
          onClick={testS3Connection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Test S3 Connection"}
        </button>

        <button
          onClick={testFileUpload}
          disabled={isLoading || !result?.uploadUrl}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? "Uploading..." : "Test File Upload"}
        </button>
      </div>

      {isLoading && (
        <div className="mb-4 text-blue-600">
          処理中... ブラウザのコンソールで詳細を確認できます
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">エラーが発生しました：</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">結果：</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          {result.uploadSuccess && result.fileUrl && (
            <div className="mt-4">
              <p className="font-semibold">アップロードされたファイル：</p>
              <a
                href={result.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                {result.fileUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
