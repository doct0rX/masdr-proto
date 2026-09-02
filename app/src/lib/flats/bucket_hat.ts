import type { DerivedHatGeometry } from "@/lib/geometry/bucket_hat";

/**
 * Parametric technical flats for a bucket hat. Units in the viewBox are mm, so
 * the drawing is dimension-true to the base-size POM values. Each POM callout is
 * a <g id="pom-X"> so renderers and validators can find them.
 */

export interface FlatViewOut {
  id: string;
  title_en: string;
  title_ar: string;
  svg: string;
  pom_codes: string[];
}

const STROKE = "#232B32";
const THIN = "#6B7280";
const ACCENT = "#5F50BC";

function badge(x: number, y: number, code: string) {
  return `<g id="pom-${code}" class="pom"><circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="${ACCENT}" stroke-width="1.2"/><text x="${x}" y="${y + 3.2}" font-size="8.5" font-family="Inter, Arial, sans-serif" font-weight="700" fill="${ACCENT}" text-anchor="middle">${code}</text></g>`;
}

function dim(x1: number, y1: number, x2: number, y2: number, label: string, tx: number, ty: number, anchor = "middle") {
  return `<g class="dim"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="0.8" marker-start="url(#tick)" marker-end="url(#tick)"/><text x="${tx}" y="${ty}" font-size="7.5" font-family="Inter, Arial, sans-serif" fill="${ACCENT}" text-anchor="${anchor}">${label}</text></g>`;
}

const defs = `<defs><marker id="tick" viewBox="0 0 4 8" refX="2" refY="4" markerWidth="4" markerHeight="8" orient="auto"><line x1="2" y1="0" x2="2" y2="8" stroke="${ACCENT}" stroke-width="1"/></marker></defs>`;

export function bucketHatFlats(g: DerivedHatGeometry, baseCode = "M"): FlatViewOut[] {
  const m = g.perSize[baseCode];
  const scale = 10; // cm -> mm
  const B = m.B * scale;
  const C = m.C * scale;
  const D = m.D * scale;
  const G = m.G * scale;
  const rBand = (m.A / (2 * Math.PI)) * scale; // radius at crown/brim seam
  const rBrim = rBand + C;
  const rTip = D / 2;

  // ---------- Side elevation ----------
  {
    const W = rBrim * 2 + 150;
    const H = B + C + 90;
    const cx = W / 2;
    const top = 30;
    const tipY = top;
    const seamY = top + B;
    const brimY = seamY + C * 0.55; // brim drawn with a gentle downward flare
    const flare = C * 0.85;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Side elevation">${defs}
<rect width="${W}" height="${H}" fill="#fff"/>
<!-- crown tip -->
<path d="M ${cx - rTip} ${tipY} Q ${cx} ${tipY - 6} ${cx + rTip} ${tipY}" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
<!-- side band (tapered) -->
<path d="M ${cx - rTip} ${tipY} L ${cx - rBand} ${seamY} L ${cx + rBand} ${seamY} L ${cx + rTip} ${tipY} Z" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
<!-- tip edgestitch -->
<path d="M ${cx - rTip + 2} ${tipY + 2.5} L ${cx + rTip - 2} ${tipY + 2.5}" fill="none" stroke="${THIN}" stroke-width="0.7" stroke-dasharray="3 2"/>
<!-- side seam (one visible) with topstitch -->
<line x1="${cx + (rTip + rBand) / 2 * 0.98}" y1="${tipY + 1}" x2="${cx + rBand * 0.99}" y2="${seamY - 1}" stroke="${THIN}" stroke-width="0.8"/>
<!-- crown/brim seam -->
<line x1="${cx - rBand}" y1="${seamY}" x2="${cx + rBand}" y2="${seamY}" stroke="${STROKE}" stroke-width="1"/>
<!-- brim: flared band -->
<path d="M ${cx - rBand} ${seamY} L ${cx - rBrim} ${brimY + flare * 0.35} Q ${cx} ${brimY + flare} ${cx + rBrim} ${brimY + flare * 0.35} L ${cx + rBand} ${seamY} Q ${cx} ${seamY + flare * 0.45} ${cx - rBand} ${seamY} Z" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
<!-- single topstitch row on brim, G from edge -->
<path d="M ${cx - rBrim + G} ${brimY + flare * 0.35 - G * 0.2} Q ${cx} ${brimY + flare - G} ${cx + rBrim - G} ${brimY + flare * 0.35 - G * 0.2}" fill="none" stroke="${THIN}" stroke-width="0.8" stroke-dasharray="3 2"/>
<!-- dimensions -->
${dim(cx + rBrim + 18, tipY, cx + rBrim + 18, seamY, `B ${m.B} cm`, cx + rBrim + 22, (tipY + seamY) / 2 + 3, "start")}
${dim(cx + rBrim + 18, seamY, cx + rBrim + 18, brimY + flare * 0.35, `C ${m.C} cm`, cx + rBrim + 22, seamY + (brimY + flare * 0.35 - seamY) / 2 + 3, "start")}
${dim(cx - rTip, tipY - 14, cx + rTip, tipY - 14, `D ${m.D} cm`, cx, tipY - 18)}
${dim(cx - rBand, H - 22, cx + rBand, H - 22, `A/π = ${(m.A / Math.PI).toFixed(1)} cm (A = ${m.A} cm)`, cx, H - 26)}
${badge(cx - rTip - 14, tipY + 2, "D")}
${badge(cx - rBand - 14, seamY - 4, "A")}
${badge(cx + rBrim + 4, brimY + flare * 0.35 + 8, "C")}
${badge(cx, brimY + flare + 12, "G")}
${badge(cx + rBrim * 0.6, tipY + B * 0.5, "B")}
${dim(cx - rBrim - 18, tipY, cx - rBrim - 18, brimY + flare * 0.35, `E ${m.E} cm`, cx - rBrim - 22, (tipY + brimY + flare * 0.35) / 2 + 3, "end")}
${badge(cx - rBrim - 18, brimY + flare * 0.35 + 12, "E")}
<text x="8" y="${H - 6}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}">Side elevation · base size ${baseCode} · 1 unit = 1 mm · dashed = topstitch</text>
</svg>`;
    // eslint-disable-next-line no-var
    var side: FlatViewOut = { id: "side", title_en: "Side elevation", title_ar: "منظر جانبي", svg, pom_codes: ["A", "B", "C", "D", "E", "G"] };
  }

  // ---------- Top plan ----------
  const W2 = rBrim * 2 + 110;
  const H2 = rBrim * 2 + 90;
  const cx2 = W2 / 2 - 15;
  const cy2 = H2 / 2 + 12;
  const topSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" width="100%" role="img" aria-label="Top plan">${defs}
<rect width="${W2}" height="${H2}" fill="#fff"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBrim}" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBrim - G}" fill="none" stroke="${THIN}" stroke-width="0.8" stroke-dasharray="3 2"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBand}" fill="none" stroke="${STROKE}" stroke-width="1"/>
<circle cx="${cx2}" cy="${cy2}" r="${rTip}" fill="none" stroke="${STROKE}" stroke-width="1.2"/>
<circle cx="${cx2}" cy="${cy2}" r="${rTip - 2}" fill="none" stroke="${THIN}" stroke-width="0.7" stroke-dasharray="3 2"/>
<!-- side seams at 3 and 9 o'clock -->
<line x1="${cx2 - rBand}" y1="${cy2}" x2="${cx2 - rTip}" y2="${cy2}" stroke="${THIN}" stroke-width="0.8"/>
<line x1="${cx2 + rTip}" y1="${cy2}" x2="${cx2 + rBand}" y2="${cy2}" stroke="${THIN}" stroke-width="0.8"/>
<line x1="${cx2 - rBrim}" y1="${cy2}" x2="${cx2 - rBand}" y2="${cy2}" stroke="${THIN}" stroke-width="0.8"/>
<line x1="${cx2 + rBand}" y1="${cy2}" x2="${cx2 + rBrim}" y2="${cy2}" stroke="${THIN}" stroke-width="0.8"/>
<text x="${cx2}" y="${cy2 - rBrim - 6}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}" text-anchor="middle">CF</text>
<text x="${cx2}" y="${cy2 + rBrim + 12}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}" text-anchor="middle">CB</text>
${dim(cx2 - rTip, cy2 - rTip - 10, cx2 + rTip, cy2 - rTip - 10, `D ${m.D} cm`, cx2, cy2 - rTip - 14)}
${dim(cx2 + rBand, cy2 + 14, cx2 + rBrim, cy2 + 14, `C ${m.C}`, cx2 + rBand + C / 2, cy2 + 24)}
${badge(cx2 + rTip * 0.7, cy2 - rTip * 0.7, "D")}
${badge(cx2 + rBand * 0.72, cy2 + rBand * 0.72, "A")}
${badge(cx2 - rBrim * 0.72, cy2 - rBrim * 0.72, "F")}
${badge(cx2 + rBrim * 0.5, cy2 - rBrim * 0.5 - 4, "G")}
${badge(cx2 - rBand * 0.72, cy2 + rBand * 0.72, "H")}
${dim(cx2 - rBrim, cy2 - rBrim - 22, cx2 + rBrim, cy2 - rBrim - 22, `W ${m.W} cm (on head form)`, cx2, cy2 - rBrim - 26)}
${badge(cx2 - rBrim - 12, cy2 - rBrim - 22, "W")}
<text x="8" y="${H2 - 6}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}">Top plan · A = ${m.A} cm · F = ${m.F} cm · H = ${m.H} cm</text>
</svg>`;
  const top: FlatViewOut = { id: "top", title_en: "Top plan", title_ar: "منظر علوي", svg: topSvg, pom_codes: ["A", "D", "F", "G", "H", "W"] };

  // ---------- Underside ----------
  const underSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W2} ${H2}" width="100%" role="img" aria-label="Underside">${defs}
<rect width="${W2}" height="${H2}" fill="#fff"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBrim}" fill="none" stroke="${STROKE}" stroke-width="1.4"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBrim - G}" fill="none" stroke="${THIN}" stroke-width="0.8" stroke-dasharray="3 2"/>
<circle cx="${cx2}" cy="${cy2}" r="${rBand}" fill="none" stroke="${STROKE}" stroke-width="1"/>
<!-- crown opening shading -->
<circle cx="${cx2}" cy="${cy2}" r="${rBand - 3}" fill="#F1F4F6" stroke="none"/>
<!-- brand/care label on band at CB, J below tip seam -->
${badge(cx2 + 22, cy2 + rBand - 16, "J")}
<rect x="${cx2 - 12}" y="${cy2 + rBand - 22}" width="24" height="14" fill="#fff" stroke="${STROKE}" stroke-width="0.9"/>
<text x="${cx2}" y="${cy2 + rBand - 12.5}" font-size="6" font-family="Inter, Arial, sans-serif" fill="${STROKE}" text-anchor="middle">CARE</text>
<!-- loop label at CB seam -->
<rect x="${cx2 - 6}" y="${cy2 + rBand - 2}" width="12" height="6" fill="#fff" stroke="${ACCENT}" stroke-width="0.9"/>
<!-- turning gap closed by topstitch, at CB -->
<line x1="${cx2 - 35}" y1="${cy2 + rBrim - G}" x2="${cx2 + 35}" y2="${cy2 + rBrim - G}" stroke="${ACCENT}" stroke-width="1.6"/>
<text x="${cx2}" y="${cy2 + rBrim - G - 5}" font-size="6.5" font-family="Inter, Arial, sans-serif" fill="${ACCENT}" text-anchor="middle">turning gap 8 cm at CB, closed by the topstitch row</text>
<!-- stitch-in-ditch full round in crown/brim seam -->
<circle cx="${cx2}" cy="${cy2}" r="${rBand}" fill="none" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="2 2"/>
<line x1="${cx2}" y1="${cy2 - rBand - 8}" x2="${cx2}" y2="${cy2 - rBand + 8}" stroke="${ACCENT}" stroke-width="1.4"/>
<line x1="${cx2 - rBand - 8}" y1="${cy2}" x2="${cx2 - rBand + 8}" y2="${cy2}" stroke="${ACCENT}" stroke-width="1.4"/>
<line x1="${cx2 + rBand - 8}" y1="${cy2}" x2="${cx2 + rBand + 8}" y2="${cy2}" stroke="${ACCENT}" stroke-width="1.4"/>
<text x="${cx2}" y="${cy2 + rBrim + 12}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}" text-anchor="middle">CB</text>
${badge(cx2 + rBand * 0.72, cy2 - rBand * 0.72, "A")}
${badge(cx2 + rBrim * 0.72, cy2 + rBrim * 0.72, "F")}
${badge(cx2 - rBrim * 0.5, cy2 - rBrim * 0.5 - 4, "G")}
<text x="8" y="${H2 - 6}" font-size="7" font-family="Inter, Arial, sans-serif" fill="${THIN}">Underside · care label on reverse shell · purple dashed = stitch-in-ditch · purple solid = closing row</text>
</svg>`;
  const under: FlatViewOut = { id: "underside", title_en: "Underside and label placement", title_ar: "المنظر السفلي وأماكن البطاقات", svg: underSvg, pom_codes: ["A", "F", "G", "J"] };

  return [side, top, under];
}
