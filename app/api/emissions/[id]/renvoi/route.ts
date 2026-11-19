import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { ReglementFournisseur } from "@/models/reglementFournisseur";
import { Achat } from "@/models/achat";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Renvoyer une émission de chèque pas encore décaissée au service achat
 * (motif obligatoire) : les bons redeviennent modifiables et réémissibles.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth(req, ["admin", "comptable"], {
    actions: ["renvoi_emission"],
  });
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
  const emission = await ReglementFournisseur.findById(id);
  if (!emission) {
    return NextResponse.json({ message: "Émission introuvable" }, { status: 404 });
  }
  if (emission.statut === "decaisse") {
    return NextResponse.json(
      { message: "Cette émission est déjà décaissée" },
      { status: 409 }
    );
  }
  if (emission.statut === "renvoyee") {
    return NextResponse.json(
      { message: "Cette émission est déjà renvoyée au service achat" },
      { status: 409 }
    );
  }
  if (emission.statut === "annule") {
    return NextResponse.json(
      { message: "Cette émission est annulée" },
      { status: 409 }
    );
  }
  if ((emission.totalPaye || 0) > 0) {
    return NextResponse.json(
      { message: "Un décaissement a déjà été enregistré : renvoi impossible" },
      { status: 409 }
    );
  }

  const renvoyeLe = new Date();
  const renvoyePar = `${user.nom} ${user.prenom}`.trim();

  emission.statut = "renvoyee";
  emission.motifRenvoi = motif;
  emission.renvoyeLe = renvoyeLe;
  emission.renvoyePar = renvoyePar;
  await emission.save();

  const maj = await Achat.updateMany(
    { _id: { $in: emission.achatIds }, paiementFournisseurId: emission._id },
    {
      $set: {
        serviceComptable: false,
        chequeEdite: false,
        statutAchat: "brouillon",
        renvoyeCompta: true,
        motifRenvoi: motif,
        renvoyeLe,
        renvoyePar,
      },
      $unset: { paiementFournisseurId: 1, comptaEnvoieLe: 1, comptaEnvoiePar: 1 },
    }
  );

  return NextResponse.json({ emission, nbBons: maj.modifiedCount });
}
