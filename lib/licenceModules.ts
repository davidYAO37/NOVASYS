/**
 * Modules activables par licence — codes alignés sur les services
 * de `lib/permissions.ts` (équivalent de lib/licenceModules.ts easy_medical).
 */
export const LICENCE_MODULES = [
  { code: "accueil", label: "Accueil / Tableau de bord", servicePath: "/dashboard" },
  { code: "clients", label: "Clients", servicePath: "/dashboard/clients" },
  { code: "fournisseurs", label: "Fournisseurs", servicePath: "/dashboard/fournisseurs" },
  { code: "devis", label: "Gestion des commandes / devis", servicePath: "/dashboard/devis" },
  { code: "service_achat", label: "Service achat / bons de commande", servicePath: "/dashboard/service-achat" },
  { code: "emission_cheque", label: "Émission de chèques", servicePath: "/dashboard/emission-cheque" },
  { code: "factures", label: "Factures / bons de livraison", servicePath: "/dashboard/factures" },
  { code: "caisse", label: "Caisse / règlements", servicePath: "/dashboard/caisse" },
  { code: "stock", label: "Stock / articles", servicePath: "/dashboard/stock" },
  { code: "parametrage", label: "Paramétrage (entreprise, utilisateurs)", servicePath: "/dashboard/parametres" },
] as const;

export type LicenceModuleCode = (typeof LICENCE_MODULES)[number]["code"];

export const ALL_MODULE_CODES: LicenceModuleCode[] = LICENCE_MODULES.map((m) => m.code);
