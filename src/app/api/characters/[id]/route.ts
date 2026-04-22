import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    isPlayer?: boolean;
    defaultInitMod?: number;
    notes?: string | null;
  };
  const updated = await prisma.character.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.isPlayer !== undefined ? { isPlayer: body.isPlayer } : {}),
      ...(body.defaultInitMod !== undefined ? { defaultInitMod: body.defaultInitMod } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.character.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
