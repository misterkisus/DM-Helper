import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { broadcast } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as {
    displayName?: string;
    initiative?: number;
    tiebreaker?: number;
    currentHp?: number | null;
    maxHp?: number | null;
    portraitPath?: string | null;
    hasActed?: boolean;
  };
  const updated = await prisma.combatant.update({
    where: { id },
    data: {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.initiative !== undefined ? { initiative: body.initiative } : {}),
      ...(body.tiebreaker !== undefined ? { tiebreaker: body.tiebreaker } : {}),
      ...(body.currentHp !== undefined ? { currentHp: body.currentHp } : {}),
      ...(body.maxHp !== undefined ? { maxHp: body.maxHp } : {}),
      ...(body.portraitPath !== undefined ? { portraitPath: body.portraitPath } : {}),
      ...(body.hasActed !== undefined ? { hasActed: body.hasActed } : {}),
    },
  });
  broadcast({ ts: Date.now() });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const target = await prisma.combatant.findUnique({
    where: { id },
    include: {
      encounter: {
        include: {
          combatants: {
            orderBy: [{ initiative: "desc" }, { tiebreaker: "desc" }, { order: "asc" }],
          },
        },
      },
    },
  });
  if (!target) return NextResponse.json({ ok: true });

  const order = target.encounter.combatants;
  const survivors = order.filter((c) => c.id !== id);
  const currentIdx = order.findIndex((c) => c.id === id);
  const nextActiveId =
    target.encounter.activeId === id && survivors.length
      ? survivors[Math.max(currentIdx, 0) % survivors.length]?.id ?? null
      : target.encounter.activeId;

  await prisma.$transaction([
    prisma.combatant.delete({ where: { id } }),
    prisma.encounter.update({
      where: { id: target.encounterId },
      data: {
        activeId: nextActiveId,
        status: survivors.length ? "running" : "idle",
        publishedAt: new Date(),
      },
    }),
  ]);
  broadcast({ ts: Date.now() });
  return NextResponse.json({ ok: true });
}
