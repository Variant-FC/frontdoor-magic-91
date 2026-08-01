import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function MalumeSays({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "ink";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-4",
        tone === "ink" ? "ink-panel" : "card-paper",
        className,
      )}
    >
      <img
        src={malumeAvatar.url}
        alt=""
        aria-hidden
        className="h-9 w-9 shrink-0 rounded-full bg-accent/20 object-cover object-center"
      />

      <div className="space-y-1">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] opacity-70">
          Malume says
        </p>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
