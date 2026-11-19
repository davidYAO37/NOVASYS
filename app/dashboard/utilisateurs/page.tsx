"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import { ALL_ACTION_CODES, ALL_SERVICE_CODES, PERMISSION_ACTIONS, ROLE_LABELS } from "@/lib/permissions";

const VIDE = {
  nom: "", prenom: "", email: "", password: "", type: "commercial", codeProforma: "",
};

const SERVICE_LABELS: Record<string, string> = {
  accueil: "Accueil",
  clients: "Clients",
  fournisseurs: "Fournisseurs",
  devis: "Gestion des commandes",
  service_achat: "Service achat",
  emission_cheque: "Émission de chèque",
  factures: "Factures / BL",
  caisse: "Caisse",
  stock: "Stock",
  parametrage: "Paramétrage",
};

/**
 * UTILISATEURS (FEN_UTILISATEUR + FEN_Table_Login + FEN_Fiche_Login) :
 * création, modification, blocage/déblocage et permissions personnalisées.
 */
export default function UtilisateursPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [profils, setProfils] = useState<any[]>([]);
  const [showFiche, setShowFiche] = useState(false);
  const [fiche, setFiche] = useState<any>(VIDE);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPerms, setShowPerms] = useState(false);
  const [permUser, setPermUser] = useState<any>(null);
  const [perms, setPerms] = useState<{ services: string[]; actions: string[]; customized: boolean }>({
    services: [], actions: [], customized: false,
  });
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/utilisateurs").then((r) => setUsers(r.data)).catch((e) => {
      setMessage(e.response?.data?.message || "Accès refusé");
    });
    axios.get("/api/profils").then((r) => setProfils(r.data)).catch(() => {});
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirFiche = (u?: any) => {
    setEditId(u?._id || null);
    setFiche(u ? { nom: u.nom || "", prenom: u.prenom || "", email: u.email, password: "", type: u.type || "commercial", codeProforma: u.codeProforma || "", profilId: u.profilId || "" } : VIDE);
    setShowFiche(true);
  };

  const enregistrer = async () => {
    setMessage("");
    try {
      if (editId) {
        const payload: any = { nom: fiche.nom, prenom: fiche.prenom, type: fiche.type, codeProforma: fiche.codeProforma, profilId: fiche.profilId || "" };
        if (fiche.password) payload.password = fiche.password;
        await axios.put(`/api/utilisateurs/${editId}`, payload);
      } else {
        await axios.post("/api/utilisateurs", fiche);
      }
      setShowFiche(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur d'enregistrement");
    }
  };

  const basculerBlocage = async (u: any) => {
    try {
      await axios.put(`/api/utilisateurs/${u._id}`, u.comptebloque ? { comptebloque: false, debloquer: true } : { comptebloque: true });
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Action impossible");
    }
  };

  const ouvrirPerms = (u: any) => {
    setPermUser(u);
    setPerms({
      services: u.permissions?.services || [],
      actions: u.permissions?.actions || [],
      customized: !!u.permissions?.customized,
    });
    setShowPerms(true);
  };

  const basculerListe = (liste: string[], valeur: string) =>
    liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur];

  const enregistrerPerms = async () => {
    try {
      await axios.put(`/api/utilisateurs/${permUser._id}`, { permissions: perms });
      setShowPerms(false);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Erreur");
    }
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    try {
      await axios.delete(`/api/utilisateurs/${id}`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Utilisateurs</h3>
        <Button onClick={() => ouvrirFiche()}>
          <i className="bi bi-person-plus me-1"></i>Nouvel utilisateur
        </Button>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Nom & Prénoms</th><th>Identifiant</th><th>Profil</th>
              <th>Statut</th><th>Permissions</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="fw-semibold">{u.nom} {u.prenom}</td>
                <td>{u.email}</td>
                <td><Badge bg="info">{ROLE_LABELS[u.type] || u.type}</Badge></td>
                <td>
                  {u.comptebloque
                    ? <Badge bg="danger">Bloqué</Badge>
                    : u.isLocked
                      ? <Badge bg="warning" text="dark">Verrouillé</Badge>
                      : <Badge bg="success">Actif</Badge>}
                </td>
                <td>{u.permissions?.customized ? <Badge bg="secondary">Personnalisées</Badge> : "Par défaut"}</td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-secondary" className="me-1" title="Modifier" onClick={() => ouvrirFiche(u)}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button size="sm" variant="outline-info" className="me-1" title="Permissions" onClick={() => ouvrirPerms(u)}>
                    <i className="bi bi-shield-lock"></i>
                  </Button>
                  <Button size="sm" variant={u.comptebloque ? "outline-success" : "outline-warning"} className="me-1"
                    title={u.comptebloque ? "Débloquer" : "Bloquer"} onClick={() => basculerBlocage(u)}>
                    <i className={`bi ${u.comptebloque ? "bi-unlock" : "bi-lock"}`}></i>
                  </Button>
                  <Button size="sm" variant="outline-danger" title="Supprimer" onClick={() => supprimer(u._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={6} className="text-center text-muted py-4">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Fiche utilisateur */}
      <Modal show={showFiche} onHide={() => setShowFiche(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}><Form.Label>Nom *</Form.Label>
              <Form.Control value={fiche.nom} onChange={(e) => setFiche({ ...fiche, nom: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Prénoms</Form.Label>
              <Form.Control value={fiche.prenom} onChange={(e) => setFiche({ ...fiche, prenom: e.target.value })} /></Col>
            <Col md={12}><Form.Label>Identifiant (email) *</Form.Label>
              <Form.Control type="email" value={fiche.email} disabled={!!editId}
                onChange={(e) => setFiche({ ...fiche, email: e.target.value })} /></Col>
            <Col md={6}><Form.Label>{editId ? "Nouveau mot de passe (vide = inchangé)" : "Mot de passe *"}</Form.Label>
              <Form.Control type="password" value={fiche.password}
                onChange={(e) => setFiche({ ...fiche, password: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Rôle</Form.Label>
              <Form.Select value={fiche.type} disabled={!!fiche.profilId}
                onChange={(e) => setFiche({ ...fiche, type: e.target.value })}>
                {Object.entries(ROLE_LABELS).filter(([k]) => k !== "adminsuper").map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Form.Select>
              {fiche.profilId && (
                <Form.Text className="text-muted">Rôle défini par le profil choisi.</Form.Text>
              )}</Col>
            <Col md={6}><Form.Label>Profil (droits prédéfinis)</Form.Label>
              <Form.Select value={fiche.profilId || ""}
                onChange={(e) => setFiche({ ...fiche, profilId: e.target.value })}>
                <option value="">— Aucun (rôle choisi manuellement) —</option>
                {profils.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.profil} — {ROLE_LABELS[p.type] || p.type}
                  </option>
                ))}
              </Form.Select>
              {fiche.profilId && (
                <Form.Text className="text-muted">
                  Le profil impose son rôle et ses permissions à cet utilisateur.
                </Form.Text>
              )}</Col>
            <Col md={6}><Form.Label>Code proforma (ex. TECH, COM, COMPT)</Form.Label>
              <Form.Control value={fiche.codeProforma}
                onChange={(e) => setFiche({ ...fiche, codeProforma: e.target.value.toUpperCase() })} /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFiche(false)}>Annuler</Button>
          <Button onClick={enregistrer}>Valider</Button>
        </Modal.Footer>
      </Modal>

      {/* Permissions personnalisées */}
      <Modal show={showPerms} onHide={() => setShowPerms(false)} size="lg" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Permissions — {permUser?.nom} {permUser?.prenom}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Check
            type="switch"
            label="Permissions personnalisées (sinon celles du profil)"
            checked={perms.customized}
            onChange={(e) => setPerms({ ...perms, customized: e.target.checked })}
            className="mb-3"
          />
          {perms.customized && (
            <Row>
              <Col md={6}>
                <h6>Services accessibles</h6>
                {ALL_SERVICE_CODES.map((s) => (
                  <Form.Check key={s} type="checkbox" label={SERVICE_LABELS[s] || s}
                    checked={perms.services.includes(s)}
                    onChange={() => setPerms({ ...perms, services: basculerListe(perms.services, s) })} />
                ))}
              </Col>
              <Col md={6}>
                <h6>Actions sensibles</h6>
                {PERMISSION_ACTIONS.map((a) => (
                  <Form.Check key={a.code} type="checkbox" label={a.label}
                    checked={perms.actions.includes(a.code)}
                    onChange={() => setPerms({ ...perms, actions: basculerListe(perms.actions, a.code) })} />
                ))}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPerms(false)}>Annuler</Button>
          <Button onClick={enregistrerPerms}>Enregistrer</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
