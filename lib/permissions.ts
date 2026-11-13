/**
 * Système de permissions NOVASYS.
 *
 * Reprend le principe d'easy_medical :
 * - le champ `type` (rôle/profil WinDev) détermine les services accessibles
 *   par défaut ;
 * - un admin peut personnaliser, par utilisateur, les services et actions ;
 * - `admin` garde un accès complet ("*" = tout).
 *
 * Profils WinDev NOVASYS repris : Administrateur, Commercial, Service Achat,
 * Comptabilité, Caisse.
 */

export type ServiceCode =
  | "accueil"
  | "clients"
  | "fournisseurs"
  | "devis"
  | "service_achat"
  | "emission_cheque"
  | "factures"
  | "caisse"
  | "stock"
  | "parametrage";

export const ALL_SERVICE_CODES: ServiceCode[] = [
  "accueil",
  "clients",
  "fournisseurs",
  "devis",
  "service_achat",
  "emission_cheque",
  "factures",
  "caisse",
  "stock",
  "parametrage",
];

export interface StoredPermissions {
  services?: string[];
  actions?: string[];
  customized?: boolean;
}

export interface ResolvedPermissions {
  services: ServiceCode[];
  actions: string[];
  customized: boolean;
}

/** Catalogue des actions sensibles attribuables individuellement. */
export const PERMISSION_ACTIONS = [
  {
    code: "annulation_transfert",
    label: "Annuler le transfert d'une commande au service achat",
    modules: ["devis", "service_achat"],
  },
  {
    code: "annulation_encaissement",
    label: "Annuler un encaissement",
    modules: ["caisse"],
  },
  {
    code: "reduction_facture",
    label: "Appliquer des remises sur les factures",
    modules: ["factures", "caisse"],
  },
  {
    code: "suppression_documents",
    label: "Supprimer des documents (avec mot de passe)",
    modules: [],
  },
  {
    code: "export_comptable",
    label: "Exports et impressions comptables",
    modules: ["emission_cheque", "caisse"],
  },
  {
    code: "parametrage_stock",
    label: "Paramétrer le stock (articles, familles, seuils)",
    modules: ["stock"],
  },
  {
    code: "gestion_utilisateurs",
    label: "Gérer les utilisateurs et profils",
    modules: [],
  },
  {
    code: "parametrage_general",
    label: "Paramétrages divers (entreprise, impression...)",
    modules: [],
  },
] as const;

export type PermissionActionCode = (typeof PERMISSION_ACTIONS)[number]["code"];

export const ALL_ACTION_CODES: string[] = PERMISSION_ACTIONS.map((a) => a.code);

/** Services accessibles par défaut selon le profil (rôle). */
export const ROLE_SERVICES: Record<string, ServiceCode[]> = {
  admin: [...ALL_SERVICE_CODES],
  adminsuper: [...ALL_SERVICE_CODES],
  commercial: ["accueil", "clients", "fournisseurs", "devis"],
  achat: ["accueil", "fournisseurs", "devis", "service_achat", "emission_cheque", "factures"],
  comptable: ["accueil", "emission_cheque", "caisse", "factures"],
  caisse: ["accueil", "caisse", "clients", "factures"],
  stock: ["accueil", "stock"],
};

/** Actions accordées par défaut à chaque rôle (hors personnalisation). */
export const ROLE_ACTIONS: Record<string, string[]> = {
  admin: ["*"],
  adminsuper: ["*"],
  comptable: ["export_comptable"],
};

/** Libellés d'affichage des profils (valeurs stockées en base = clés). */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  adminsuper: "Super Administrateur",
  commercial: "Commercial / Technicien",
  achat: "Service Achat",
  comptable: "Comptabilité",
  caisse: "Caisse",
  stock: "Gestionnaire de stock",
};

/** Page d'accueil par service, pour la redirection après connexion. */
export const SERVICE_HOME: Record<string, string> = {
  accueil: "/dashboard",
  clients: "/dashboard/clients",
  fournisseurs: "/dashboard/fournisseurs",
  devis: "/dashboard/devis",
  service_achat: "/dashboard/service-achat",
  emission_cheque: "/dashboard/emission-cheque",
  factures: "/dashboard/factures",
  caisse: "/dashboard/caisse",
  stock: "/dashboard/stock",
  parametrage: "/dashboard/parametres",
};

/** Page d'accueil par rôle. */
export const ROLE_HOME: Record<string, string> = {
  admin: "/dashboard",
  adminsuper: "/dashboard",
  commercial: "/dashboard",
  achat: "/dashboard/service-achat",
  comptable: "/dashboard/caisse",
  caisse: "/dashboard/caisse",
  stock: "/dashboard/stock",
};

interface UserLike {
  type?: string;
  permissions?: StoredPermissions;
}

/** Résout les permissions effectives d'un utilisateur (document ou lean). */
export function getUserPermissions(user: UserLike): ResolvedPermissions {
  const type = user?.type || "commercial";
  const stored = user?.permissions;

  if (stored?.customized) {
    return {
      services: (stored.services || []) as ServiceCode[],
      actions: stored.actions || [],
      customized: true,
    };
  }

  return {
    services: ROLE_SERVICES[type] || ["accueil"],
    actions: ROLE_ACTIONS[type] || [],
    customized: false,
  };
}

/** L'utilisateur possède-t-il l'action demandée ? */
export function hasActionPermission(user: UserLike, action: string): boolean {
  const perms = getUserPermissions(user);
  return perms.actions.includes("*") || perms.actions.includes(action);
}

/**
 * Repli : un utilisateur personnalisé dont les services couvrent tous ceux
 * d'un rôle autorisé est considéré comme ayant ce rôle.
 */
export function matchesAllowedRoles(user: UserLike, allowedRoles?: string[]): boolean {
  if (!allowedRoles?.length || !user?.permissions?.customized) return false;
  const userServices = new Set(user.permissions.services || []);
  return allowedRoles.some((role) =>
    (ROLE_SERVICES[role] || []).every((s) => userServices.has(s))
  );
}
