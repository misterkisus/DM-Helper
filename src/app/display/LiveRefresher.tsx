"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveRefresher() {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = () => router.refresh();
    es.onerror = () => {
      // browser auto-reconnects; nothing to do
    };
    return () => es.close();
  }, [router]);
  return null;
}
