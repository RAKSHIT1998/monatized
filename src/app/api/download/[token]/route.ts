import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageDriver } from "@/lib/storage";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const grant = await db.downloadGrant.findUnique({
    where: { token },
    include: { digitalProductFile: true },
  });

  if (!grant) {
    return new NextResponse("This download link is invalid.", { status: 404 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return new NextResponse("This download link has expired.", { status: 410 });
  }
  if (grant.downloadsUsed >= grant.downloadLimit) {
    return new NextResponse("This download link has reached its download limit.", { status: 410 });
  }

  await db.downloadGrant.update({
    where: { id: grant.id },
    data: { downloadsUsed: { increment: 1 } },
  });

  const { digitalProductFile: file } = grant;
  const driver = getStorageDriver();

  const presignedUrl = await driver.getPresignedDownloadUrl(file.storageKey, {
    fileName: file.fileName,
    expiresInSeconds: 300,
  });
  if (presignedUrl) {
    return NextResponse.redirect(presignedUrl);
  }

  const { buffer } = await driver.read(file.storageKey);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Content-Length": String(file.fileSizeBytes),
    },
  });
}
