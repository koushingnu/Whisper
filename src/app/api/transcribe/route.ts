import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/s3";
import { Readable } from "stream";
import { Buffer } from "buffer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function downloadFileFromS3(
  bucket: string,
  key: string
): Promise<Buffer> {
  console.log("Downloading from S3:", { bucket, key });

  // ファイルが存在するか確認するための最大試行回数
  const maxAttempts = 5;
  const delayMs = 1000; // 1秒待機

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        throw new Error("Empty response from S3");
      }

      // ReadableStreamをBufferに変換
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error("S3 download error after all attempts:", error);
        throw new Error(
          `Failed to download file from S3: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Failed to download file after all attempts");
}

async function deleteFileFromS3(bucket: string, key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await s3Client.send(command);
    console.log("Successfully deleted file from S3:", { bucket, key });
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
}

export async function POST(request: NextRequest) {
  let fileUrl = "";
  let bucket = "";
  let key = "";

  try {
    const body = await request.json();
    if (!body.fileUrl) {
      return new Response(
        JSON.stringify({ error: "ファイルのURLが指定されていません" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    fileUrl = body.fileUrl;
    console.log("Processing file from S3:", fileUrl);

    // fileUrlからバケット名とキーを抽出
    const url = new URL(fileUrl);
    bucket = process.env.S3_BUCKET_NAME!;
    key = url.pathname.slice(1); // 先頭の'/'を削除

    console.log("Downloading file from S3");
    const audioData = await downloadFileFromS3(bucket, key);

    console.log("Sending request to Whisper API");
    // OpenAI APIにファイルを送信
    const response = await openai.audio.transcriptions.create({
      file: new File([audioData], "audio.mp3", { type: "audio/mpeg" }),
      model: "whisper-1",
      language: "ja",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // 一時ファイルを削除
    console.log("Deleting temporary file from S3");
    await deleteFileFromS3(bucket, key);

    console.log("Whisper API response received");
    // レスポンスからタイムスタンプ情報を抽出
    const segments = response.segments || [];
    const timestamps = segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
    }));

    console.log("Processing completed successfully");
    return new Response(
      JSON.stringify({
        text: response.text,
        timestamps: timestamps,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // エラー発生時は一時ファイルを削除
    if (fileUrl) {
      console.log("Deleting temporary file from S3 due to error");
      await deleteFileFromS3(bucket, key);
    }

    console.error("Whisper API error:", error);

    // OpenAIのエラーを適切に処理
    let errorMessage = "文字起こし処理中にエラーが発生しました";
    let statusCode = 500;

    if (error instanceof Error) {
      // クォータ制限エラーの処理
      if (error.message.includes("429") || error.message.includes("quota")) {
        errorMessage =
          "APIの利用制限に達しました。しばらく時間をおいて再度お試しください。";
        statusCode = 429;
      }

      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } else {
      console.error("Unknown error:", error);
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// OPTIONSリクエストのハンドラを追加
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
