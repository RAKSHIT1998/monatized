import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "./types";

export class S3Driver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = requireEnv("S3_BUCKET");
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }

  async upload(key: string, data: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async getPresignedDownloadUrl(
    key: string,
    opts: { fileName: string; expiresInSeconds: number },
  ) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${opts.fileName}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: opts.expiresInSeconds });
  }

  async read(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const buffer = Buffer.from(await result.Body!.transformToByteArray());
    return { buffer, contentType: result.ContentType ?? "application/octet-stream" };
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required for STORAGE_DRIVER=s3.`);
  return value;
}
