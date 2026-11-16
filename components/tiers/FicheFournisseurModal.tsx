"use client";

import { useEffect, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import axios from "axios";

export const VIDE_FOURNISSEUR = {
  nomPren: "", raisonSociale: "", rcc: "", telephone: "", portable: "",
  mail: "", adresseGeo: "", adresseP: "", observation: "", ncc: "",
};

type Props = {
  show: boolean;
  onHide: () => void;
  initial?: any | null;
  onSaved: (doc: any) => void;
};

/**
 * Fiche fournisseur mutualisée : même formulaire que la page Fournisseurs,
 * réutilisable depuis n'importe quel sélecteur de fournisseur
 * (bon de commande, émission de chèque...).
 */
export default function FicheFournisseurModal({ show, onHide, initial, onSaved }: Props) {
  const [fiche, setFiche] = useState<any>(VIDE_FOURNISSEUR);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (show) {
      setFiche(initial ? { ...VIDE_FOURNISSEUR, ...initial } : VIDE_FOURNISSEUR);
      setErreur("");
    }
  }, [show, initial]);

  const enregistrer = async () => {
    if (!fiche.nomPren?.trim()) {
      setErreur("Nom & Prénoms obligatoire");
      return;
    }
    setSaving(true);
    setErreur("");
    try {
      const r = initial?._id
        ? await axios.put(`/api/fournisseurs/${initial._id}`, fiche)
        : await axios.post("/api/fournisseurs", fiche);
      onSaved(r.data);
      onHide();
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
    }
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>{initial?._id ? "Fiche fournisseur" : "Nouveau fournisseur"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {erreur && <div className="alert alert-danger">{erreur}</div>}
        <Row className="g-3">
          <Col md={6}><Form.Label>Nom & Prénoms *</Form.Label>
            <Form.Control value={fiche.nomPren} onChange={(e) => setFiche({ ...fiche, nomPren: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Raison sociale</Form.Label>
            <Form.Control value={fiche.raisonSociale} onChange={(e) => setFiche({ ...fiche, raisonSociale: e.target.value })} /></Col>
          <Col md={6}><Form.Label>RCC</Form.Label>
            <Form.Control value={fiche.rcc} onChange={(e) => setFiche({ ...fiche, rcc: e.target.value })} /></Col>
          <Col md={6}><Form.Label>NCC</Form.Label>
            <Form.Control value={fiche.ncc} onChange={(e) => setFiche({ ...fiche, ncc: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Téléphone</Form.Label>
            <Form.Control value={fiche.telephone} onChange={(e) => setFiche({ ...fiche, telephone: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Portable</Form.Label>
            <Form.Control value={fiche.portable} onChange={(e) => setFiche({ ...fiche, portable: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Email</Form.Label>
            <Form.Control type="email" value={fiche.mail} onChange={(e) => setFiche({ ...fiche, mail: e.target.value })} /></Col>
          <Col md={6}><Form.Label>Adresse postale</Form.Label>
            <Form.Control value={fiche.adresseP} onChange={(e) => setFiche({ ...fiche, adresseP: e.target.value })} /></Col>
          <Col md={12}><Form.Label>Adresse géographique</Form.Label>
            <Form.Control value={fiche.adresseGeo} onChange={(e) => setFiche({ ...fiche, adresseGeo: e.target.value })} /></Col>
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
