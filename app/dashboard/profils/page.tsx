"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import {
  ALL_SERVICE_CODES,
  PERMISSION_ACTIONS,
  ROLE_ACTIONS,
  ROLE_LABELS,
  ROLE_SERVICES,
} from "@/lib/permissions";

const SERVICE_LABELS: Record<string, string> = {
  accueil: "Accueil",
  clients: "Clients",
  fournisseurs: "Fournisseurs",
  devis: "Gestion des devis",
  service_achat: "Service achat",
  emission_cheque: "Émission de chèque",
  factures: "Factures / BL",
  caisse: "Caisse",
  stock: "Stock",
  parametrage: "Paramétrage",
};

/** Ce que fait chaque profil dans le circuit documentaire. */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin:
    "Accès complet à tous les services, actions et paramétrages. Il crée les utilisateurs et leurs permissions personnalisées, traite les demandes d'annulation de règlements, supprime les documents et gère la licence.",
  adminsuper:
    "Compte éditeur : même accès que l'administrateur, plus la génération des clés de licence.",
  commercial:
    "Saisit ses devis/proformas, consulte les clients et fournisseurs de tous mais ne voit que ses propres devis, ses statistiques et les factures/BL de ses clients. Il transfère ses devis au service achat et peut les reprendre tant qu'ils ne sont pas traités. Il peut créer un article à la volée.",
  achat:
    "Reçoit les devis transférés, édite les bons de commande fournisseurs (transitaire, transport, douane, autres montants), clôture les commandes traitées et peut renvoyer un devis non traité au commercial. Il crée les émissions de chèque et suit les bons renvoyés par la comptabilité.",
  comptable:
    "Reçoit les émissions de chèque du service achat, les décaisse auprès des fournisseurs, renvoie les émissions incomplètes, suit la caisse et les encaissements clients. Il demande l'annulation de ses règlements à l'administrateur.",
  caisse:
    "Encaisse les règlements clients sur facture, tient la caisse et décaisse les émissions de chèque. Il demande l'annulation de ses règlements à l'administrateur.",
  stock:
    "Gère le catalogue articles, les familles, les entrées et sorties de stock et les alertes de seuil. Il peut créer un article à la volée.",
};

/** Ordre d'affichage de la fiche des rôles. */
const ROLE_ORDER = [
  "admin",
  "adminsuper",
  "commercial",
  "achat",
  "comptable",
  "caisse",
  "stock",
];

const libelleAction = (code: string) =>
  PERMISSION_ACTIONS.find((a) => a.code === code)?.label || code;

/** FEN_Table_Profil + FEN_Fiche_Profil : gestion des profils utilisateurs. */
const FICHE_VIDE = {
  profil: "", type: "commercial", customized: false,
  services: [] as string[], actions: [] as string[],
};

const basculerListe = (liste: string[], code: string) =>
  liste.includes(code) ? liste.filter((x) => x !== code) : [...liste, code];

export default function ProfilsPage() {
  const [profils, setProfils] = useState<any[]>([]);
  const [showFiche, setShowFiche] = useState(false);
  const [fiche, setFiche] = useState<any>(FICHE_VIDE);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/profils").then((r) => setProfils(r.data)).catch(() => {});
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (p?: any) => {
    setEditId(p?._id || null);
    setFiche(
      p
        ? {
            profil: p.profil,
            type: p.type || "commercial",
            customized: !!p.customized,
            services: p.services || [],
            actions: p.actions || [],
          }
        : FICHE_VIDE
    );
    setShowFiche(true);
  };

  const enregistrer = async () => {
    setMessage("");
    try {
      if (editId) await axios.put(`/api/profils/${editId}`, fiche);
      else await axios.post("/api/profils", fiche);
      setShowFiche(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer ce profil ?")) return;
    try {
      await axios.delete(`/api/profils/${id}`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Profils utilisateurs</h3>
        <Button onClick={() => ouvrirFiche()}>
          <i className="bi bi-plus-lg me-1"></i>Nouveau profil
        </Button>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Card className="shadow-sm" style={{ maxWidth: 720 }}>
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Profil</th><th>Rôle</th><th>Permissions</th><th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profils.map((p) => (
              <tr key={p._id}>
                <td className="fw-semibold">{p.profil}</td>
                <td><Badge bg="info">{ROLE_LABELS[p.type] || p.type || "—"}</Badge></td>
                <td>
                  {p.customized ? (
                    <Badge bg="warning" text="dark">Personnalisées</Badge>
                  ) : (
                    <span className="text-muted">Celles du rôle</span>
                  )}
                </td>
                <td>
                  <Button size="sm" variant="outline-secondary" className="me-1"
                    onClick={() => ouvrirFiche(p)}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => supprimer(p._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!profils.length && (
              <tr><td colSpan={4} className="text-center text-muted py-4">Aucun profil</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <h4 className="mt-4 mb-3">Fiche des rôles</h4>
      <p className="text-muted">
        Chaque utilisateur reçoit un profil qui détermine les services (menus) et les
        actions sensibles auxquels il accède par défaut. L'administrateur peut ensuite
        personnaliser ces droits par utilisateur dans <em>Utilisateurs → Permissions</em>.
      </p>
      <div className="d-flex flex-column gap-3">
        {ROLE_ORDER.map((role) => {
          const services = ROLE_SERVICES[role] || [];
          const actions = ROLE_ACTIONS[role] || [];
          const toutAcces = actions.includes("*");
          return (
            <Card key={role} className="shadow-sm">
              <Card.Body>
                <h5 className="mb-2">{ROLE_LABELS[role] || role}</h5>
                <p className="mb-3">{ROLE_DESCRIPTIONS[role]}</p>
                <Row className="g-2">
                  <Col md={6}>
                    <div className="fw-semibold mb-1">Services accessibles</div>
                    <div className="d-flex flex-wrap gap-1">
                      {services.map((s) => (
                        <Badge key={s} bg="secondary" className="fw-normal">
                          {SERVICE_LABELS[s] || s}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="fw-semibold mb-1">Actions sensibles</div>
                    <div className="d-flex flex-wrap gap-1">
                      {toutAcces ? (
                        <Badge bg="danger" className="fw-normal">Toutes les actions</Badge>
                      ) : actions.length ? (
                        actions.map((a) => (
                          <Badge key={a} bg="warning" text="dark" className="fw-normal">
                            {libelleAction(a)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted">Aucune</span>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      <Modal show={showFiche} onHide={() => setShowFiche(false)} size="lg" fullscreen="md-down">
        <Modal.Header closeButton><Modal.Title>Fiche profil</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Nom du profil *</Form.Label>
              <Form.Control
                value={fiche.profil}
                onChange={(e) => setFiche({ ...fiche, profil: e.target.value })}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Rôle *</Form.Label>
              <Form.Select
                value={fiche.type}
                onChange={(e) => setFiche({ ...fiche, type: e.target.value })}
              >
                {Object.entries(ROLE_LABELS)
                  .filter(([k]) => k !== "adminsuper")
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
              </Form.Select>
              {ROLE_DESCRIPTIONS[fiche.type] && (
                <Form.Text className="text-muted">{ROLE_DESCRIPTIONS[fiche.type]}</Form.Text>
              )}
            </Col>
            <Col md={12}>
              <Form.Check
                type="switch"
                label="Permissions personnalisées (sinon celles du rôle)"
                checked={fiche.customized}
                onChange={(e) => setFiche({ ...fiche, customized: e.target.checked })}
              />
            </Col>
            {fiche.customized && (
              <>
                <Col md={6}>
                  <h6>Services accessibles</h6>
                  {ALL_SERVICE_CODES.map((s) => (
                    <Form.Check
                      key={s}
                      type="checkbox"
                      label={SERVICE_LABELS[s] || s}
                      checked={fiche.services.includes(s)}
                      onChange={() =>
                        setFiche({ ...fiche, services: basculerListe(fiche.services, s) })
                      }
                    />
                  ))}
                </Col>
                <Col md={6}>
                  <h6>Actions sensibles</h6>
                  {PERMISSION_ACTIONS.map((a) => (
                    <Form.Check
                      key={a.code}
                      type="checkbox"
                      label={a.label}
                      checked={fiche.actions.includes(a.code)}
                      onChange={() =>
                        setFiche({ ...fiche, actions: basculerListe(fiche.actions, a.code) })
                      }
                    />
                  ))}
                </Col>
              </>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFiche(false)}>Annuler</Button>
          <Button onClick={enregistrer}>Valider</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
