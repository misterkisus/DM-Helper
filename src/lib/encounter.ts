import { prisma } from "./db";

export async function getCurrentEncounter() {
  let enc = await prisma.encounter.findFirst({
    where: { isCurrent: true },
    include: {
      combatants: {
        include: { conditions: true },
        orderBy: [{ initiative: "desc" }, { isPlayer: "asc" }, { tiebreaker: "desc" }, { order: "asc" }],
      },
    },
  });
  if (!enc) {
    enc = await prisma.encounter.create({
      data: { isCurrent: true },
      include: {
        combatants: {
          include: { conditions: true },
          orderBy: [{ initiative: "desc" }, { isPlayer: "asc" }, { tiebreaker: "desc" }, { order: "asc" }],
        },
      },
    });
  }
  const activeImage = enc.activeImageId
    ? await prisma.sceneImage.findUnique({ where: { id: enc.activeImageId } })
    : null;
  return { ...enc, activeImage };
}

export type EncounterPayload = Awaited<ReturnType<typeof getCurrentEncounter>>;
