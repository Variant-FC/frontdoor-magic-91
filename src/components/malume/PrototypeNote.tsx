import { Info } from "lucide-react";

export function PrototypeNote() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Educational prototype using synthetic data. No bank connection, no SARS submission, and
        nothing here is tax or accounting advice.
      </span>
    </p>
  );
}
