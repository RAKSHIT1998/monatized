export type StoredFileHandle = {
  buffer: Buffer;
  contentType: string;
};

export interface StorageDriver {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  /**
   * Returns a short-lived redirect URL for this key, or null if the driver has
   * no such concept (e.g. local disk) — callers should stream the file themselves
   * via `read()` in that case.
   */
  getPresignedDownloadUrl(
    key: string,
    opts: { fileName: string; expiresInSeconds: number },
  ): Promise<string | null>;
  read(key: string): Promise<StoredFileHandle>;
  remove(key: string): Promise<void>;
}
