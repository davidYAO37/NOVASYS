import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { Achat } from "@/models/achat";
import { Entreprise } from "@/models/entreprise";
import { getLicenceStatus } from "@/lib/licence";
import { filtreSaisie } from "@/lib/portee";

/**
 * Badges de notification du menu latéral : compteurs calculés à la volée
 * (proformas en attente, service achat, bons de commande non transférés,
 * émissions de chèque) plus l'état de la licence.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req, undefined, { licenceExempt: true });
  if (error) return error;

  await db();

  const entreprise = await Entreprise.findOne().lean();
  const status = getLicenceStatus(entreprise as any);

  const licence = status.isBlocked
    ? { niveau: "danger", texte: "!" }
    : status.daysUntilExpiration !== null && status.daysUntilExpiration <= 30
      ? {
          niveau: status.daysUntilExpiration <= 7 ? "danger" : "warning",
          texte: `J-${status.daysUntilExpiration}`,
        }
      : null;

  if (status.isBlocked) {
    return NextResponse.json({
      proformasAttente: 0,
      serviceAchat: 0,
      bonsCommande: 0,
      emissionCheque: 0,
      commandesRenvoyees: 0,
      bonsRenvoyes: 0,
      licence,
    });
  }

  const filtreUser = filtreSaisie(user);
  const [
    proformasAttente,
    serviceAchat,
    bonsCommande,
    emissionCheque,
    commandesRenvoyees,
    bonsRenvoyes,
  ] = await Promise.all([
    Commande.countDocuments({ serviceAchat: { $ne: true }, ...filtreUser }),
    Commande.countDocuments({
      serviceAchat: true,
      statutC: { $in: ["en_cours", "partielle"] },
      ...filtreUser,
    }),
    Achat.countDocuments({
      serviceComptable: { $ne: true },
      statutAchat: { $ne: "annule" },
    }),
    Achat.countDocuments({ serviceComptable: true, chequeEdite: { $ne: true } }),
    Commande.countDocuments({
      renvoyee: true,
      serviceAchat: { $ne: true },
      ...filtreUser,
    }),
    Achat.countDocuments({
      renvoyeCompta: true,
      serviceComptable: { $ne: true },
    }),
  ]);

  return NextResponse.json({
    proformasAttente,
    serviceAchat,
    bonsCommande,
    emissionCheque,
    commandesRenvoyees,
    bonsRenvoyes,
    licence,
  });
}
