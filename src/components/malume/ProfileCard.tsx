import { useEffect, useState } from "react";
import { useMalume } from "@/lib/malume/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

/** Short, optional setup step — no accounts, no passwords (PRD §5). */
export function ProfileCard() {
  const { profile, profileReady, setProfile } = useMalume();
  const [editing, setEditing] = useState(false);
  const [owner, setOwner] = useState(profile.owner);
  const [business, setBusiness] = useState(profile.business);

  useEffect(() => {
    setOwner(profile.owner);
    setBusiness(profile.business);
  }, [profile.owner, profile.business]);

  const unset = profileReady && !profile.owner && !profile.business;
  const open = editing || unset;

  if (!open) {
    return (
      <div className="card-paper flex items-center gap-3 rounded-xl p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Your details
          </p>
          <p className="truncate text-sm">
            {profile.owner || "—"}
            {profile.business ? ` · ${profile.business}` : ""}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </Button>
      </div>
    );
  }

  return (
    <form
      className="card-paper space-y-3 rounded-xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setProfile({ owner: owner.trim(), business: business.trim() });
        setEditing(false);
      }}
    >
      <p className="text-sm font-semibold">Make this yours</p>
      <p className="text-xs text-muted-foreground">
        Just a name and a business name — no password, nothing verified. Stored on this device only.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="owner-name" className="text-xs">
            Your name
          </Label>
          <Input
            id="owner-name"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Thandi"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business-name" className="text-xs">
            Business name
          </Label>
          <Input
            id="business-name"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Thandi's Studio"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        {!unset ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
