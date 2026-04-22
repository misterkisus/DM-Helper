import { NextResponse } from "next/server";
import { getCurrentEncounter } from "@/lib/encounter";

export async function GET() {
  const enc = await getCurrentEncounter();
  return NextResponse.json(enc);
}
