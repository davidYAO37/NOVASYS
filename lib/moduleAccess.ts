import { IEntreprise } from "@/models/entreprise";
import { LicenceModuleCode, ALL_MODULE_CODES } from "@/lib/licenceModules";
import { getLicenceStatus } from "@/lib/licence";

/** Porté de easy_medical `lib/moduleAccess.ts` (mono-base). */
export function hasModuleAccess(
  entreprise: IEntreprise | null | undefined,
  moduleCode: LicenceModuleCode
): boolean {
  if (!entreprise) return false;
  if (getLicenceStatus(entreprise).isBlocked) return false;
  // Aucun module défini = tout autorisé (compatibilité / licence complète)
  if (!entreprise.modules || entreprise.modules.length === 0) return true;
  return entreprise.modules.includes(moduleCode);
}

export function getAccessibleModules(
  entreprise: IEntreprise | null | undefined
): LicenceModuleCode[] {
  if (!entreprise) return [];
  if (getLicenceStatus(entreprise).isBlocked) return [];
  if (!entreprise.modules || entreprise.modules.length === 0) return [...ALL_MODULE_CODES];
  return entreprise.modules.filter((m): m is LicenceModuleCode =>
    ALL_MODULE_CODES.includes(m as LicenceModuleCode)
  );
}
