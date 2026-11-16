"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Nav, Offcanvas } from "react-bootstrap";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  service: string;
}

interface Notifs {
  proformasAttente: number;
  serviceAchat: number;
  bonsCommande: number;
  emissionCheque: number;
  commandesRenvoyees: number;
  bonsRenvoyes: number;
  licence: { niveau: string; texte: string } | null;
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
  const [showMenu, setShowMenu] = useState(false);
  const [notifs, setNotifs] = useState<Notifs | null>(null);

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

  // L'offcanvas se ferme automatiquement après navigation
  useEffect(() => { setShowMenu(false); }, [pathname]);

  // Badges de notification, rechargés à chaque changement de page
  useEffect(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setNotifs(data))
      .catch(() => {});
  }, [pathname]);

  const isVisible = (service: string) =>
    services === null || services.includes("*") || services.includes(service);

  // Lien actif = href le plus long préfixe du pathname
  const hrefActif = useMemo(() => {
    let meilleur: string | null = null;
    for (const section of MENU) {
      for (const item of section.items) {
        const exact = item.href === "/dashboard"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        if (exact && (meilleur === null || item.href.length > meilleur.length)) {
          meilleur = item.href;
        }
      }
    }
    return meilleur;
  }, [pathname]);

  // Badge de notification associé à une entrée de menu
  const badgePour = (href: string): { bg: string; text?: string; texte: string; title: string } | null => {
    if (!notifs) return null;
    switch (href) {
      case "/dashboard/proformas-attente":
        return notifs.proformasAttente > 0
          ? { bg: "warning", text: "dark", texte: String(notifs.proformasAttente), title: `${notifs.proformasAttente} proformas en attente` }
          : null;
      case "/dashboard/service-achat":
        return notifs.serviceAchat > 0
          ? { bg: "primary", texte: String(notifs.serviceAchat), title: `${notifs.serviceAchat} commandes en cours au service achat` }
          : null;
      case "/dashboard/devis":
        return notifs.commandesRenvoyees > 0
          ? { bg: "danger", texte: String(notifs.commandesRenvoyees), title: `${notifs.commandesRenvoyees} commande(s) renvoyée(s) par le service achat` }
          : null;
      case "/dashboard/achats":
        return notifs.bonsCommande > 0
          ? {
              bg: notifs.bonsRenvoyes > 0 ? "danger" : "info",
              text: notifs.bonsRenvoyes > 0 ? undefined : "dark",
              texte: String(notifs.bonsCommande),
              title: notifs.bonsRenvoyes > 0
                ? `${notifs.bonsCommande} bons de commande non transférés (dont ${notifs.bonsRenvoyes} renvoyés par la comptabilité)`
                : `${notifs.bonsCommande} bons de commande non transférés`,
            }
          : null;
      case "/dashboard/emission-cheque":
        return notifs.emissionCheque > 0
          ? { bg: "danger", texte: String(notifs.emissionCheque), title: `${notifs.emissionCheque} chèques à émettre` }
          : null;
      case "/dashboard/licence":
        return notifs.licence
          ? { bg: notifs.licence.niveau, texte: notifs.licence.texte, title: "État de la licence" }
          : null;
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      localStorage.removeItem("profil");
      localStorage.removeItem("nom_utilisateur");
      router.push("/connexion");
    }
  };

  const contenu = (
    <>
      <div className="mb-3">
        <div className="sidebar-logo-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/novasys-logo.jpg" alt="NOVASYS" />
        </div>
        <small className="d-block mt-2" style={{ color: "var(--novasys-grey)" }}>
          Gestion commerciale
        </small>
      </div>

      <Nav className="flex-column flex-grow-1">
        {MENU.map((section, i) => {
          const items = section.items.filter((it) => isVisible(it.service));
          if (!items.length) return null;
          return (
            <div key={i}>
              {section.title && <div className="sidebar-title">{section.title}</div>}
              {items.map((item) => {
                const badge = badgePour(item.href);
                return (
                  <Nav.Link
                    key={item.href}
                    as={Link}
                    href={item.href}
                    className={`d-flex align-items-center${hrefActif === item.href ? " active" : ""}`}
                  >
                    <i className={`bi ${item.icon} me-2`}></i>
                    {item.label}
                    {badge && (
                      <Badge pill bg={badge.bg} text={badge.text as any} className="ms-auto" title={badge.title}>
                        {badge.texte}
                      </Badge>
                    )}
                  </Nav.Link>
                );
              })}
            </div>
          );
        })}
      </Nav>

      <div className="border-top border-secondary pt-3 mt-3">
        <div className="small" style={{ color: "var(--novasys-grey)" }}>{userType}</div>
        <div className="mb-2 fw-semibold text-white">{userName || "Utilisateur"}</div>
        <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Barre supérieure — petit écran (< lg) */}
      <div className="topbar-novasys d-lg-none sticky-top d-flex align-items-center gap-2 px-2 py-2">
        <button
          className="btn btn-outline-light btn-sm"
          aria-label="Ouvrir le menu"
          onClick={() => setShowMenu(true)}
        >
          <i className="bi bi-list fs-5"></i>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/novasys-logo.jpg" alt="NOVASYS" style={{ height: 30, background: "#fff", borderRadius: 6, padding: "2px 6px" }} />
        <span className="ms-auto small text-truncate">{userName}</span>
      </div>

      {/* Menu offcanvas — petit écran */}
      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="start" className="sidebar-novasys">
        <Offcanvas.Body className="d-flex flex-column p-3">
          {contenu}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Menu fixe — grand écran (≥ lg) */}
      <aside
        className="sidebar-novasys p-3 d-none d-lg-flex flex-column flex-shrink-0 sticky-top"
        style={{ width: 260, height: "100vh", overflowY: "auto" }}
      >
        {contenu}
      </aside>
    </>
  );
}
