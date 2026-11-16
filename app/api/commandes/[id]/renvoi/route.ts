import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Commande } from "@/models/commande";
import { achatsActifs } from "@/lib/commandeAchat";
import { peutVoirSaisie } from "@/lib/portee";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Renvoyer un devis reçu au commercial sans le traiter (motif obligatoire).
 * Inverse du transfert : le devis repasse en brouillon non envoyé.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "achat"]);
  if (error) return error;
  await db();

  const data = await req.json().catch(() => ({}));
  const motif = (data.motif || "").trim();
  if (!motif) {
    return NextResponse.json(
      { message: "Le motif du renvoi est obligatoire" },
      { status: 400 }
    );
  }

  const { id } = await ctx.params;
  const commande = await Commande.findById(id);
  if (!commande || !peutVoirSaisie(user, commande)) {
    return NextResponse.json({ message: "Commande introuvable" }, { status: 404 });
  }
  if (!commande.serviceAchat) {
    return NextResponse.json(
      { message: "Cette commande n'est pas transférée au service achat" },
      { status: 409 }
    );
  }
  if (commande.statutC !== "en_cours") {
    return NextResponse.json(
      { message: "Seul un devis en cours peut être renvoyé" },
      { status: 409 }
    );
  }
  if (commande.clotureManuelle) {
    return NextResponse.json(
      { message: "Ce devis est clôturé : rouvrez-le avant de le renvoyer" },
      { status: 409 }
    );
  }
  const achats = await achatsActifs(commande._id);
  if (achats.length) {
    return NextResponse.json(
      { message: "Des bons de commande existent déjà pour ce devis" },
      { status: 409 }
    );
  }

  commande.serviceAchat = false;
  commande.statutC = "brouillon";
  commande.envoyeAchatPar = undefined;
  commande.envoyeLe = undefined;
  commande.renvoyee = true;
  commande.motifRenvoi = motif;
  commande.renvoyeLe = new Date();
  commande.renvoyePar = `${user.nom} ${user.prenom}`.trim();
  await commande.save();

  return NextResponse.json(commande);
}
