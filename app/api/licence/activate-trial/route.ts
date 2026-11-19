import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";
import { DateControle } from "@/models/licence";
import { ALL_MODULE_CODES } from "@/lib/licenceModules";

const TRIAL_MAX_DAYS = 30;

/**
 * Activation / prolongation de la période d'essai — équiv. WinDev
 * Licence.essai + DATECONTROLE. Réservé à l'administrateur.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req, ["admin"], { licenceExempt: true });
  if (error) return error;
  await db();

  // L'essai n'est utilisable qu'une seule fois : impossible de le relancer
  // après expiration, et jamais sur une licence payée
  const controle = await DateControle.findOne().lean();
  if (controle?.essaiC) {
    return NextResponse.json(
      { message: "La période d'essai a déjà été utilisée. Saisissez une clé de licence." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const days = Math.min(Math.max(Number(body.days) || TRIAL_MAX_DAYS, 1), TRIAL_MAX_DAYS);

  const end = new Date();
  end.setDate(end.getDate() + days);

  const entreprise = await Entreprise.findOneAndUpdate(
    {},
    {
      licenceType: "trial",
      licenceStatus: "active",
      licenceStartDate: new Date(),
      licenceEndDate: end,
      modules: [...ALL_MODULE_CODES],
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // DATECONTROLE : mémorise la date de référence de l'essai
  await DateControle.findOneAndUpdate(
    {},
    { contDate: end, essaiC: true },
    { upsert: true }
  );

  return NextResponse.json({
    message: `Période d'essai activée (${days} jours)`,
    licenceEndDate: entreprise.licenceEndDate,
  });
}
