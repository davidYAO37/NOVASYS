"use client";

import { useEffect, useState } from "react";

export interface AuthUser {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  permissions?: {
    services?: string[];
    actions?: string[];
    customized?: boolean;
  };
}

/** Récupère l'utilisateur connecté via /api/me (cookie JWT). */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setUser(data?.user || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
