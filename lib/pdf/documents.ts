import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { NumberToLetter } from "@mandarvl/convertir-nombre-lettre";

/**
 * Génération PDF des documents NOVASYS — équivalent des états WinDev
 * (ETAT_Proforma, ETAT_FACTURE, ETAT_Bon_de_livraison, ETAT_Bon_de_commande,
 * ETAT_Recu) et du générateur `lib/pdfGenerator.ts` d'easy_medical.
 *
 * L'entête (logo + EnteteSociete) et le pied de page (PiedPageSociete) sont
 * paramétrés dans la fiche Entreprise ; l'option `afficherEntete` permet
 * l'impression « sans entête » (papier pré-imprimé), comme dans easy_medical.
 */

const COLORS = {
  primary: "#B3201F",
  secondary: "#2B2D31",
  accent: "#5F6368",
  ink: "#3C4043",
  muted: "#6B6E72",
  line: "#E3E5E8",
  pale: "#F2F3F5",
};

const PAGE = { left: 50, right: 545, top: 50, bottom: 792 };

export interface EntreprisePdf {
  nomSociete?: string;
  adresseSociete?: string;
  telSociete?: string;
  faxSociete?: string;
  villeSociete?: string;
  emailSociete?: string;
  ncc?: string;
  logo?: string;
  enteteSociete?: string;
  piedDePage?: string;
  cachetDG?: string;
  logoPosition?: "gauche" | "droite" | "centre";
  enteteAlignement?: "gauche" | "centre" | "droite";
}

const ALIGN_PDF = { gauche: "left", centre: "center", droite: "right" } as const;

export interface LignePdf {
  reference?: string;
  articleM?: string;
  description?: string;
  quantite?: number;
  prixUnitaire?: number;
  prixTotalHT?: number;
}

export interface TiersPdf {
  label?: string;
  nom?: string;
  contact?: string;
  telephone?: string;
  mail?: string;
  adresse?: string;
  boitePostale?: string;
}

export interface TotauxPdf {
  totalHT?: number;
  remise?: number;
  mainDoeuvre?: number;
  totalTVA?: number;
  totalTTC?: number;
  totalPaye?: number;
  resteAPaye?: number;
}

export interface DonneesDocumentPdf {
  titre: string;
  numero: string;
  date?: Date | string;
  devise?: string;
  tiers?: TiersPdf;
  objet?: string;
  lignes: LignePdf[];
  totaux?: TotauxPdf;
  /** Bon de livraison : pas de colonnes de prix */
  sansPrix?: boolean;
  /** Arrêté en lettres sous le total (factures / reçus) */
  montantEnLettres?: number;
  /** Ligne libre sous le titre (ex. mode de règlement, banque, n° chèque) */
  complement?: string;
  signatureDroite?: string;
  signatureGauche?: string;
}

export interface OptionsPdf {
  afficherEntete?: boolean;
}

function formatNumber(n?: number): string {
  const rounded = Math.round(n || 0);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatAmount(n?: number, devise = "FCFA"): string {
  return `${formatNumber(n)} ${devise}`;
}

function amountInWords(amount: number): string {
  try {
    return `${NumberToLetter(Math.max(0, Math.round(amount || 0)))} Francs CFA`;
  } catch {
    return "";
  }
}

function fmtDate(d?: Date | string): string {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString("fr-FR");
}

/** Décoder le logo : data URI base64 → Buffer, chemin /public → fichier. */
function resolveLogo(logo?: string): Buffer | string | null {
  if (!logo) return null;
  const m = logo.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
  if (m) {
    try {
      return Buffer.from(m[2], "base64");
    } catch {
      return null;
    }
  }
  if (logo.startsWith("/")) {
    const p = path.join(process.cwd(), "public", logo);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Texte d'entête de secours construit depuis les champs de la fiche. */
function enteteFallback(e: EntreprisePdf): string[] {
  const lignes: string[] = [];
  const coord = [
    e.adresseSociete,
    e.villeSociete,
    e.telSociete ? `Tél : ${e.telSociete}` : null,
    e.faxSociete ? `Fax : ${e.faxSociete}` : null,
    e.emailSociete,
    e.ncc ? `NCC : ${e.ncc}` : null,
  ]
    .filter(Boolean)
    .join("  —  ");
  if (coord) lignes.push(coord);
  return lignes;
}

function stripHtml(s?: string): string {
  return (s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

export async function genererDocumentPdf(
  entreprise: EntreprisePdf | undefined | null,
  data: DonneesDocumentPdf,
  options: OptionsPdf = {}
): Promise<Buffer> {
  const afficherEntete = options.afficherEntete !== false;
  const devise = data.devise || "FCFA";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 45, bottom: 55, left: PAGE.left, right: 50 },
      bufferPages: true,
      displayTitle: true,
      info: {
        Title: `${data.titre} ${data.numero}`,
        Author: entreprise?.nomSociete || "NOVASYS",
        Creator: "NOVASYS",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = PAGE.right - PAGE.left;
    let y = PAGE.top;

    // ---------- Entête entreprise (paramétrable) ----------
    const logoPosition = entreprise?.logoPosition || "gauche";
    if (afficherEntete) {
      const logo = resolveLogo(entreprise?.logo || undefined);
      const align = ALIGN_PDF[entreprise?.enteteAlignement || "gauche"];
      const LOGO_W = 90;
      let textX = PAGE.left;
      let textW = W;
      let textY = 45;
      let logoBottom = 0;
      if (logo) {
        try {
          if (logoPosition === "centre") {
            doc.image(logo, PAGE.left + (W - LOGO_W) / 2, 38, { fit: [LOGO_W, 50], align: "center", valign: "center" });
            textY = 94;
            logoBottom = 88;
          } else if (logoPosition === "droite") {
            doc.image(logo, PAGE.right - LOGO_W, 42, { fit: [LOGO_W, 60], align: "right", valign: "center" });
            textW = W - LOGO_W - 10;
            logoBottom = 102;
          } else {
            doc.image(logo, PAGE.left, 42, { fit: [LOGO_W, 60], valign: "center" });
            textX = PAGE.left + LOGO_W + 10;
            textW = W - LOGO_W - 10;
            logoBottom = 102;
          }
        } catch {
          /* image illisible → texte seul */
        }
      }

      doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.primary)
        .text(entreprise?.nomSociete || "NOVASYS", textX, textY, { width: textW, align });

      const enteteTxt = stripHtml(entreprise?.enteteSociete);
      const lignesInfo = enteteTxt ? enteteTxt.split("\n") : enteteFallback(entreprise || {});
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted);
      lignesInfo.forEach((l, i) => {
        doc.text(l, textX, textY + 21 + i * 11, { width: textW, align, lineBreak: false });
      });

      y = Math.max(118, textY + 21 + lignesInfo.length * 11 + 14, logoBottom + 16);
      doc.moveTo(PAGE.left, y - 8).lineTo(PAGE.right, y - 8)
        .strokeColor(COLORS.secondary).lineWidth(1.2).stroke();
    } else {
      // Sans entête : on réserve la zone de l'entête (papier pré-imprimé)
      y = logoPosition === "centre" ? 150 : 118;
    }

    // ---------- Titre document ----------
    doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.primary)
      .text(data.titre.toUpperCase(), PAGE.left, y, { width: W, align: "center" });
    y += 22;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.accent)
      .text(`N° ${data.numero}`, PAGE.left, y, { width: W, align: "center" });
    y += 16;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink)
      .text(`Date : ${fmtDate(data.date)}${data.devise ? `    Devise : ${devise}` : ""}`, PAGE.left, y, {
        width: W,
        align: "center",
      });
    y += 24;

    // ---------- Tiers + objet ----------
    if (data.tiers || data.objet) {
      const boxTop = y;
      const hasObjet = !!data.objet;
      const half = hasObjet ? W / 2 - 8 : W;

      doc.roundedRect(PAGE.left, boxTop, half, 74, 4).strokeColor(COLORS.line).lineWidth(1).stroke();
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.secondary)
        .text((data.tiers?.label || "Client").toUpperCase(), PAGE.left + 10, boxTop + 8);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink)
        .text(data.tiers?.nom || "—", PAGE.left + 10, boxTop + 22, { width: half - 20 });
      doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted);
      let ty = boxTop + 38;
      const t = data.tiers;
      if (t?.contact) { doc.text(`Contact : ${t.contact}`, PAGE.left + 10, ty, { width: half - 20 }); ty += 11; }
      if (t?.telephone) { doc.text(`Tél. : ${t.telephone}`, PAGE.left + 10, ty, { width: half - 20 }); ty += 11; }
      if (t?.adresse || t?.boitePostale) {
        doc.text([t?.adresse, t?.boitePostale && `BP ${t.boitePostale}`].filter(Boolean).join(" — "),
          PAGE.left + 10, ty, { width: half - 20 });
      }

      if (hasObjet) {
        const ox = PAGE.left + half + 16;
        doc.roundedRect(ox, boxTop, half, 74, 4).strokeColor(COLORS.line).lineWidth(1).stroke();
        doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.secondary).text("OBJET", ox + 10, boxTop + 8);
        doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink)
          .text(data.objet || "", ox + 10, boxTop + 22, { width: half - 20, height: 46, ellipsis: true });
      }
      y = boxTop + 86;
    }

    // ---------- Tableau des lignes ----------
    const cols = data.sansPrix
      ? [
          { label: "#", w: 28, align: "center" as const },
          { label: "Référence", w: 100 },
          { label: "Désignation", w: 300 },
          { label: "Qté", w: 67, align: "right" as const },
        ]
      : [
          { label: "#", w: 28, align: "center" as const },
          { label: "Référence", w: 75 },
          { label: "Désignation", w: 180 },
          { label: "Qté", w: 45, align: "right" as const },
          { label: "P.U.", w: 77, align: "right" as const },
          { label: "Total HT", w: 90, align: "right" as const },
        ];

    const drawHeader = () => {
      doc.rect(PAGE.left, y, W, 18).fill(COLORS.primary);
      let x = PAGE.left;
      cols.forEach((c) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF")
          .text(c.label, x + 3, y + 5, { width: c.w - 6, align: c.align || "left", lineBreak: false });
        x += c.w;
      });
      y += 18;
    };

    const pageBreak = () => {
      doc.addPage();
      y = 60;
      drawHeader();
    };

    drawHeader();
    let alt = false;
    for (let i = 0; i < data.lignes.length; i++) {
      const l = data.lignes[i];
      const desc = l.articleM || l.description || "";
      const h = Math.max(18, doc.font("Helvetica").fontSize(8.5).heightOfString(desc, { width: cols[2].w - 6 }) + 8);
      if (y + h > 720) pageBreak();
      if (alt) doc.rect(PAGE.left, y, W, h).fill(COLORS.pale);
      const vals = data.sansPrix
        ? [String(i + 1), l.reference || "—", desc, String(l.quantite ?? 0)]
        : [
            String(i + 1),
            l.reference || "—",
            desc,
            String(l.quantite ?? 0),
            formatNumber(l.prixUnitaire),
            formatNumber(l.prixTotalHT ?? (l.quantite || 0) * (l.prixUnitaire || 0)),
          ];
      let x = PAGE.left;
      cols.forEach((c, ci) => {
        doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.ink)
          .text(vals[ci] || "", x + 3, y + 5, { width: c.w - 6, align: c.align || "left", lineBreak: ci === 2 });
        x += c.w;
      });
      doc.moveTo(PAGE.left, y + h).lineTo(PAGE.right, y + h)
        .strokeColor(COLORS.line).lineWidth(0.5).stroke();
      y += h;
      alt = !alt;
    }
    doc.moveTo(PAGE.left, y).lineTo(PAGE.right, y).strokeColor(COLORS.secondary).lineWidth(1).stroke();
    y += 14;

    // ---------- Totaux ----------
    const to = data.totaux || {};
    if (!data.sansPrix) {
      if (y > 660) pageBreak();
      const bx = PAGE.right - 230;
      const rows: [string, string, boolean?][] = [];
      if ((to.mainDoeuvre || 0) > 0) rows.push(["Dont main d'œuvre", formatAmount(to.mainDoeuvre, devise)]);
      rows.push(["Total HT", formatAmount(to.totalHT, devise)]);
      if ((to.remise || 0) > 0) {
        rows.push(["Remise", `- ${formatAmount(to.remise, devise)}`]);
        rows.push(["HT avec remise", formatAmount((to.totalHT || 0) - (to.remise || 0), devise)]);
      }
      rows.push(["TVA", formatAmount(to.totalTVA, devise)]);
      rows.push(["TOTAL TTC", formatAmount(to.totalTTC, devise), true]);
      if ((to.totalPaye || 0) > 0) rows.push(["Payé", formatAmount(to.totalPaye, devise)]);
      if ((to.resteAPaye || 0) > 0) rows.push(["Reste à payer", formatAmount(to.resteAPaye, devise), true]);

      rows.forEach(([label, val, strong]) => {
        doc
          .font(strong ? "Helvetica-Bold" : "Helvetica")
          .fontSize(strong ? 10 : 9)
          .fillColor(strong ? COLORS.primary : COLORS.ink)
          .text(label, bx, y, { width: 115 })
          .text(val, bx + 115, y, { width: 115, align: "right" });
        y += strong ? 17 : 14;
      });
    }

    if (data.complement) {
      y += 6;
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink);
      const h = doc.heightOfString(data.complement, { width: W });
      doc.text(data.complement, PAGE.left, y, { width: W });
      y += h + 4;
    }

    if (data.montantEnLettres !== undefined) {
      y += 10;
      doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(COLORS.ink)
        .text(`Arrêté(e) à la somme de : ${amountInWords(data.montantEnLettres)}`, PAGE.left, y, { width: W });
      y += 18;
    }

    // ---------- Signatures ----------
    y = Math.max(y + 30, doc.y + 20);
    if (y > 700) {
      doc.addPage();
      y = 120;
    }
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink)
      .text(data.signatureGauche || "Signature client", PAGE.left, y, { width: 200, align: "center" })
      .moveTo(PAGE.left, y + 40).lineTo(PAGE.left + 200, y + 40).strokeColor(COLORS.ink).lineWidth(0.6).stroke();
    doc
      .text(data.signatureDroite || "Cachet / Direction", PAGE.right - 200, y, { width: 200, align: "center" })
      .moveTo(PAGE.right - 200, y + 40).lineTo(PAGE.right, y + 40).strokeColor(COLORS.ink).lineWidth(0.6).stroke();

    const cachet = resolveLogo(entreprise?.cachetDG || undefined);
    if (cachet && afficherEntete) {
      try {
        doc.image(cachet, PAGE.right - 210, y - 10, { fit: [80, 60] });
      } catch {
        /* ignore */
      }
    }

    // ---------- Pied de page sur chaque page ----------
    const range = doc.bufferedPageRange();
    const pied = stripHtml(entreprise?.piedDePage) || "Merci de votre confiance";
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      if (afficherEntete) {
        doc.moveTo(PAGE.left, 762).lineTo(PAGE.right, 762)
          .strokeColor(COLORS.line).lineWidth(0.7).stroke();
        doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted)
          .text(pied, PAGE.left, 770, { width: W, align: "center", lineBreak: false });
      }
      doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted)
        .text(`${i + 1} / ${range.count}`, PAGE.right - 60, 770, {
          width: 60,
          align: "right",
          lineBreak: false,
        });
    }

    doc.end();
  });
}
