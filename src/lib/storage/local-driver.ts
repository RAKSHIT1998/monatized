import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";
import { mimeFromExtension } from "./mime";

// Dev-only: stores uploads on local disk under ./storage. Never use in production —
// files won't survive a redeploy and aren't shared across instances.
const STORAGE_ROOT = path.join(process.cwd(), "storage");

function resolveKeyPath(key: string) {
  const resolved = path.join(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export class LocalDiskDriver implements StorageDriver {
  async upload(key: string, data: Buffer) {
    const filePath = resolveKeyPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async getPresignedDownloadUrl() {
    return null;
  }

  async read(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const buffer = await readFile(resolveKeyPath(key));
    return { buffer, contentType: mimeFromExtension(key) };
  }

  async remove(key: string) {
    await unlink(resolveKeyPath(key)).catch(() => undefined);
  }
}
