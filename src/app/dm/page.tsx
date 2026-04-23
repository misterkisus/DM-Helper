import { prisma } from "@/lib/db";
import { getCurrentEncounter } from "@/lib/encounter";
import { CONDITIONS } from "@/lib/conditions";
import { SKILLS, SIMPLE_DCS, DC_ADJUSTMENTS, RARITY_ADJUSTMENTS, LEVEL_DCS } from "@/lib/skills";
import DmClient from "./DmClient";

export const dynamic = "force-dynamic";

export default async function DmPage() {
  const [enc, characters] = await Promise.all([
    getCurrentEncounter(),
    prisma.character.findMany({ orderBy: [{ isPlayer: "desc" }, { name: "asc" }] }),
  ]);
  return (
    <DmClient
      initialEncounter={enc}
      initialCharacters={characters}
      conditions={CONDITIONS}
      skills={SKILLS}
      simpleDcs={SIMPLE_DCS}
      dcAdjustments={DC_ADJUSTMENTS}
      rarityAdjustments={RARITY_ADJUSTMENTS}
      levelDcs={LEVEL_DCS}
    />
  );
}
