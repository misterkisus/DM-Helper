import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";

export async function GET() {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await prisma.character.findMany({ orderBy: [{ isPlayer: "desc" }, { name: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    name?: string;
    isPlayer?: boolean;
    defaultInitMod?: number;
    notes?: string | null;
  };
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const created = await prisma.character.create({
    data: {
      name: body.name.trim(),
      isPlayer: body.isPlayer ?? true,
      defaultInitMod: body.defaultInitMod ?? 0,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(created);
}
