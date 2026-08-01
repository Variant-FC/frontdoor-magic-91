import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import malumeAvatar from "@/assets/malume-avatar.png.asset.json";


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
        "flex gap-4 rounded-lg p-5",
        tone === "ink" ? "ink-panel" : "card-paper",
        className,
      )}
    >
      <img
        src={malumeAvatar.url}
        alt=""
        aria-hidden
        className="h-12 w-12 shrink-0 rounded-full bg-accent/20 object-cover object-center"
      />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
          Malume says
        </p>
        <div className="text-base leading-relaxed">{children}</div>
      </div>
    </div>

  );
}
