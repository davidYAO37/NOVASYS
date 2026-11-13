"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, SERVICE_HOME, matchesAllowedRoles } from "@/lib/permissions";

interface RoleGuardProps {
  /** Types d'utilisateur autorisés pour cette section (en plus de "admin"/"adminsuper", toujours autorisés). */
  allowedRoles: string[];
  /** Actions dont au moins une doit être possédée pour accéder à la section. */
  allowedActions?: string[];
  children: React.ReactNode;
}

/**
 * Vérifie que l'utilisateur connecté a le bon rôle pour accéder à cette
 * section de l'application. `Verifconnecion` vérifie uniquement
 * l'authentification, pas le rôle.
 */
export default function RoleGuard({ allowedRoles, allowedActions, children }: RoleGuardProps) {
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const type = data?.user?.type;
        const userServices: string[] = data?.user?.permissions?.services || [];
        const userActions: string[] = data?.user?.permissions?.actions || [];
        const hasAllowedAction =
          !!allowedActions?.length &&
          (userActions.includes("*") ||
            allowedActions.some((a) => userActions.includes(a)));
        const allowed =
          !!type &&
          (type === "adminsuper" ||
            type === "admin" ||
            allowedRoles.includes(type) ||
            matchesAllowedRoles(
              { type, permissions: { services: userServices, customized: true } },
              allowedRoles
            ) ||
            hasAllowedAction);
        if (allowed) {
          setStatus("allowed");
        } else {
          setStatus("denied");
          const home =
            (type && ROLE_HOME[type]) ||
            (userServices.length > 0 && SERVICE_HOME[userServices[0]]) ||
            "/connexion";
          setTimeout(() => {
            if (!cancelled) router.replace(home);
          }, 1200);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return <div className="text-center p-5">Chargement...</div>;
  }

  if (status === "denied") {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <div className="alert alert-danger text-center">
          <strong>Accès non autorisé</strong>
          <div>Vous n&apos;avez pas le rôle requis pour accéder à cette section. Redirection...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
