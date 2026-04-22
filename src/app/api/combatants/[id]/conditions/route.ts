import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { CONDITION_BY_SLUG } from "@/lib/conditions";
import { broadcast } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { slug, value } = (await req.json()) as { slug: string; value?: number | null };
  const def = CONDITION_BY_SLUG[slug];
  if (!def) return NextResponse.json({ error: "unknown condition" }, { status: 400 });

  const existing = await prisma.condition.findFirst({ where: { combatantId: id, slug } });
  if (existing) {
    const updated = await prisma.condition.update({
      where: { id: existing.id },
      data: { value: def.hasValue ? value ?? 1 : null },
    });
    broadcast({ ts: Date.now() });
    return NextResponse.json(updated);
  }
  const created = await prisma.condition.create({
    data: { combatantId: id, slug, value: def.hasValue ? value ?? 1 : null },
  });
  broadcast({ ts: Date.now() });
  return NextResponse.json(created);
}
