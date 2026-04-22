import { isDm } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DmLayout({ children }: { children: React.ReactNode }) {
  if (!(await isDm())) redirect("/login");
  return <>{children}</>;
}
