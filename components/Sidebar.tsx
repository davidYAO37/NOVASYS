"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Nav } from "react-bootstrap";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  service: string;
}

/**
 * Menu latéral NOVASYS — reprend les entrées de FEN_MENU du projet WinDev :
 * ACCUEIL, CLIENT, FOURNISSEUR, GESTION DES COMMANDES (devis),
 * SERVICE ACHAT, ÉMISSION DE CHÈQUE, FACTURES/BL, CAISSE, STOCK,
 * UTILISATEURS, PARAMÈTRES.
 */
const MENU: { title?: string; items: MenuItem[] }[] = [
  {
    items: [
      { label: "Accueil", href: "/dashboard", icon: "bi-house-door", service: "accueil" },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Clients", href: "/dashboard/clients", icon: "bi-people", service: "clients" },
      { label: "Fournisseurs", href: "/dashboard/fournisseurs", icon: "bi-truck", service: "fournisseurs" },
      { label: "Gestion des commandes", href: "/dashboard/devis", icon: "bi-file-earmark-text", service: "devis" },
      { label: "Proformas en attente", href: "/dashboard/proformas-attente", icon: "bi-hourglass-split", service: "devis" },
    ],
  },
  {
    title: "Service Achat",
    items: [
      { label: "Service achat", href: "/dashboard/service-achat", icon: "bi-cart", service: "service_achat" },
      { label: "Bons de commande", href: "/dashboard/achats", icon: "bi-bag-check", service: "service_achat" },
      { label: "Émission de chèque", href: "/dashboard/emission-cheque", icon: "bi-credit-card-2-front", service: "emission_cheque" },
    ],
  },
  {
    title: "Facturation & Caisse",
    items: [
      { label: "Factures / BL", href: "/dashboard/factures", icon: "bi-receipt", service: "factures" },
      { label: "Nouvelle facture", href: "/dashboard/factures/nouvelle", icon: "bi-file-earmark-plus", service: "factures" },
      { label: "Caisse", href: "/dashboard/caisse", icon: "bi-cash-stack", service: "caisse" },
      { label: "Créances clients", href: "/dashboard/creances", icon: "bi-wallet2", service: "caisse" },
      { label: "Dettes fournisseurs", href: "/dashboard/dettes-fournisseurs", icon: "bi-credit-card", service: "caisse" },
    ],
  },
  {
    title: "Stock",
    items: [
      { label: "Articles", href: "/dashboard/stock", icon: "bi-box-seam", service: "stock" },
      { label: "Alertes stock", href: "/dashboard/stock/alertes", icon: "bi-exclamation-triangle", service: "stock" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Utilisateurs", href: "/dashboard/utilisateurs", icon: "bi-person-badge", service: "parametrage" },
      { label: "Profils", href: "/dashboard/profils", icon: "bi-shield-lock", service: "parametrage" },
      { label: "Entreprise", href: "/dashboard/parametres/entreprise", icon: "bi-building", service: "parametrage" },
      { label: "Licence", href: "/dashboard/licence", icon: "bi-key", service: "parametrage" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [services, setServices] = useState<string[] | null>(null);
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user;
        if (u) {
          setUserName(`${u.nom || ""} ${u.prenom || ""}`.trim());
          setUserType(u.type || "");
          if (u.type === "admin" || u.type === "adminsuper") {
            setServices(["*"]);
          } else {
            setServices(u.permissions?.services || []);
          }
        }
      })
      .catch(() => {});
  }, []);

  const isVisible = (service: string) =>
    services === null || services.includes("*") || services.includes(service);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      localStorage.removeItem("profil");
      localStorage.removeItem("nom_utilisateur");
      router.push("/connexion");
    }
  };

  return (
    <div className="sidebar-novasys p-3 d-flex flex-column" style={{ width: 260, flexShrink: 0 }}>
      <div className="mb-3">
        <h4 className="mb-0 fw-bold">NOVASYS</h4>
        <small className="text-white-50">Gestion commerciale</small>
      </div>

      <Nav className="flex-column flex-grow-1">
        {MENU.map((section, i) => {
          const items = section.items.filter((it) => isVisible(it.service));
          if (!items.length) return null;
          return (
            <div key={i}>
              {section.title && <div className="sidebar-title">{section.title}</div>}
              {items.map((item) => (
                <Nav.Link
                  key={item.href}
                  className={pathname === item.href ? "active" : ""}
                  onClick={() => router.push(item.href)}
                  style={{ cursor: "pointer" }}
                >
                  <i className={`bi ${item.icon} me-2`}></i>
                  {item.label}
                </Nav.Link>
              ))}
            </div>
          );
        })}
      </Nav>

      <div className="border-top border-secondary pt-3 mt-3">
        <div className="small text-white-50">{userType}</div>
        <div className="mb-2 fw-semibold">{userName || "Utilisateur"}</div>
        <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>Déconnexion
        </button>
      </div>
    </div>
  );
}
