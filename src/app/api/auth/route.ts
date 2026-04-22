import { NextResponse } from "next/server";
import { clearDmCookie, setDmCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key || key !== process.env.DM_KEY) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await setDmCookie(key);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearDmCookie();
  return NextResponse.json({ ok: true });
}
