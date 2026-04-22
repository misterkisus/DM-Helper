import { prisma } from "./db";

export async function getCurrentEncounter() {
  let enc = await prisma.encounter.findFirst({
    where: { isCurrent: true },
    include: {
      combatants: {
        include: { conditions: true },
        orderBy: [{ initiative: "desc" }, { tiebreaker: "desc" }, { order: "asc" }],
      },
    },
  });
  if (!enc) {
    enc = await prisma.encounter.create({
      data: { isCurrent: true },
      include: {
        combatants: {
          include: { conditions: true },
          orderBy: [{ initiative: "desc" }, { tiebreaker: "desc" }, { order: "asc" }],
        },
      },
    });
  }
  return enc;
}

export type EncounterPayload = Awaited<ReturnType<typeof getCurrentEncounter>>;
