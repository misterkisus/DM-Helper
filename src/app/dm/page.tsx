import { prisma } from "@/lib/db";
import { getCurrentEncounter } from "@/lib/encounter";
import { CONDITIONS } from "@/lib/conditions";
import DmClient from "./DmClient";

export const dynamic = "force-dynamic";

export default async function DmPage() {
  const [enc, characters] = await Promise.all([
    getCurrentEncounter(),
    prisma.character.findMany({ orderBy: [{ isPlayer: "desc" }, { name: "asc" }] }),
  ]);
  return <DmClient initialEncounter={enc} initialCharacters={characters} conditions={CONDITIONS} />;
}
