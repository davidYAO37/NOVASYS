import { CurrentUser } from "@/lib/auth";
import { Commande } from "@/models/commande";
import { LigneCde } from "@/models/ligneCde";
import { Achat } from "@/models/achat";

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

/** Ids des clients avec qui le commercial a déjà travaillé (un devis sur ce client) */
export async function idsClientsTravailles(user: CurrentUser): Promise<Set<string>> {
  const ids = await Commande.distinct("clientId", {
    saisiePar: nomUtilisateur(user),
    clientId: { $ne: null },
  });
  return new Set(ids.map((id) => String(id)));
}

/** Ids des fournisseurs présents dans les devis/bons du commercial */
export async function idsFournisseursTravailles(user: CurrentUser): Promise<Set<string>> {
  const commandeIds = await Commande.distinct("_id", {
    saisiePar: nomUtilisateur(user),
  });
  const [lignes, achats] = await Promise.all([
    LigneCde.distinct("fournisseurId", {
      commandeId: { $in: commandeIds },
      fournisseurId: { $ne: null },
    }),
    Achat.distinct("fournisseurId", {
      commandeId: { $in: commandeIds },
      fournisseurId: { $ne: null },
    }),
  ]);
  return new Set([...lignes, ...achats].map((id) => String(id)));
}

/** Fiche « à lui » : créée par le commercial ou déjà travaillée */
export const estMien = (
  user: CurrentUser,
  doc: { _id?: any; creerPar?: string } | null | undefined,
  ids: Set<string>
) =>
  !estCommercial(user) ||
  doc?.creerPar === nomUtilisateur(user) ||
  ids.has(String(doc?._id));

/** Consultation d'un client : créé par lui, travaillé, ou sans créateur */
export async function peutConsulterClient(
  user: CurrentUser,
  client: { _id?: any; creerPar?: string } | null | undefined
): Promise<boolean> {
  if (!estCommercial(user)) return true;
  const nom = nomUtilisateur(user);
  if (!client?.creerPar || client.creerPar === nom) return true;
  return !!(await Commande.exists({ clientId: client._id, saisiePar: nom }));
}

/** Consultation d'un fournisseur : créé par lui, dans ses devis/bons, ou sans créateur */
export async function peutConsulterFournisseur(
  user: CurrentUser,
  f: { _id?: any; creerPar?: string } | null | undefined
): Promise<boolean> {
  if (!estCommercial(user)) return true;
  const nom = nomUtilisateur(user);
  if (!f?.creerPar || f.creerPar === nom) return true;
  return (await idsFournisseursTravailles(user)).has(String(f._id));
}
