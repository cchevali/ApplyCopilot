"use client";

import { useEffect, useRef, useTransition } from "react";

export function AutoPacket({ action }: { action: () => Promise<void> }) {
  const [, startTransition] = useTransition();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    startTransition(() => {
      action();
    });
  }, [action]);

  return (
    <div className="text-xs text-slate-500">Generating packet…</div>
  );
}
