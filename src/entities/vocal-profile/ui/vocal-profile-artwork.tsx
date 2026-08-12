import { cn } from "@/shared/lib/cn";
import { type VocalProfileArtworkAnalysis, vocalProfileArtworkTokens } from "../lib/artwork";

const FINE_GRAIN_TEXTURE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='4' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const COARSE_GRAIN_TEXTURE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.34' numOctaves='3' seed='19' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function VocalProfileArtwork({
  analysis,
  className,
  profileId,
}: {
  analysis?: Partial<VocalProfileArtworkAnalysis>;
  className?: string;
  profileId: string;
}) {
  const tokens = vocalProfileArtworkTokens(profileId, analysis);
  return (
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm", className)}
      data-profile-artwork={profileId}
      style={tokens}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-soft-light contrast-200"
        data-artwork-grain="fine"
        style={{ backgroundImage: `url("${FINE_GRAIN_TEXTURE}")`, backgroundSize: "5rem 5rem" }}
      />
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply contrast-150"
        data-artwork-grain="coarse"
        style={{ backgroundImage: `url("${COARSE_GRAIN_TEXTURE}")`, backgroundSize: "13rem 13rem" }}
      />
      <span
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        data-artwork-vignette="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 38% 30%, rgb(255 255 255 / .28), transparent 44%), linear-gradient(145deg, rgb(255 255 255 / .12), transparent 48%, rgb(0 0 0 / .2))",
        }}
      />
    </span>
  );
}
