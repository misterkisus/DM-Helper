import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { getCurrentEncounter } from "@/lib/encounter";
import { broadcast } from "@/lib/events";

export async function POST(req: Request) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as {
    characterId?: string | null;
    displayName?: string;
    isPlayer?: boolean;
    initiative?: number;
    maxHp?: number | null;
    portraitPath?: string | null;
    count?: number;
  };

  const enc = await getCurrentEncounter();

  let displayName = body.displayName?.trim() || "";
  let isPlayer = body.isPlayer ?? false;
  let portraitPath = body.portraitPath ?? null;
  let maxHp = body.maxHp ?? null;
  if (body.characterId) {
    const ch = await prisma.character.findUnique({ where: { id: body.characterId } });
    if (!ch) return NextResponse.json({ error: "character not found" }, { status: 404 });
    if (!displayName) displayName = ch.name;
    isPlayer = ch.isPlayer;
    portraitPath = portraitPath ?? ch.portraitPath ?? null;
    maxHp = maxHp ?? ch.defaultHp ?? null;
  }
  if (!displayName) return NextResponse.json({ error: "name required" }, { status: 400 });
  const count = Math.max(1, Math.min(50, Math.floor(body.count ?? 1)));

  const last = await prisma.combatant.findFirst({
    where: { encounterId: enc.id },
    orderBy: { order: "desc" },
  });
  const baseOrder = last?.order ?? 0;
  const created = await prisma.$transaction(
    Array.from({ length: count }, (_, i) =>
      prisma.combatant.create({
        data: {
          encounterId: enc.id,
          characterId: body.characterId ?? null,
          displayName: count > 1 ? `${displayName} ${i + 1}` : displayName,
          isPlayer,
          initiative: body.initiative ?? 0,
          maxHp,
          currentHp: maxHp,
          portraitPath,
          order: baseOrder + i + 1,
        },
      }),
    ),
  );
  broadcast({ ts: Date.now() });
  return NextResponse.json(count === 1 ? created[0] : created);
}
