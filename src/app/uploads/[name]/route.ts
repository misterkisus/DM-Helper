import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function safeUploadName(name: string) {
  return !name.includes("..") && !name.includes("/") && !name.includes("\\");
}

function contentType(name: string) {
  return MIME_BY_EXT[path.extname(name).toLowerCase()] ?? "application/octet-stream";
}

export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  if (!safeUploadName(name)) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const file = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=2592000",
        "Content-Type": contentType(name),
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function HEAD(_req: Request, { params }: Ctx) {
  const { name } = await params;
  if (!safeUploadName(name)) return new Response(null, { status: 404 });

  try {
    const info = await stat(path.join(UPLOAD_DIR, name));
    return new Response(null, {
      headers: {
        "Cache-Control": "public, max-age=2592000",
        "Content-Length": String(info.size),
        "Content-Type": contentType(name),
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
