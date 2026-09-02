import type { TechPack } from "@/lib/techpack/schema";

export function exportFileName(pack: TechPack, ext: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase() || "MASDR";
  const ver = pack.meta.version.replace(".", "-");
  return `${clean(pack.header.brand)}-${clean(pack.header.style_number)}_TP_v${ver}_${pack.header.date}.${ext}`;
}
