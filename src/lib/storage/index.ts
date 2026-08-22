import "server-only";
import type { StorageDriver } from "./types";
import { LocalDiskDriver } from "./local-driver";
import { S3Driver } from "./s3-driver";

let driver: StorageDriver | undefined;

export function getStorageDriver(): StorageDriver {
  if (driver) return driver;
  driver = process.env.STORAGE_DRIVER === "s3" ? new S3Driver() : new LocalDiskDriver();
  return driver;
}

export function buildProductFileKey(creatorProfileId: string, productId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `products/${creatorProfileId}/${productId}/${Date.now()}-${safeName}`;
}

// Assets under "public/" are served without authentication by /api/assets/[...key] —
// never build a product-file key under this prefix.
export function buildPublicAssetKey(creatorProfileId: string, kind: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `public/${creatorProfileId}/${kind}-${Date.now()}-${safeName}`;
}

export function assetKeyToUrl(key: string) {
  return `/api/assets/${key}`;
}
