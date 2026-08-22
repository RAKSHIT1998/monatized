import { NextRequest, NextResponse } from "next/server";
import { getStorageDriver } from "@/lib/storage";

// Serves only files stored under the "public/" key prefix (avatars, cover images).
// Digital product files live under "products/" and are never reachable here —
// they're only ever served through /api/download/[token] after grant verification.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: keyParts } = await params;
  const key = `public/${keyParts.join("/")}`;

  if (!/^public\/[a-zA-Z0-9._/-]+$/.test(key)) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const driver = getStorageDriver();
  const fileName = keyParts[keyParts.length - 1] ?? "file";

  const presignedUrl = await driver.getPresignedDownloadUrl(key, {
    fileName,
    expiresInSeconds: 3600,
  });
  if (presignedUrl) {
    return NextResponse.redirect(presignedUrl);
  }

  try {
    const { buffer, contentType } = await driver.read(key);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
}
