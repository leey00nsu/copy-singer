import { cn } from "@/shared/lib/cn";
import { vocalProfileArtworkTokens } from "../lib/artwork";

const GRAIN_TEXTURE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.82'/%3E%3C/svg%3E";

export function VocalProfileArtwork({ className, profileId }: { className?: string; profileId: string }) {
  const tokens = vocalProfileArtworkTokens(profileId);
  return (
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm", className)}
      data-profile-artwork={profileId}
      style={tokens}
    >
      <span
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ backgroundImage: `url("${GRAIN_TEXTURE}")`, backgroundSize: "8rem 8rem" }}
      />
      <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" />
    </span>
  );
}
