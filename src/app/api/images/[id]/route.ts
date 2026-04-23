import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { broadcast } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { name?: string };
  const updated = await prisma.sceneImage.update({
    where: { id },
    data: { ...(body.name !== undefined ? { name: body.name.trim() || "Без имени" } : {}) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const img = await prisma.sceneImage.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ ok: true });

  await prisma.encounter.updateMany({
    where: { activeImageId: id },
    data: { activeImageId: null },
  });
  await prisma.sceneImage.delete({ where: { id } });

  const fsName = img.path.replace(/^\/uploads\//, "");
  if (fsName && !fsName.includes("..") && !fsName.includes("/") && !fsName.includes("\\")) {
    const fullPath = path.join(UPLOAD_DIR, fsName);
    try {
      await unlink(fullPath);
    } catch {
      // silent: file may already be gone
    }
  }

  broadcast({ ts: Date.now() });
  return NextResponse.json({ ok: true });
}
