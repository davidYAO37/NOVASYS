import { User } from "@/models/users.model";
import { Commande } from "@/models/commande";

/**
 * N° PROFORMA WinDev : format AAMMJJ/NOVA/<CODE>-n — date du jour, NOVA
 * constant, <CODE> = code de l'utilisateur (codeProforma, sinon défaut par
 * profil), n = compteur quotidien par code.
 */
const CODES_PAR_TYPE: Record<string, string> = {
  commercial: "COM",
  comptable: "COMPT",
  achat: "ACH",
  caisse: "CAIS",
  admin: "ADM",
  adminsuper: "ADM",
};

export function codeProformaEffectif(user: { codeProforma?: string; type?: string }): string {
  const code = (user.codeProforma || "").trim().toUpperCase();
  if (code) return code;
  return CODES_PAR_TYPE[user.type || ""] || "COM";
}

export async function prochainNumeroProforma(currentUser: {
  _id?: string;
  type?: string;
}): Promise<string> {
  let code = CODES_PAR_TYPE[currentUser.type || ""] || "COM";
  if (currentUser._id) {
    const u = await User.findById(currentUser._id).select("codeProforma type").lean();
    if (u) code = codeProformaEffectif(u as any);
  }

  const d = new Date();
  const aammjj =
    String(d.getFullYear()).slice(-2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const prefixe = `${aammjj}/NOVA/${code}-`;

  const prefixeEchappe = prefixe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existants = await Commande.find({ numComm: new RegExp(`^${prefixeEchappe}`) })
    .select("numComm")
    .lean();
  let max = 0;
  for (const c of existants) {
    const m = String(c.numComm).match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefixe}${max + 1}`;
}
