import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDm } from "@/lib/auth";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    "type" in value
  );
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

function uploadFailure(error: unknown) {
  const code = getErrorCode(error);
  console.error("[api/uploads] upload failed", error);

  if (code === "EACCES" || code === "EPERM") {
    return NextResponse.json(
      {
        error: "Нет прав на запись в папку загрузок",
        code,
        hint: `Проверь владельца и права на ${UPLOAD_DIR}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Не удалось загрузить картинку",
      ...(code ? { code } : {}),
    },
    { status: 500 },
  );
}

export async function POST(req: Request) {
  try {
    if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const form = await req.formData();
    const file = form.get("file");

    if (!isUploadedFile(file)) return NextResponse.json({ error: "file required" }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "unsupported type" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 400 });

    const ext = EXT_BY_MIME[file.type] ?? path.extname(file.name) ?? ".bin";
    const fsName = `${randomUUID()}${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, fsName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      path: `${PUBLIC_PREFIX}/${fsName}`,
      name: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error) {
    return uploadFailure(error);
  }
}
