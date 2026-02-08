//  ============================================================================
//  Image Serving API — GET /api/upload/[filename]
//  Serves uploaded images from the uploads directory with caching headers.
//  ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Security: prevent directory traversal
  const sanitized = path.basename(filename);
  if (sanitized !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Neplatný soubor" }, { status: 400 });
  }

  const filePath = path.join(getUploadDir(), sanitized);

  try {
    // Check file exists
    await stat(filePath);

    // Read file
    const buffer = await readFile(filePath);
    const ext = path.extname(sanitized).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Soubor nenalezen" }, { status: 404 });
  }
}
