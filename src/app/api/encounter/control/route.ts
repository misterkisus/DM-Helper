import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isDm } from "@/lib/auth";
import { getCurrentEncounter } from "@/lib/encounter";
import { broadcast } from "@/lib/events";

type Action =
  | { type: "publish" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "reset-round" }
  | { type: "clear" }
  | { type: "set-active"; combatantId: string }
  | { type: "rename"; name: string };

export async function POST(req: Request) {
  if (!(await isDm())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const action = (await req.json()) as Action;
  const enc = await getCurrentEncounter();

  switch (action.type) {
    case "publish": {
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { publishedAt: new Date(), status: enc.combatants.length ? "running" : "idle" },
      });
      break;
    }
    case "rename": {
      await prisma.encounter.update({ where: { id: enc.id }, data: { name: action.name } });
      break;
    }
    case "set-active": {
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { activeId: action.combatantId, status: "running", publishedAt: new Date() },
      });
      break;
    }
    case "next": {
      if (!enc.combatants.length) break;
      const order = enc.combatants;
      const currentIdx = order.findIndex((c) => c.id === enc.activeId);
      let nextIdx = currentIdx + 1;
      let round = enc.round;
      if (currentIdx >= 0) {
        await prisma.combatant.update({ where: { id: order[currentIdx].id }, data: { hasActed: true } });
      }
      if (nextIdx >= order.length) {
        nextIdx = 0;
        round += 1;
        await prisma.combatant.updateMany({ where: { encounterId: enc.id }, data: { hasActed: false } });
      }
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { activeId: order[nextIdx].id, round, status: "running", publishedAt: new Date() },
      });
      break;
    }
    case "prev": {
      if (!enc.combatants.length) break;
      const order = enc.combatants;
      const currentIdx = order.findIndex((c) => c.id === enc.activeId);
      let prevIdx = currentIdx - 1;
      let round = enc.round;
      if (prevIdx < 0) {
        prevIdx = order.length - 1;
        round = Math.max(1, round - 1);
      }
      await prisma.combatant.update({ where: { id: order[prevIdx].id }, data: { hasActed: false } });
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { activeId: order[prevIdx].id, round, publishedAt: new Date() },
      });
      break;
    }
    case "reset-round": {
      await prisma.combatant.updateMany({ where: { encounterId: enc.id }, data: { hasActed: false } });
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { round: 1, activeId: null, status: enc.combatants.length ? "running" : "idle" },
      });
      break;
    }
    case "clear": {
      await prisma.combatant.deleteMany({ where: { encounterId: enc.id } });
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { round: 1, activeId: null, status: "idle" },
      });
      break;
    }
  }

  broadcast({ ts: Date.now() });
  return NextResponse.json({ ok: true });
}
