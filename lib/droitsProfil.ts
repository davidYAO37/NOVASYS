import { Profil } from "@/models/profil";

/**
 * Charge les droits du profil choisi (rôle + permissions personnalisées).
 * Retourne {} si aucun profil valide — utilisé côté serveur uniquement.
 */
export async function droitsDuProfil(profilId?: string) {
  if (!profilId) return {};
  const profil = await Profil.findById(profilId).lean();
  if (!profil) return {};
  return {
    type: profil.type || "commercial",
    permissions: profil.customized
      ? { services: profil.services || [], actions: profil.actions || [], customized: true }
      : { customized: false, services: [], actions: [] },
  };
}
