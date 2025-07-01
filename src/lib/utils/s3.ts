import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../s3";

if (!process.env.S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME environment variable is not set");
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function generatePresignedUrl(
  fileName: string,
  contentType: string
): Promise<{
  uploadUrl: string;
  fileUrl: string;
}> {
  const key = `temp/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: "private",
  });

  // 署名付きURLを生成（有効期限10分）
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 600,
    signableHeaders: new Set(["content-type"]),
  });
  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
}

export async function deleteFromS3(url: string) {
  try {
    const key = url.split("/").pop();
    if (!key) throw new Error("Invalid S3 URL");

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `temp/${key}`,
      })
    );
  } catch (error) {
    console.error("Error deleting file from S3:", error);
  }
}
