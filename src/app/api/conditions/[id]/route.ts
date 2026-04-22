import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { broadcast } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.condition.delete({ where: { id } });
  broadcast({ ts: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { value } = (await req.json()) as { value: number | null };
  const updated = await prisma.condition.update({ where: { id }, data: { value } });
  broadcast({ ts: Date.now() });
  return NextResponse.json(updated);
}
