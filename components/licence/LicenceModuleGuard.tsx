"use client";

import { useEffect, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import { LicenceModuleCode } from "@/lib/licenceModules";

interface LicenceStatusResponse {
  effectiveStatus: string;
  isBlocked: boolean;
  modules: string[];
}

/**
 * Garde côté client : refuse l'accès à un module si la licence est
 * bloquée ou si le module n'y est pas inclus
 * (équiv. LicenceModuleGuard easy_medical).
 */
export default function LicenceModuleGuard({
  module,
  children,
  fallback,
}: {
  module: LicenceModuleCode;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [status, setStatus] = useState<LicenceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/licence/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!status || status.isBlocked) {
    return (
      fallback || (
        <Alert variant="danger" className="m-3">
          <strong>Accès bloqué</strong> — votre licence est inactive ou expirée.
          Rendez-vous sur la page <a href="/dashboard/licence">Licence</a> pour l'activer.
        </Alert>
      )
    );
  }

  const hasAccess =
    !status.modules?.length || status.modules.includes(module);

  if (!hasAccess) {
    return (
      fallback || (
        <Alert variant="warning" className="m-3">
          <strong>Module non inclus</strong> — ce module ({module}) n'est pas couvert
          par votre licence actuelle.
        </Alert>
      )
    );
  }

  return <>{children}</>;
}
