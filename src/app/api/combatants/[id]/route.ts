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
      ...(body.hasActed !== undefined ? { hasActed: body.hasActed } : {}),
    },
  });
  broadcast({ ts: Date.now() });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.combatant.delete({ where: { id } });
  broadcast({ ts: Date.now() });
  return NextResponse.json({ ok: true });
}
