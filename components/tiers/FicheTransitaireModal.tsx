"use client";

import { useEffect, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import axios from "axios";

export const VIDE_TRANSITAIRE = {
  nom: "", telephone: "", mail: "", adresse: "", observation: "",
};

type Props = {
  show: boolean;
  onHide: () => void;
  onSaved: (doc: any) => void;
};

/**
 * Fiche transitaire mutualisée (création seule), réutilisable depuis le
 * sélecteur de transitaire du bon de commande.
 */
export default function FicheTransitaireModal({ show, onHide, onSaved }: Props) {
  const [fiche, setFiche] = useState<any>(VIDE_TRANSITAIRE);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (show) {
      setFiche(VIDE_TRANSITAIRE);
      setErreur("");
    }
  }, [show]);

  const enregistrer = async () => {
    if (!fiche.nom?.trim()) {
      setErreur("Nom obligatoire");
      return;
    }
    setSaving(true);
    setErreur("");
    try {
      const r = await axios.post("/api/transitaires", fiche);
      onSaved(r.data);
      onHide();
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
    }
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Nouveau transitaire</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {erreur && <div className="alert alert-danger">{erreur}</div>}
        <Row className="g-3">
          <Col md={12}><Form.Label>Nom *</Form.Label>
            <Form.Control value={fiche.nom} onChange={(e) => setFiche({ ...fiche, nom: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Téléphone</Form.Label>
            <Form.Control value={fiche.telephone} onChange={(e) => setFiche({ ...fiche, telephone: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Email</Form.Label>
            <Form.Control type="email" value={fiche.mail} onChange={(e) => setFiche({ ...fiche, mail: e.target.value })} /></Col>
          <Col md={12}><Form.Label>Adresse</Form.Label>
            <Form.Control value={fiche.adresse} onChange={(e) => setFiche({ ...fiche, adresse: e.target.value })} /></Col>
          <Col md={12}><Form.Label>Observation</Form.Label>
            <Form.Control as="textarea" rows={2} value={fiche.observation} onChange={(e) => setFiche({ ...fiche, observation: e.target.value })} /></Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Annuler</Button>
        <Button onClick={enregistrer} disabled={saving}>
          {saving ? "Enregistrement..." : "Valider"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
