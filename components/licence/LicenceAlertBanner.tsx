"use client";

import { useEffect, useState } from "react";
import { Alert, Button } from "react-bootstrap";
import Link from "next/link";

interface LicenceStatus {
  effectiveStatus: string;
  isBlocked: boolean;
  daysUntilExpiration: number | null;
  alerts: { code: string; level: string; message: string }[];
}

/**
 * Bannière d'alerte licence affichée en haut du dashboard
 * (équiv. components/licence/LicenceAlertBanner.tsx easy_medical).
 * Affiche l'alerte la plus grave ; masquée si la licence est pleinement
 * active sans échéance proche.
 */
export default function LicenceAlertBanner() {
  const [status, setStatus] = useState<LicenceStatus | null>(null);
  const [masque, setMasque] = useState(false);

  useEffect(() => {
    fetch("/api/licence/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status || masque) return null;
  const alert = status.alerts.find((a) => a.level === "danger") || status.alerts.find((a) => a.level === "warning");
  if (!alert) return null;

  return (
    <Alert
      variant={alert.level === "danger" ? "danger" : "warning"}
      className="d-flex justify-content-between align-items-center mb-3"
      dismissible
      onClose={() => setMasque(true)}
    >
      <div>
        <i className="bi bi-exclamation-triangle me-2"></i>
        {alert.message}
        {status.isBlocked && (
          <strong className="ms-2">L'accès aux données est bloqué.</strong>
        )}
      </div>
      <Button
        as={Link as any}
        href="/dashboard/licence"
        variant={alert.level === "danger" ? "danger" : "warning"}
        size="sm"
      >
        Gérer ma licence
      </Button>
    </Alert>
  );
}
