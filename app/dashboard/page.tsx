"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Spinner } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { fmtMontant } from "@/lib/format";

/**
 * Écran d'accueil (ACCUEIL de FEN_MENU) : bilan du commercial —
 * commandes enregistrées / traitées / en cours / non traitées par le
 * service achat + indicateurs financiers.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUserName(`${d?.user?.nom || ""} ${d?.user?.prenom || ""}`.trim()))
      .catch(() => {});
    fetch("/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const cartes = [
    { label: "Commandes enregistrées", valeur: stats.commandes.enregistrees, icon: "bi-file-earmark-plus", color: "#b3201f", lien: "/dashboard/devis" },
    { label: "Commandes en cours de traitement", valeur: stats.commandes.enCours, icon: "bi-hourglass-split", color: "#b9770e", lien: "/dashboard/devis?statut=en_cours" },
    { label: "Commandes traitées", valeur: stats.commandes.traitees, icon: "bi-check2-circle", color: "#198754", lien: "/dashboard/devis?statut=traitee" },
    { label: "Commandes non transférées", valeur: stats.commandes.nonTraitees, icon: "bi-send", color: "#36393f", lien: "/dashboard/proformas-attente" },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h3 className="mb-0 titre-page">Accueil</h3>
          <small className="text-muted">Bienvenue {userName} — bilan de vos commandes</small>
        </div>
      </div>

      <Row className="g-3 mb-4">
        {cartes.map((c) => (
          <Col xs={12} sm={6} xl={3} key={c.label}>
            <Card className="card-stat shadow-sm h-100" style={{ cursor: "pointer" }} onClick={() => router.push(c.lien)}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <div className="fs-3 fw-bold" style={{ color: c.color }}>{c.valeur}</div>
                    <div className="text-muted small">{c.label}</div>
                  </div>
                  <i className={`bi ${c.icon} fs-1`} style={{ color: c.color, opacity: 0.4 }}></i>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h5 className="mb-3">Indicateurs</h5>
      <Row className="g-3">
        <Col md={6} lg={3}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="text-muted small">Chiffre d&apos;affaires facturé</div>
              <div className="fs-4 fw-bold text-success">{fmtMontant(stats.caFacture)} FCFA</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard/creances")}>
            <Card.Body>
              <div className="text-muted small">Créances clients</div>
              <div className="fs-4 fw-bold text-warning">{fmtMontant(stats.creancesClients)} FCFA</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm" style={{ cursor: "pointer" }} onClick={() => router.push("/dashboard/dettes-fournisseurs")}>
            <Card.Body>
              <div className="text-muted small">Dettes fournisseurs</div>
              <div className="fs-4 fw-bold text-danger">{fmtMontant(stats.dettesFournisseurs)} FCFA</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={3}>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="text-muted small">Clients / Fournisseurs</div>
              <div className="fs-4 fw-bold">{stats.nbClients} / {stats.nbFournisseurs}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {stats.alertesStock > 0 && (
        <div className="alert alert-warning mt-4 d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>{stats.alertesStock} article(s)</strong> en dessous du seuil d&apos;alerte.{" "}
            <a href="/dashboard/stock/alertes" className="alert-link">Voir les alertes stock</a>
          </div>
        </div>
      )}
    </div>
  );
}
