import { getCurrentEncounter } from "@/lib/encounter";
import DisplayClient from "./DisplayClient";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const encounter = await getCurrentEncounter();
  return <DisplayClient initialEncounter={encounter} />;
}
