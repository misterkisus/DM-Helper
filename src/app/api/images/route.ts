import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";

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

export async function GET() {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await prisma.sceneImage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const rawName = (form.get("name") as string | null)?.trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 400 });

  const ext = EXT_BY_MIME[file.type] ?? path.extname(file.name) ?? ".bin";
  const fsName = `${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, fsName), buf);

  const created = await prisma.sceneImage.create({
    data: {
      name: rawName && rawName.length > 0 ? rawName : file.name.replace(/\.[^.]+$/, "") || "Без имени",
      path: `${PUBLIC_PREFIX}/${fsName}`,
      mimeType: file.type,
    },
  });
  return NextResponse.json(created);
}
