import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { Entreprise } from "@/models/entreprise";
import { User } from "@/models/users.model";
import { getLicenceStatus } from "@/lib/licence";
import { getAccessibleModules } from "@/lib/moduleAccess";

/**
 * État de la licence de l'entreprise — accessible même bloquée
 * (l'UI en a besoin pour afficher la page d'activation).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req, undefined, { licenceExempt: true });
  if (error) return error;

  try {
    await db();
    const entreprise = await Entreprise.findOne().lean();
    const status = getLicenceStatus(entreprise as any);
    const userCount = await User.countDocuments();

    return NextResponse.json({
      ...status,
      licenceType: entreprise?.licenceType || null,
      licenceStatus: entreprise?.licenceStatus || null,
      licenceStartDate: entreprise?.licenceStartDate || null,
      licenceEndDate: entreprise?.licenceEndDate || null,
      licenceActivatedAt: entreprise?.licenceActivatedAt || null,
      maintenanceAccepted: !!entreprise?.maintenanceAccepted,
      maintenanceDueDate: entreprise?.maintenanceDueDate || null,
      gracePeriodDays: entreprise?.gracePeriodDays ?? 15,
      modules: getAccessibleModules(entreprise as any),
      licensedModules: entreprise?.modules || [],
      userCount,
    });
  } catch (err) {
    console.error("Erreur statut licence:", err);
    return NextResponse.json({ error: "Erreur récupération statut licence" }, { status: 500 });
  }
}
