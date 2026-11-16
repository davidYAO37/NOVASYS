import { CurrentUser } from "@/lib/auth";

export const estCommercial = (user: CurrentUser) => user.type === "commercial";
export const nomUtilisateur = (user: CurrentUser) => `${user.nom} ${user.prenom}`.trim();

/** Filtre Mongo sur saisiePar (commandes, factures) */
export function filtreSaisie(user: CurrentUser): Record<string, any> {
  return estCommercial(user) ? { saisiePar: nomUtilisateur(user) } : {};
}

/** Filtre Mongo sur creerPar (clients, fournisseurs) — fiches sans créateur partagées */
export function filtreCreateur(user: CurrentUser): Record<string, any> {
  return estCommercial(user)
    ? { creerPar: { $in: [nomUtilisateur(user), null, ""] } }
    : {};
}

export const peutVoirSaisie = (
  user: CurrentUser,
  doc: { saisiePar?: string } | null | undefined
) => !estCommercial(user) || doc?.saisiePar === nomUtilisateur(user);

export const peutVoirCreateur = (
  user: CurrentUser,
  doc: { creerPar?: string } | null | undefined
) => !estCommercial(user) || !doc?.creerPar || doc.creerPar === nomUtilisateur(user);
