import { createHmac, timingSafeEqual } from "crypto";
import { IEntreprise } from "@/models/entreprise";

/**
 * Logique licence NOVASYS — portée du modèle easy_medical
 * (`lib/licence.ts`) en mono-base : la licence est portée par la fiche
 * Entreprise unique.
 *
 * - trial : période d'essai avec date de fin (équiv. WinDev Licence.essai
 *   + DATECONTROLE) — blocage à l'expiration.
 * - paid : licence activée par clé signée HMAC (LICENCE_SECRET), avec date
 *   de fin optionnelle.
 */

export const ALERT_THRESHOLDS_DAYS = [30, 15, 7, 1];

export type LicenceAlertLevel = "info" | "warning" | "danger";

export interface LicenceAlert {
  code: string;
  level: LicenceAlertLevel;
  message: string;
}

export interface LicenceStatusResult {
  effectiveStatus:
    | "active"
    | "trial"
    | "expired"
    | "maintenance_overdue"
    | "suspended"
    | "resiliated"
    | "none";
  isBlocked: boolean;
  daysUntilExpiration: number | null;
  daysUntilMaintenance: number | null;
  alerts: LicenceAlert[];
}

type LicenceStatusInput = {
  licenceType?: "trial" | "paid" | null;
  licenceStatus?: "active" | "suspended" | "resiliated" | null;
  licenceEndDate?: Date | string | null;
  maintenanceAccepted?: boolean | null;
  maintenanceDueDate?: Date | string | null;
  gracePeriodDays?: number | null;
  modules?: string[] | null;
};

function diffDays(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86400000);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Génère une clé de licence signée (côté éditeur).
 * Payload : { id, type, status, end, modules } + signature HMAC-SHA256.
 */
export function generateLicenceKey(entreprise: IEntreprise | LicenceStatusInput & { _id?: unknown }): string {
  const secret = process.env.LICENCE_SECRET;
  if (!secret) throw new Error("LICENCE_SECRET non configuré");

  const payload = {
    id: (entreprise as any)._id?.toString?.() || String((entreprise as any)._id || "novasys"),
    type: entreprise.licenceType,
    status: entreprise.licenceStatus,
    end: entreprise.licenceEndDate ? new Date(entreprise.licenceEndDate).toISOString() : undefined,
    maintenance: entreprise.maintenanceDueDate
      ? new Date(entreprise.maintenanceDueDate).toISOString()
      : undefined,
    modules: entreprise.modules,
  };
  const signature = createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64url");
}

/** Vérifie qu'une clé saisie correspond bien à la signature LICENCE_SECRET. */
export function verifyLicenceKey(key: string): {
  valid: boolean;
  payload?: {
    id?: string;
    type?: "trial" | "paid";
    status?: string;
    end?: string;
    maintenance?: string;
    modules?: string[];
  };
} {
  const secret = process.env.LICENCE_SECRET;
  if (!secret) return { valid: false };
  try {
    const data = JSON.parse(Buffer.from(key.trim(), "base64url").toString("utf-8"));
    if (!data.signature) return { valid: false };
    const { signature, ...payload } = data;
    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    const sigBuf = Buffer.from(String(signature), "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export function getLicenceStatus(entreprise: LicenceStatusInput | null | undefined): LicenceStatusResult {
  const now = startOfDay(new Date());
  const alerts: LicenceAlert[] = [];

  if (!entreprise || !entreprise.licenceType) {
    return {
      effectiveStatus: "none",
      isBlocked: true,
      daysUntilExpiration: null,
      daysUntilMaintenance: null,
      alerts: [
        {
          code: "NO_LICENCE",
          level: "danger",
          message: "Aucune licence active. Activez une période d'essai ou saisissez votre clé de licence.",
        },
      ],
    };
  }

  if (entreprise.licenceStatus === "resiliated") {
    return {
      effectiveStatus: "resiliated",
      isBlocked: true,
      daysUntilExpiration: null,
      daysUntilMaintenance: null,
      alerts: [
        {
          code: "LICENCE_RESILIATED",
          level: "danger",
          message: "Votre licence a été résiliée. Contactez l'éditeur du logiciel.",
        },
      ],
    };
  }

  if (entreprise.licenceStatus === "suspended") {
    return {
      effectiveStatus: "suspended",
      isBlocked: true,
      daysUntilExpiration: null,
      daysUntilMaintenance: null,
      alerts: [
        {
          code: "LICENCE_SUSPENDED",
          level: "danger",
          message: "Votre licence est suspendue. Contactez l'éditeur du logiciel.",
        },
      ],
    };
  }

  // Période d'essai : blocage à l'expiration (équiv. DATECONTROLE WinDev)
  if (entreprise.licenceType === "trial") {
    const trialEnd = entreprise.licenceEndDate ? startOfDay(new Date(entreprise.licenceEndDate)) : null;
    const daysUntilExpiration = trialEnd ? diffDays(now, trialEnd) : null;

    if (trialEnd && now > trialEnd) {
      return {
        effectiveStatus: "expired",
        isBlocked: true,
        daysUntilExpiration,
        daysUntilMaintenance: null,
        alerts: [
          {
            code: "TRIAL_EXPIRED",
            level: "danger",
            message: "Votre période d'essai a expiré. Saisissez votre clé de licence pour continuer.",
          },
        ],
      };
    }

    if (daysUntilExpiration !== null && ALERT_THRESHOLDS_DAYS.includes(daysUntilExpiration)) {
      alerts.push({
        code: "TRIAL_EXPIRING_SOON",
        level: daysUntilExpiration <= 7 ? "danger" : "warning",
        message:
          daysUntilExpiration === 1
            ? "Votre période d'essai expire demain."
            : daysUntilExpiration === 0
              ? "Votre période d'essai expire aujourd'hui."
              : `Votre période d'essai expire dans ${daysUntilExpiration} jours.`,
      });
    } else if (daysUntilExpiration !== null) {
      alerts.push({
        code: "TRIAL_ACTIVE",
        level: "info",
        message: `Période d'essai : ${daysUntilExpiration} jour(s) restant(s).`,
      });
    }

    return {
      effectiveStatus: "trial",
      isBlocked: false,
      daysUntilExpiration,
      daysUntilMaintenance: null,
      alerts,
    };
  }

  // Licence payée
  const licenceEnd = entreprise.licenceEndDate ? startOfDay(new Date(entreprise.licenceEndDate)) : null;
  const daysUntilExpiration = licenceEnd ? diffDays(now, licenceEnd) : null;

  if (licenceEnd && now > licenceEnd) {
    return {
      effectiveStatus: "expired",
      isBlocked: true,
      daysUntilExpiration,
      daysUntilMaintenance: null,
      alerts: [
        {
          code: "LICENCE_EXPIRED",
          level: "danger",
          message: "Votre licence a expiré. Contactez l'éditeur pour la renouveler.",
        },
      ],
    };
  }

  const maintenanceDue = entreprise.maintenanceDueDate
    ? startOfDay(new Date(entreprise.maintenanceDueDate))
    : null;
  const daysUntilMaintenance = maintenanceDue ? diffDays(now, maintenanceDue) : null;

  if (entreprise.maintenanceAccepted && maintenanceDue && now > maintenanceDue) {
    const graceDays = entreprise.gracePeriodDays ?? 15;
    const daysOverdue = diffDays(maintenanceDue, now);
    if (daysOverdue > graceDays) {
      return {
        effectiveStatus: "maintenance_overdue",
        isBlocked: true,
        daysUntilExpiration,
        daysUntilMaintenance,
        alerts: [
          {
            code: "MAINTENANCE_OVERDUE_BLOCKED",
            level: "danger",
            message: `Maintenance en retard de ${daysOverdue} jours. L'accès est bloqué.`,
          },
        ],
      };
    }
    alerts.push({
      code: "MAINTENANCE_OVERDUE_GRACE",
      level: "danger",
      message: `Maintenance en retard de ${daysOverdue} jours. Régularisez sous ${graceDays - daysOverdue + 1} jour(s).`,
    });
  } else if (entreprise.maintenanceAccepted && maintenanceDue && ALERT_THRESHOLDS_DAYS.includes(daysUntilMaintenance as number)) {
    alerts.push({
      code: "MAINTENANCE_DUE_SOON",
      level: (daysUntilMaintenance as number) <= 7 ? "danger" : "warning",
      message:
        daysUntilMaintenance === 1
          ? "La maintenance annuelle est due demain."
          : daysUntilMaintenance === 0
            ? "La maintenance annuelle est due aujourd'hui."
            : `La maintenance annuelle est due dans ${daysUntilMaintenance} jours.`,
    });
  } else if (daysUntilExpiration !== null && ALERT_THRESHOLDS_DAYS.includes(daysUntilExpiration)) {
    alerts.push({
      code: "LICENCE_EXPIRING_SOON",
      level: daysUntilExpiration <= 7 ? "danger" : "warning",
      message:
        daysUntilExpiration === 1
          ? "Votre licence expire demain."
          : daysUntilExpiration === 0
            ? "Votre licence expire aujourd'hui."
            : `Votre licence expire dans ${daysUntilExpiration} jours.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      code: "LICENCE_ACTIVE",
      level: "info",
      message: licenceEnd
        ? `Licence active jusqu'au ${licenceEnd.toLocaleDateString("fr-FR")}.`
        : "Licence perpétuelle active.",
    });
  }

  return {
    effectiveStatus: "active",
    isBlocked: false,
    daysUntilExpiration,
    daysUntilMaintenance,
    alerts,
  };
}
