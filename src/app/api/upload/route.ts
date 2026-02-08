//  ============================================================================
//  Image Upload API — POST /api/upload
//  Accepts multipart/form-data with a single "file" field.
//  Optimizes with sharp (resize + WebP), generates thumbnail.
//  Returns { url, thumbUrl }
//  ============================================================================

import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Max size: 10 MB (we'll compress it down)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max image dimension
const MAX_WIDTH = 1200;
const THUMB_WIDTH = 400;

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 uploads per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export async function POST(req: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  // Rate limit check
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: "Příliš mnoho nahrávání. Zkuste to za minutu." },
      { status: 429 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Soubor nebyl nahrán" },
        { status: 400 },
      );
    }

    // Validate type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Nepodporovaný formát. Povolené: JPG, PNG, WebP, GIF, AVIF" },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Soubor je příliš velký (max 10 MB)" },
        { status: 400 },
      );
    }

    // Ensure upload directory exists
    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const uniqueId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Optimize with sharp ──────────────────────────────────────────────
    const isGif = file.type === "image/gif";

    let mainBuffer: Buffer;
    let thumbBuffer: Buffer;

    if (isGif) {
      // Keep GIFs as-is (sharp can't animate), just resize if huge
      mainBuffer = await sharp(buffer, { animated: true })
        .resize(MAX_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
      thumbBuffer = await sharp(buffer)
        .resize(THUMB_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    } else {
      // Convert to WebP with quality optimization
      mainBuffer = await sharp(buffer)
        .resize(MAX_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      thumbBuffer = await sharp(buffer)
        .resize(THUMB_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();
    }

    const mainExt = isGif ? ".gif" : ".webp";
    const mainName = `${uniqueId}${mainExt}`;
    const thumbName = `thumb-${uniqueId}.webp`;

    await Promise.all([
      writeFile(path.join(uploadDir, mainName), mainBuffer),
      writeFile(path.join(uploadDir, thumbName), thumbBuffer),
    ]);

    return NextResponse.json({
      url: `/api/upload/${mainName}`,
      thumbUrl: `/api/upload/${thumbName}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Chyba při nahrávání souboru" },
      { status: 500 },
    );
  }
}
