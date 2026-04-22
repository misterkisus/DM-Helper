import { cookies } from "next/headers";

const COOKIE = "dm_key";

export async function isDm(): Promise<boolean> {
  const expected = process.env.DM_KEY;
  if (!expected) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === expected;
}

export async function setDmCookie(value: string) {
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearDmCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
